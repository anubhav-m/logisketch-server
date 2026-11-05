process.env.LOG_LEVEL = 'silent';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { normalize, elementCoverage, isRenderSuccess, percentile, summarize, mean } from '../eval/scoring.js';
import { extractCode } from '../utilities/extractCode.utilites.js';

test('normalize ignores case, spaces and punctuation', () => {
    assert.equal(normalize('Order_Item'), 'orderitem');
    assert.equal(normalize('ORDER-ITEM'), normalize('order item'));
});

test('coverage counts matched and missing elements', () => {
    const code = 'erDiagram\n CUSTOMER ||--o{ ORDER_ITEM : has\n PRODUCT {}';
    const r = elementCoverage(code, ['customer', 'order item', 'product', 'payment']);
    assert.deepEqual(r.matched, ['customer', 'order item', 'product']);
    assert.deepEqual(r.missing, ['payment']);
    assert.equal(r.coverage, 0.75);
});

test('alternatives: any one option counts, reported under the first name', () => {
    const r = elementCoverage('seqdiag { user -> authorization_server; }', [['auth server', 'authorization server']]);
    assert.equal(r.coverage, 1);
    assert.deepEqual(r.matched, ['auth server']);
});

test('empty or missing code scores 0', () => {
    assert.equal(elementCoverage('', ['a', 'b']).coverage, 0);
    assert.equal(elementCoverage(null, ['a']).coverage, 0);
});

test('render success requires an svg document', () => {
    assert.equal(isRenderSuccess('<?xml version="1.0"?><svg xmlns="x"></svg>'), true);
    assert.equal(isRenderSuccess('Error 400: syntax error'), false);
    assert.equal(isRenderSuccess(null), false);
});

test('percentile uses nearest rank', () => {
    const xs = Array.from({ length: 20 }, (_, i) => i + 1); // 1..20
    assert.equal(percentile(xs, 95), 19);
    assert.equal(percentile(xs, 50), 10);
    assert.equal(percentile([7], 95), 7);
    assert.equal(percentile([], 95), null);
    assert.equal(mean([1, 2, 3]), 2);
});

test('summarize counts failed LLM calls as failures and excludes them from latency', () => {
    const records = [
        { llmOk: true, renderSuccess: true, coverage: 1, latencyMs: 100, usage: { promptTokens: 10, outputTokens: 5, thoughtTokens: 0, totalTokens: 15 } },
        { llmOk: true, renderSuccess: false, coverage: 0.5, latencyMs: 300, usage: { promptTokens: 10, outputTokens: 5, thoughtTokens: 1, totalTokens: 16 } },
        { llmOk: false, renderSuccess: false, coverage: 0, latencyMs: null, usage: null },
    ];
    const s = summarize(records);
    assert.equal(s.tests, 3);
    assert.equal(s.llmCallFailures, 1);
    assert.equal(s.renderSuccess, 1);
    assert.equal(s.renderSuccessRate, 0.333);
    assert.equal(s.avgElementCoverage, 0.5);
    assert.equal(s.latencyAvgMs, 200);
    assert.equal(s.latencyP95Ms, 300);
    assert.equal(s.tokens.total, 31);
    assert.equal(s.tokens.thought, 1);
});

test('extractCode takes the first fenced block, else the trimmed reply', () => {
    assert.equal(extractCode('text\n```d2\na -> b\n```\nmore'), 'a -> b');
    assert.equal(extractCode('  a -> b  '), 'a -> b');
    assert.equal(extractCode(''), undefined);
});

test('test set is well formed (30 prompts, 5 categories, unique ids)', () => {
    const { tests } = JSON.parse(fs.readFileSync(new URL('../eval/testset.json', import.meta.url), 'utf-8'));
    assert.equal(tests.length, 30);
    assert.equal(new Set(tests.map((t) => t.id)).size, 30);
    assert.deepEqual([...new Set(tests.map((t) => t.category))].sort(), ['architecture', 'er', 'flowchart', 'sequence', 'uml']);
    for (const t of tests) assert.ok(t.prompt && t.engine && t.requiredElements.length > 0, t.id);
});
