// The single LLM client of the app. Everything that talks to the model goes through
// `generateText`. To change provider later, only this file (and LLM_CONFIG) changes:
// keep the same input ({ system, user, image }) and output ({ text, usage, ... }).
import { LLM_CONFIG } from '../config/env.js';
import { logger } from '../utilities/logger.utilities.js';

const RETRYABLE_STATUS = (status) => status === 429 || status >= 500;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeError = (message, statusCode, code, extra = {}) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    Object.assign(error, extra);
    return error;
};

// Gemini returns hints like { "@type": ".../RetryInfo", "retryDelay": "12s" }.
const parseRetryDelayMs = (bodyText, headers) => {
    const retryAfter = headers?.get?.('retry-after');
    if (retryAfter && !Number.isNaN(Number(retryAfter))) return Number(retryAfter) * 1000;
    const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(bodyText || '');
    return match ? Math.ceil(Number(match[1]) * 1000) : null;
};

// Daily / project quota (not just per-minute) — retrying soon will not help.
const isHardQuota = (bodyText) => /per ?day|PerDay|daily|billing|exceeded your current quota/i.test(bodyText || '');

// Never let an API key appear in logs or error messages.
const redact = (text, keys) => {
    let out = String(text ?? '');
    for (const k of keys) if (k) out = out.split(k).join('[REDACTED]');
    return out.slice(0, 500);
};

