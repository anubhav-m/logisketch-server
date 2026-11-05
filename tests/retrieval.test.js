process.env.LOG_LEVEL = 'silent';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { RAG_CONFIG, ENGINE_NAMES } from '../config/env.js';
import { chunkMarkdown, ingest, hashDocs, buildIndex } from '../services/rag/ingest.js';
import { createRetriever } from '../services/rag/retriever.js';
import { embed, cosine, buildIdf } from '../services/rag/embedder.js';

const index = buildIndex(RAG_CONFIG.docsDir);
const retriever = createRetriever({ index });

test('every engine has syntax docs', () => {
    const engines = new Set(index.chunks.map((c) => c.engine));
    for (const e of ENGINE_NAMES) assert.ok(engines.has(e), `missing docs for ${e}`);
});

test('chunkMarkdown makes one chunk per ## section with engine-prefixed titles', () => {
    const chunks = chunkMarkdown('demo', '# Demo\n\nintro\n\n## One\ntext one\n\n## Two\ntext two\n');
    assert.deepEqual(chunks.map((c) => c.title), ['Demo: One', 'Demo: Two']);
    assert.deepEqual(chunks.map((c) => c.id), ['demo#1', 'demo#2']);
});

test('retrieval only returns chunks of the selected engine', () => {
    for (const engine of ENGINE_NAMES) {
        const hits = retriever.retrieve('sequence diagram with database and class inheritance', engine, 3);
        assert.ok(hits.length > 0 && hits.length <= 3);
        assert.ok(hits.every((h) => h.engine === engine), `leak from another engine for ${engine}`);
    }
});

test('relevant section ranks first', () => {
    assert.equal(retriever.retrieve('class diagram with inheritance and interfaces', 'plantuml')[0].title, 'PlantUML: Class diagram');
    assert.equal(retriever.retrieve('ER diagram with primary key and foreign key cardinality', 'mermaid')[0].title, 'Mermaid: ER diagram');
    assert.equal(retriever.retrieve('database schema tables with sql columns', 'd2')[0].title, 'D2: ER diagrams with sql_table');
});

test('top-k is respected and results are sorted by score', () => {
    const hits = retriever.retrieve('flowchart decision', 'graphviz', 2);
    assert.equal(hits.length, 2);
    assert.ok(hits[0].score >= hits[1].score);
});

test('unknown engine returns no chunks', () => {
    assert.deepEqual(retriever.retrieve('anything', 'not-an-engine'), []);
});

test('embeddings are normalised and deterministic', () => {
    const idf = buildIdf(['a b c', 'b c d']);
    const v1 = embed('primary key foreign key', idf);
    const v2 = embed('primary key foreign key', idf);
    assert.deepEqual(v1, v2);
    assert.ok(Math.abs(cosine(v1, v1) - 1) < 1e-4);
});

test('ingestion is idempotent', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-'));
    const docs = path.join(tmp, 'docs');
    fs.mkdirSync(docs);
    fs.writeFileSync(path.join(docs, 'mermaid.md'), '# Mermaid\n\n## A\nflowchart TD\n');
    const out = path.join(tmp, 'index.json');

    const first = ingest(docs, out);
    const content1 = fs.readFileSync(out, 'utf-8');
    const second = ingest(docs, out);
    assert.equal(first.written, true);
    assert.equal(second.written, false);
    assert.equal(fs.readFileSync(out, 'utf-8'), content1);

    fs.appendFileSync(path.join(docs, 'mermaid.md'), '\n## B\nsequenceDiagram\n');
    assert.equal(ingest(docs, out).written, true, 'changed docs must rebuild');
    fs.rmSync(tmp, { recursive: true, force: true });
});

test('committed index is up to date with the docs (run npm run ingest if this fails)', () => {
    const committed = JSON.parse(fs.readFileSync(RAG_CONFIG.indexPath, 'utf-8'));
    assert.equal(committed.docsHash, hashDocs(RAG_CONFIG.docsDir));
});
