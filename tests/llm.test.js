// LLM client failure handling. All HTTP is mocked: no quota is used.
process.env.LOG_LEVEL = 'silent';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLLMClient } from '../services/llm.services.js';

const KEY_A = 'test-key-AAAA';
const KEY_B = 'test-key-BBBB';

const okBody = (text = '```mermaid\ngraph TD\n A-->B\n```') => JSON.stringify({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'thinking...', thought: true }, { text }] } }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5, totalTokenCount: 125 },
});

const reply = (status, body, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    text: async () => body,
});

// fetch mock that plays a script of responses and records the key used for each call.
const scripted = (responses) => {
    const calls = [];
    const fetchImpl = async (url, init) => {
        calls.push({ url, key: init.headers['x-goog-api-key'], body: JSON.parse(init.body) });
        const next = responses.shift();
        if (!next) throw new Error('unexpected extra call');
        if (next instanceof Error) throw next;
        return next;
    };
    return { fetchImpl, calls };
};

const client = (fetchImpl, extra = {}) => {
    const sleeps = [];
    const c = createLLMClient({
        apiKeys: [KEY_A], model: 'test-model', fetchImpl, maxRetries: 3, minIntervalMs: 0, timeoutMs: 1000,
        sleep: async (ms) => { sleeps.push(ms); }, ...extra,
    });
    return { c, sleeps };
};

test('parses text and token usage, drops thought parts, sends system prompt', async () => {
    const { fetchImpl, calls } = scripted([reply(200, okBody('hello'))]);
    const { c } = client(fetchImpl);
    const out = await c.generateText({ system: 'SYS', user: 'draw' });
    assert.equal(out.text, 'hello');
    assert.deepEqual(out.usage, { promptTokens: 100, outputTokens: 20, thoughtTokens: 5, totalTokens: 125 });
    assert.equal(out.attempts, 1);
    assert.equal(calls[0].body.systemInstruction.parts[0].text, 'SYS');
    assert.match(calls[0].url, /models\/test-model:generateContent$/);
});

test('retries on 429 and succeeds, rotating to the other key', async () => {
    const { fetchImpl, calls } = scripted([
        reply(429, '{"error":{"status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"3s"}]}}'),
        reply(200, okBody()),
    ]);
    const { c } = client(fetchImpl, { apiKeys: [KEY_A, KEY_B] });
    const out = await c.generateText({ user: 'x' });
    assert.equal(out.attempts, 2);
    assert.equal(calls[0].key, KEY_A);
    assert.equal(calls[1].key, KEY_B, 'second attempt should use the key that is not rate limited');
});

test('retries on 5xx with backoff and succeeds', async () => {
    const { fetchImpl } = scripted([reply(503, 'unavailable'), reply(500, 'boom'), reply(200, okBody())]);
    const { c, sleeps } = client(fetchImpl);
    const out = await c.generateText({ user: 'x' });
    assert.equal(out.attempts, 3);
    assert.deepEqual(sleeps, [1000, 2000]);
});

test('does not retry a 400 and maps it to LLM_BAD_REQUEST', async () => {
    const { fetchImpl, calls } = scripted([reply(400, 'bad request')]);
    const { c } = client(fetchImpl);
    await assert.rejects(c.generateText({ user: 'x' }), (err) => err.code === 'LLM_BAD_REQUEST' && err.statusCode === 400);
    assert.equal(calls.length, 1);
});

test('gives up after max retries on 5xx with a 502', async () => {
    const { fetchImpl, calls } = scripted([reply(500, 'a'), reply(500, 'b'), reply(500, 'c'), reply(500, 'd')]);
    const { c } = client(fetchImpl);
    await assert.rejects(c.generateText({ user: 'x' }), (err) => err.code === 'LLM_UPSTREAM' && err.statusCode === 502);
    assert.equal(calls.length, 4); // 1 + 3 retries
});

test('timeouts are retried and finally reported as 504 LLM_TIMEOUT', async () => {
    const timeout = () => Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const { fetchImpl, calls } = scripted([timeout(), timeout(), timeout(), timeout()]);
    const { c } = client(fetchImpl);
    await assert.rejects(c.generateText({ user: 'x' }), (err) => err.code === 'LLM_TIMEOUT' && err.statusCode === 504);
    assert.equal(calls.length, 4);
});

test('network error then success', async () => {
    const { fetchImpl } = scripted([new TypeError('fetch failed'), reply(200, okBody())]);
    const { c } = client(fetchImpl);
    const out = await c.generateText({ user: 'x' });
    assert.equal(out.attempts, 2);
});

test('429 on every attempt ends as LLM_QUOTA_EXHAUSTED (status 429)', async () => {
    const q = () => reply(429, '{"error":{"status":"RESOURCE_EXHAUSTED"}}');
    const { fetchImpl } = scripted([q(), q(), q(), q()]);
    const { c } = client(fetchImpl);
    await assert.rejects(c.generateText({ user: 'x' }), (err) => err.code === 'LLM_QUOTA_EXHAUSTED' && err.statusCode === 429);
});

test('daily quota parks the key; with every key parked it stops without more calls', async () => {
    const daily = () => reply(429, '{"error":{"message":"Quota exceeded for metric generate_requests_per_day"}}');
    const { fetchImpl, calls } = scripted([daily(), daily()]);
    const { c } = client(fetchImpl, { apiKeys: [KEY_A, KEY_B] });
    await assert.rejects(c.generateText({ user: 'x' }), (err) => err.code === 'LLM_QUOTA_EXHAUSTED');
    assert.equal(calls.length, 2, 'one call per key, then stop');
});

test('API keys never appear in error messages', async () => {
    const { fetchImpl } = scripted([reply(400, `invalid key ${KEY_A}`)]);
    const { c } = client(fetchImpl);
    await assert.rejects(c.generateText({ user: 'x' }), (err) => !err.message.includes(KEY_A) && err.message.includes('[REDACTED]'));
});

test('empty model reply is a 502 LLM_EMPTY', async () => {
    const body = JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'x', thought: true }] } }] });
    const { fetchImpl } = scripted([reply(200, body)]);
    const { c } = client(fetchImpl);
    await assert.rejects(c.generateText({ user: 'x' }), (err) => err.code === 'LLM_EMPTY' && /MAX_TOKENS/.test(err.message));
});

test('missing API key fails fast with LLM_NOT_CONFIGURED', async () => {
    const { c } = client(async () => { throw new Error('should not be called'); }, { apiKeys: [] });
    await assert.rejects(c.generateText({ user: 'x' }), (err) => err.code === 'LLM_NOT_CONFIGURED');
});

test('pacing waits between two calls on the same key', async () => {
    let t = 0;
    const { fetchImpl } = scripted([reply(200, okBody()), reply(200, okBody())]);
    const sleeps = [];
    const c = createLLMClient({
        apiKeys: [KEY_A], model: 'm', fetchImpl, maxRetries: 0, minIntervalMs: 4000, timeoutMs: 1000,
        now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; },
    });
    await c.generateText({ user: 'a' });
    await c.generateText({ user: 'b' });
    assert.deepEqual(sleeps, [4000]);
});

test('data URL images are sent inline', async () => {
    const { fetchImpl, calls } = scripted([reply(200, okBody())]);
    const { c } = client(fetchImpl);
    await c.generateText({ user: 'x', image: 'data:image/png;base64,iVBORw0KGgo=' });
    assert.deepEqual(calls[0].body.contents[0].parts[0], { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } });
});