const parseDataUrl = (url) => {
    const m = /^data:([^;,]+);base64,(.+)$/s.exec(url);
    return m ? { mimeType: m[1], data: m[2] } : null;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const loadImagePart = async (image, fetchImpl, timeoutMs) => {
    const inline = parseDataUrl(image);
    if (inline) return { inlineData: inline };

    if (!/^https?:\/\//i.test(image)) {
        throw makeError('prompt.image must be a data URL or an http(s) URL', 400, 'BAD_IMAGE');
    }

    let response;
    try {
        response = await fetchImpl(image, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
        throw makeError(`Could not download prompt.image: ${err.message}`, 400, 'BAD_IMAGE');
    }
    if (!response.ok) throw makeError(`Could not download prompt.image (HTTP ${response.status})`, 400, 'BAD_IMAGE');
    const mimeType = (response.headers.get('content-type') || 'image/png').split(';')[0];
    if (!mimeType.startsWith('image/')) throw makeError('prompt.image URL is not an image', 400, 'BAD_IMAGE');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) throw makeError('prompt.image is larger than 5 MB', 413, 'BAD_IMAGE');
    return { inlineData: { mimeType, data: buffer.toString('base64') } };
};

export const createLLMClient = (options = {}) => {
    const cfg = { ...LLM_CONFIG, ...options };
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const sleep = options.sleep || defaultSleep;
    const now = options.now || Date.now;
    const keys = cfg.apiKeys || [];

    // Pacing state: next time each key may be used. Key choice = the key free soonest.
    const nextFreeAt = keys.map(() => 0);
    // Keys that hit a daily quota are parked until the given time.
    const parkedUntil = keys.map(() => 0);

    const acquireKey = async () => {
        const t = now();
        const candidates = keys.map((_, i) => i).filter((i) => parkedUntil[i] <= t);
        if (candidates.length === 0) return -1;
        const idx = candidates.reduce((best, i) => (nextFreeAt[i] < nextFreeAt[best] ? i : best), candidates[0]);
        const wait = Math.max(0, nextFreeAt[idx] - t);
        nextFreeAt[idx] = Math.max(t, nextFreeAt[idx]) + cfg.minIntervalMs;
        if (wait > 0) await sleep(wait);
        return idx;
    };

    const generateText = async ({ system, user, image } = {}) => {
        if (keys.length === 0) {
            throw makeError('LLM is not configured: set GEMINI_API_KEY in .env', 500, 'LLM_NOT_CONFIGURED');
        }
        if (!user || typeof user !== 'string') {
            throw makeError('LLM input text is required', 400, 'BAD_INPUT');
        }

        const parts = [];
        if (image) parts.push(await loadImagePart(image, fetchImpl, cfg.timeoutMs));
        parts.push({ text: user });

        const body = {
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature: cfg.temperature, maxOutputTokens: cfg.maxOutputTokens },
        };
        if (system) body.systemInstruction = { parts: [{ text: system }] };

        const url = `${cfg.baseUrl}/models/${encodeURIComponent(cfg.model)}:generateContent`;
        let requestMs = 0; // time spent in HTTP calls only (no pacing / backoff sleeps)
        let lastError;

        for (let attempt = 1; attempt <= cfg.maxRetries + 1; attempt++) {
            const keyIdx = await acquireKey();
            if (keyIdx === -1) {
                throw makeError('LLM quota exhausted on all configured keys', 429, 'LLM_QUOTA_EXHAUSTED', { attempts: attempt - 1 });
            }

            const started = now();
            let response;
            let bodyText = '';
            try {
                response = await fetchImpl(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[keyIdx] },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(cfg.timeoutMs),
                });
                bodyText = await response.text();
            } catch (err) {
                const ms = now() - started;
                requestMs += ms;
                const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
                lastError = timedOut
                    ? makeError(`LLM request timed out after ${cfg.timeoutMs} ms`, 504, 'LLM_TIMEOUT')
                    : makeError(`LLM network error: ${redact(err?.message, keys)}`, 502, 'LLM_NETWORK');
                logger.warn('llm.attempt_failed', { model: cfg.model, attempt, key: keyIdx + 1, error: lastError.code, latencyMs: ms });
                if (attempt <= cfg.maxRetries) await sleep(Math.min(1000 * 2 ** (attempt - 1), 15000));
                continue;
            }

            const ms = now() - started;
            requestMs += ms;

            if (!response.ok) {
                const status = response.status;
                const safeBody = redact(bodyText, keys);
                logger.warn('llm.attempt_failed', { model: cfg.model, attempt, key: keyIdx + 1, status, latencyMs: ms });

                if (status === 429) {
                    const delay = parseRetryDelayMs(bodyText, response.headers);
                    if (isHardQuota(bodyText) && !delay) {
                        parkedUntil[keyIdx] = now() + 60 * 60 * 1000; // park this key for 1h
                    } else {
                        nextFreeAt[keyIdx] = Math.max(nextFreeAt[keyIdx], now() + (delay ?? 2000 * 2 ** (attempt - 1)));
                    }
                    lastError = makeError(`LLM rate limited (429): ${safeBody}`, 429, 'LLM_RATE_LIMITED');
                    continue; // acquireKey() waits / picks another key
                }

                lastError = makeError(`LLM Error ${status}: ${safeBody}`, status >= 500 ? 502 : status, status >= 500 ? 'LLM_UPSTREAM' : 'LLM_BAD_REQUEST');
                if (RETRYABLE_STATUS(status) && attempt <= cfg.maxRetries) {
                    await sleep(Math.min(1000 * 2 ** (attempt - 1), 15000));
                    continue;
                }
                throw lastError;
            }

            let data;
            try {
                data = JSON.parse(bodyText);
            } catch {
                throw makeError('LLM returned invalid JSON', 502, 'LLM_BAD_RESPONSE');
            }

            const candidate = data?.candidates?.[0];
            // Thinking models return "thought" parts; only keep the answer text.
            const text = (candidate?.content?.parts || [])
                .filter((p) => typeof p.text === 'string' && !p.thought)
                .map((p) => p.text)
                .join('');

            const u = data?.usageMetadata || {};
            const usage = {
                promptTokens: u.promptTokenCount ?? 0,
                outputTokens: u.candidatesTokenCount ?? 0,
                thoughtTokens: u.thoughtsTokenCount ?? 0,
                totalTokens: u.totalTokenCount ?? 0,
            };

            logger.info('llm.call', {
                provider: cfg.provider, model: cfg.model, attempt, key: keyIdx + 1,
                latencyMs: ms, requestMs, finishReason: candidate?.finishReason, ...usage,
            });

            if (!text) {
                throw makeError(`No response from LLM (finishReason: ${candidate?.finishReason || data?.promptFeedback?.blockReason || 'unknown'})`, 502, 'LLM_EMPTY', { usage });
            }

            return { text, usage, latencyMs: requestMs, attempts: attempt, model: cfg.model, finishReason: candidate?.finishReason };
        }

        // Out of retries. A 429 at this point means the quota is gone for now.
        if (lastError?.code === 'LLM_RATE_LIMITED') lastError.code = 'LLM_QUOTA_EXHAUSTED';
        throw lastError;
    };

    return { generateText, model: cfg.model, provider: cfg.provider };
};

// Default app-wide client (shared pacing state).
export const llmClient = createLLMClient();
