import { isValidEngine, KROKI_CONFIG } from '../config/env.js';

export const callKroki = async (code, engine, { fetchImpl = globalThis.fetch, timeoutMs = KROKI_CONFIG.timeoutMs } = {}) => {

    if (!isValidEngine(engine)) {
        const error = new Error(`Engine ${engine} not found in ENGINES`);
        error.statusCode = 400;
        throw error;
    }

    if (!code || typeof code !== 'string') {
        const error = new Error('No diagram code to render');
        error.statusCode = 422;
        throw error;
    }

    let response;
    try {
        response = await fetchImpl(`${KROKI_CONFIG.url.replace(/\/$/, '')}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            body: JSON.stringify({
                diagram_source: code,
                diagram_type: engine,
                output_format: 'svg',
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (err) {
        const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
        const error = new Error(timedOut ? `Kroki timed out after ${timeoutMs} ms` : `Kroki network error: ${err.message}`);
        error.statusCode = timedOut ? 504 : 502;
        throw error;
    }

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Kroki Error #${response.status}: ${errorText}`);
        error.statusCode = response.status;
        throw error;
    }

    const svg = await response.text();

    if (!svg) {
        const error = new Error('Kroki returned empty svg code');
        error.statusCode = 502; //Bad Gateway
        throw error;
    }

    return svg;
};
