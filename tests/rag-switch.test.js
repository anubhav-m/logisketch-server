// RAG on/off switch and retrieval fallback. LLM is mocked: no quota is used.
process.env.LOG_LEVEL = 'silent';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEnginePrompt } from '../config/env.js';
import { createDiagramService } from '../services/diagram.services.js';

const fakeLLM = () => {
    const calls = [];
    return {
        calls,
        generateText: async (input) => {
            calls.push(input);
            return { text: '```mermaid\ngraph TD\n A-->B\n```', usage: { promptTokens: 1, outputTokens: 1, thoughtTokens: 0, totalTokens: 2 }, latencyMs: 5, model: 'fake' };
        },
    };
};

const fakeRetriever = (chunks) => {
    const calls = [];
    return {
        calls,
        retrieve: (query, engine, k) => {
            calls.push({ query, engine, k });
            return chunks.slice(0, k);
        },
    };
};

const CHUNKS = [
    { id: 'mermaid#1', engine: 'mermaid', title: 'Mermaid: ER diagram', text: 'CHUNK-ONE', score: 0.9 },
    { id: 'mermaid#2', engine: 'mermaid', title: 'Mermaid: Flowchart', text: 'CHUNK-TWO', score: 0.5 },
    { id: 'mermaid#3', engine: 'mermaid', title: 'Mermaid: State', text: 'CHUNK-THREE', score: 0.1 },
];

test('RAG on: retrieved chunks are added to the system prompt', async () => {
    const llm = fakeLLM();
    const retriever = fakeRetriever(CHUNKS);
    const svc = createDiagramService({ llm, retriever, ragEnabled: true, topK: 2 });
    const out = await svc.generateDiagramCode({ text: 'er diagram', engine: 'mermaid' });

    assert.deepEqual(retriever.calls, [{ query: 'er diagram', engine: 'mermaid', k: 2 }]);
    const system = llm.calls[0].system;
    assert.ok(system.startsWith(getEnginePrompt('mermaid')));
    assert.match(system, /SYNTAX REFERENCE/);
    assert.match(system, /CHUNK-ONE/);
    assert.match(system, /CHUNK-TWO/);
    assert.doesNotMatch(system, /CHUNK-THREE/);
    assert.equal(out.rag.used, true);
    assert.deepEqual(out.rag.chunks.map((c) => c.id), ['mermaid#1', 'mermaid#2']);
    assert.equal(out.code, 'graph TD\n A-->B');
});

test('RAG off: retriever is not called and the prompt is the plain engine prompt', async () => {
    const llm = fakeLLM();
    const retriever = fakeRetriever(CHUNKS);
    const svc = createDiagramService({ llm, retriever, ragEnabled: false });
    const out = await svc.generateDiagramCode({ text: 'er diagram', engine: 'mermaid' });

    assert.equal(retriever.calls.length, 0);
    assert.equal(llm.calls[0].system, getEnginePrompt('mermaid'));
    assert.equal(out.rag.enabled, false);
    assert.equal(out.rag.used, false);
});

test('per-call override beats the default setting', async () => {
    const llm = fakeLLM();
    const retriever = fakeRetriever(CHUNKS);
    const svc = createDiagramService({ llm, retriever, ragEnabled: false, topK: 3 });
    await svc.generateDiagramCode({ text: 'x', engine: 'mermaid' }, { ragEnabled: true });
    assert.match(llm.calls[0].system, /CHUNK-THREE/);
    await svc.generateDiagramCode({ text: 'x', engine: 'mermaid' }, { ragEnabled: false });
    assert.equal(llm.calls[1].system, getEnginePrompt('mermaid'));
});

test('retrieval failure is logged and generation continues without RAG', async () => {
    const llm = fakeLLM();
    const retriever = { retrieve: () => { throw new Error('index corrupted'); } };
    const svc = createDiagramService({ llm, retriever, ragEnabled: true });
    const out = await svc.generateDiagramCode({ text: 'x', engine: 'mermaid' });

    assert.equal(llm.calls[0].system, getEnginePrompt('mermaid'));
    assert.equal(out.rag.used, false);
    assert.equal(out.rag.error, 'index corrupted');
    assert.equal(out.code, 'graph TD\n A-->B');
});

test('LLM failure propagates with its status code (no silent success)', async () => {
    const llm = { generateText: async () => { throw Object.assign(new Error('LLM quota exhausted'), { statusCode: 429, code: 'LLM_QUOTA_EXHAUSTED' }); } };
    const svc = createDiagramService({ llm, retriever: fakeRetriever(CHUNKS), ragEnabled: true });
    await assert.rejects(svc.generateDiagramCode({ text: 'x', engine: 'mermaid' }), (err) => err.statusCode === 429);
});

test('unknown engine is a 400 before any LLM call', async () => {
    const llm = fakeLLM();
    const svc = createDiagramService({ llm, retriever: fakeRetriever(CHUNKS) });
    await assert.rejects(svc.generateDiagramCode({ text: 'x', engine: 'nope' }), (err) => err.statusCode === 400);
    assert.equal(llm.calls.length, 0);
});

test('reply without code is a 502', async () => {
    const llm = { generateText: async () => ({ text: '   ', usage: {}, latencyMs: 1, model: 'fake' }) };
    const svc = createDiagramService({ llm, retriever: fakeRetriever([]), ragEnabled: false });
    await assert.rejects(svc.generateDiagramCode({ text: 'x', engine: 'mermaid' }), (err) => err.statusCode === 502);
});
