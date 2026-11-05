// npm run smoke — one real end-to-end request through the HTTP API:
// Express (CORS, JSON parser, Arcjet, validation) -> RAG -> Gemini -> Kroki -> JSON response.
// Starts the real `app` on a random port. It does not connect to MongoDB because
// /api/generate-image does not use the database (auth routes do).
// Uses 1 LLM call.
import fs from 'fs';
import path from 'path';
import { app } from '../app.js';
import { ROOT_DIR, LLM_CONFIG, RAG_CONFIG } from '../config/env.js';

const body = {
    prompt: { text: process.argv[2] || 'ER diagram for a library: book, author, member and loan. A member has many loans, each loan is for one book.' },
    engine: process.argv[3] || 'mermaid',
};

const server = app.listen(0, async () => {
    const url = `http://127.0.0.1:${server.address().port}/api/generate-image`;
    const started = Date.now();
    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        const ms = Date.now() - started;
        console.log(`POST /api/generate-image -> HTTP ${res.status} in ${ms} ms (model ${LLM_CONFIG.model}, RAG ${RAG_CONFIG.enabled ? 'on' : 'off'})`);
        if (json.success === true) {
            console.log('--- code ---');
            console.log(json.code);
            console.log(`--- svg: ${json.svg.length} bytes, starts with <svg: ${/<svg[\s>]/.test(json.svg)} ---`);
            const out = path.join(ROOT_DIR, 'reports', 'smoke');
            fs.mkdirSync(out, { recursive: true });
            fs.writeFileSync(path.join(out, 'smoke.svg'), json.svg);
            fs.writeFileSync(path.join(out, 'smoke.json'), JSON.stringify({ at: new Date().toISOString(), status: res.status, ms, model: LLM_CONFIG.model, rag: RAG_CONFIG.enabled, request: body, code: json.code, svgBytes: json.svg.length }, null, 2));
            console.log('Saved reports/smoke/smoke.svg and smoke.json');
        } else {
            console.log(json);
            process.exitCode = 1;
        }
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    } finally {
        server.close();
    }
});
