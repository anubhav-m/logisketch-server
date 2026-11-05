// npm run eval            run (or resume) RAG off then RAG on, then write the reports
// npm run eval -- --dry-run   only print the estimated number of calls
// npm run eval -- --report    only rebuild the reports from saved results
// npm run eval -- --fresh     archive the saved results and start over
//
// Every result is appended to results.jsonl right after the prompt finishes, so an
// interrupted run continues where it stopped. Nothing is cached: each prompt makes a new
// LLM call and a new Kroki render.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ROOT_DIR, LLM_CONFIG, RAG_CONFIG } from '../config/env.js';
import { createDiagramService } from '../services/diagram.services.js';
import { callKroki } from '../services/kroki.services.js';
import { elementCoverage, isRenderSuccess, summarize, groupBy, hashTestset } from '../eval/scoring.js';

process.env.LOG_LEVEL ||= 'warn'; // keep per-call logs out of the progress output
const args = new Set(process.argv.slice(2));
const MODES = [
    { name: 'rag_off', ragEnabled: false },
    { name: 'rag_on', ragEnabled: true },
];

const testset = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'eval', 'testset.json'), 'utf-8'));
const testsetHash = hashTestset(testset);
const model = LLM_CONFIG.model;
const outDir = path.join(ROOT_DIR, 'reports', 'evaluation');
const runDir = path.join(outDir, 'runs', `${model.replace(/[^a-zA-Z0-9.-]/g, '_')}__${testsetHash.slice(0, 8)}`);
const resultsPath = path.join(runDir, 'results.jsonl');
const metaPath = path.join(runDir, 'meta.json');

const git = (cmd) => { try { return execSync(`git ${cmd}`, { cwd: ROOT_DIR, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
const gitInfo = () => ({ commit: git('rev-parse HEAD'), branch: git('rev-parse --abbrev-ref HEAD'), dirty: Boolean(git('status --porcelain')) });

const loadResults = () => {
    if (!fs.existsSync(resultsPath)) return [];
    return fs.readFileSync(resultsPath, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
};

const keyOf = (mode, id) => `${mode}:${id}`;

// Kroki is only retried on network/5xx problems; a 4xx means the code is invalid.
const render = async (code, engine) => {
    for (let attempt = 1; ; attempt++) {
        try {
            const svg = await callKroki(code, engine);
            return { svg, error: null };
        } catch (err) {
            const transient = !err.statusCode || err.statusCode >= 500;
            if (transient && attempt < 3) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
            return { svg: null, error: err.message.slice(0, 400) };
        }
    }
};

const pct = (x) => (x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
const ms = (x) => (x === null ? 'n/a' : `${x} ms`);
const delta = (a, b, fmt) => (a === null || b === null ? 'n/a' : fmt(b - a));

const writeReports = (meta) => {
    const all = loadResults();
    const byMode = Object.fromEntries(MODES.map((m) => [m.name, all.filter((r) => r.mode === m.name)]));
    const complete = MODES.every((m) => byMode[m.name].length === testset.tests.length);

    const modes = Object.fromEntries(MODES.map((m) => [m.name, {
        overall: summarize(byMode[m.name]),
        perEngine: groupBy(byMode[m.name], 'engine'),
        perCategory: groupBy(byMode[m.name], 'category'),
    }]));

    const off = modes.rag_off.overall;
    const on = modes.rag_on.overall;
    const comparison = {
        renderSuccessRate: { rag_off: off.renderSuccessRate, rag_on: on.renderSuccessRate, delta: off.renderSuccessRate === null || on.renderSuccessRate === null ? null : Number((on.renderSuccessRate - off.renderSuccessRate).toFixed(3)) },
        avgElementCoverage: { rag_off: off.avgElementCoverage, rag_on: on.avgElementCoverage, delta: off.avgElementCoverage === null || on.avgElementCoverage === null ? null : Number((on.avgElementCoverage - off.avgElementCoverage).toFixed(3)) },
        latencyAvgMs: { rag_off: off.latencyAvgMs, rag_on: on.latencyAvgMs },
        latencyP95Ms: { rag_off: off.latencyP95Ms, rag_on: on.latencyP95Ms },
        totalTokens: { rag_off: off.tokens.total, rag_on: on.tokens.total },
        avgPromptTokensPerCall: { rag_off: off.tokens.avgPromptPerCall, rag_on: on.tokens.avgPromptPerCall },
    };

    const report = {
        generatedAt: new Date().toISOString(),
        complete,
        model,
        provider: LLM_CONFIG.provider,
        temperature: LLM_CONFIG.temperature,
        ragTopK: RAG_CONFIG.topK,
        testset: { name: testset.name, version: testset.version, tests: testset.tests.length, sha256: testsetHash },
        git: meta.git,
        startedAt: meta.startedAt,
        reportGit: gitInfo(),
        scoring: {
            renderSuccess: 'Kroki returned 2xx with an <svg> document',
            elementCoverage: 'share of requiredElements found in the generated code (case/punctuation-insensitive substring match)',
            latency: 'LLM HTTP time (all attempts, excluding pacing and backoff waits) + retrieval time, successful calls only',
            failures: 'failed LLM calls count as renderSuccess=false and coverage=0',
            cache: 'no response cache exists in the app; every test makes a new LLM call and Kroki render',
        },
        comparison,
        modes,
        results: all.map(({ code, ...r }) => ({ ...r, codeChars: code ? code.length : 0 })),
    };

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

    const lines = [];
    lines.push('# Evaluation report: RAG off vs RAG on', '');
    lines.push(`- Model: \`${model}\` (${LLM_CONFIG.provider}, temperature ${LLM_CONFIG.temperature})`);
    lines.push(`- Run started: ${meta.startedAt}; report generated: ${report.generatedAt}`);
    lines.push(`- Git commit at run start: \`${meta.git.commit}\` (${meta.git.branch}${meta.git.dirty ? ', uncommitted changes' : ''})`);
    lines.push(`- Test set: ${testset.tests.length} prompts, sha256 \`${testsetHash.slice(0, 16)}\``);
    lines.push(`- RAG top-k: ${RAG_CONFIG.topK}; status: ${complete ? 'complete' : '**INCOMPLETE** (resume with `npm run eval`)'}`, '');
    lines.push('## Comparison', '');
    lines.push('| Metric | RAG off | RAG on | Change |', '|---|---|---|---|');
    lines.push(`| Render success | ${off.renderSuccess}/${off.tests} (${pct(off.renderSuccessRate)}) | ${on.renderSuccess}/${on.tests} (${pct(on.renderSuccessRate)}) | ${delta(off.renderSuccessRate, on.renderSuccessRate, (d) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} pts`)} |`);
    lines.push(`| Avg required-element coverage | ${pct(off.avgElementCoverage)} | ${pct(on.avgElementCoverage)} | ${delta(off.avgElementCoverage, on.avgElementCoverage, (d) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} pts`)} |`);
    lines.push(`| Full coverage (all elements) | ${off.fullCoverageCount}/${off.tests} | ${on.fullCoverageCount}/${on.tests} | |`);
    lines.push(`| LLM call failures | ${off.llmCallFailures} | ${on.llmCallFailures} | |`);
    lines.push(`| Avg latency | ${ms(off.latencyAvgMs)} | ${ms(on.latencyAvgMs)} | ${delta(off.latencyAvgMs, on.latencyAvgMs, (d) => `${d >= 0 ? '+' : ''}${d} ms`)} |`);
    lines.push(`| p95 latency | ${ms(off.latencyP95Ms)} | ${ms(on.latencyP95Ms)} | ${delta(off.latencyP95Ms, on.latencyP95Ms, (d) => `${d >= 0 ? '+' : ''}${d} ms`)} |`);
    lines.push(`| Prompt tokens (total) | ${off.tokens.prompt} | ${on.tokens.prompt} | ${delta(off.tokens.prompt, on.tokens.prompt, (d) => `${d >= 0 ? '+' : ''}${d}`)} |`);
    lines.push(`| Output tokens (total) | ${off.tokens.output} | ${on.tokens.output} | ${delta(off.tokens.output, on.tokens.output, (d) => `${d >= 0 ? '+' : ''}${d}`)} |`);
    lines.push(`| Thinking tokens (total) | ${off.tokens.thought} | ${on.tokens.thought} | |`);
    lines.push(`| All tokens (total) | ${off.tokens.total} | ${on.tokens.total} | ${delta(off.tokens.total, on.tokens.total, (d) => `${d >= 0 ? '+' : ''}${d}`)} |`);
    lines.push(`| Avg prompt tokens per call | ${off.tokens.avgPromptPerCall ?? 'n/a'} | ${on.tokens.avgPromptPerCall ?? 'n/a'} | |`, '');

    const table = (title, key) => {
        lines.push(`## Per ${title}`, '');
        lines.push(`| ${title} | n | Render off | Render on | Coverage off | Coverage on | Avg latency off | Avg latency on |`, '|---|---|---|---|---|---|---|---|');
        const names = [...new Set([...Object.keys(modes.rag_off[key]), ...Object.keys(modes.rag_on[key])])].sort();
        for (const name of names) {
            const a = modes.rag_off[key][name] || summarize([]);
            const b = modes.rag_on[key][name] || summarize([]);
            lines.push(`| ${name} | ${Math.max(a.tests, b.tests)} | ${a.renderSuccess}/${a.tests} | ${b.renderSuccess}/${b.tests} | ${pct(a.avgElementCoverage)} | ${pct(b.avgElementCoverage)} | ${ms(a.latencyAvgMs)} | ${ms(b.latencyAvgMs)} |`);
        }
        lines.push('');
    };
    table('engine', 'perEngine');
    table('category', 'perCategory');

    lines.push('## Per test', '');
    lines.push('| Test | Engine | Render off | Render on | Coverage off | Coverage on | Missing (on) | Error (on) |', '|---|---|---|---|---|---|---|---|');
    for (const t of testset.tests) {
        const a = byMode.rag_off.find((r) => r.id === t.id);
        const b = byMode.rag_on.find((r) => r.id === t.id);
        const mark = (r) => (!r ? '-' : r.renderSuccess ? 'yes' : 'no');
        const cov = (r) => (!r ? '-' : pct(r.coverage));
        const err = (b?.error || b?.renderError || '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 90);
        lines.push(`| ${t.id} | ${t.engine} | ${mark(a)} | ${mark(b)} | ${cov(a)} | ${cov(b)} | ${b?.missing?.join(', ') || ''} | ${err} |`);
    }
    lines.push('', '## How scores are computed', '');
    for (const [k, v] of Object.entries(report.scoring)) lines.push(`- **${k}**: ${v}`);
    lines.push('', `Raw per-prompt results (including generated code): \`${path.relative(ROOT_DIR, resultsPath).replace(/\\/g, '/')}\``, '');
    fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'));
    return { report, complete };
};

const main = async () => {
    if (args.has('--fresh') && fs.existsSync(runDir)) {
        fs.renameSync(runDir, `${runDir}.archived-${Date.now()}`);
        console.log('Archived previous results.');
    }
    let meta;
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    else if (args.has('--dry-run') || args.has('--report')) {
        meta = { model, testsetHash, startedAt: null, git: gitInfo() };
    } else {
        fs.mkdirSync(runDir, { recursive: true });
        meta = { model, testsetHash, startedAt: new Date().toISOString(), git: gitInfo() };
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }

    if (args.has('--report')) {
        const { complete } = writeReports(meta);
        console.log(`Reports written to reports/evaluation/ (complete: ${complete})`);
        return;
    }

    const done = new Set(loadResults().map((r) => keyOf(r.mode, r.id)));
    const todo = MODES.flatMap((m) => testset.tests.filter((t) => !done.has(keyOf(m.name, t.id))).map((t) => ({ mode: m, test: t })));

    console.log(`Model: ${model} | keys: ${LLM_CONFIG.apiKeys.length} | test set: ${testset.tests.length} prompts x ${MODES.length} modes`);
    console.log(`Already done: ${done.size}. Remaining: ${todo.length}.`);
    console.log(`Estimated calls: ${todo.length} LLM calls (more only if retries happen, max ${LLM_CONFIG.maxRetries} retries each) + ${todo.length} Kroki renders. Retrieval is local (0 LLM calls).`);
    if (args.has('--dry-run') || todo.length === 0) {
        if (todo.length === 0) writeReports(meta);
        return;
    }

    const service = createDiagramService();
    for (const [n, { mode, test }] of todo.entries()) {
        const record = { mode: mode.name, id: test.id, category: test.category, engine: test.engine, model, startedAt: new Date().toISOString() };
        try {
            const out = await service.generateDiagramCode({ text: test.prompt, engine: test.engine }, { ragEnabled: mode.ragEnabled });
            const { svg, error } = await render(out.code, test.engine);
            const cov = elementCoverage(out.code, test.requiredElements);
            Object.assign(record, {
                llmOk: true, error: null,
                renderSuccess: isRenderSuccess(svg), renderError: error,
                coverage: cov.coverage, matched: cov.matched, missing: cov.missing,
                latencyMs: out.latencyMs, llmLatencyMs: out.llmLatencyMs, attempts: out.attempts ?? null, usage: out.usage,
                rag: { used: out.rag.used, chunks: out.rag.chunks.map((c) => c.id), error: out.rag.error },
                code: out.code,
            });
        } catch (err) {
            if (err.code === 'LLM_QUOTA_EXHAUSTED') {
                console.error(`\nSTOPPED: LLM quota exhausted on all keys at ${mode.name}/${test.id}. ${n} prompts finished this session.`);
                console.error('Saved results are kept. Run `npm run eval` again later to resume.');
                writeReports(meta);
                process.exit(2);
            }
            const cov = elementCoverage('', test.requiredElements);
            Object.assign(record, {
                llmOk: false, error: `${err.code || 'ERROR'}: ${String(err.message).slice(0, 300)}`,
                renderSuccess: false, renderError: null,
                coverage: 0, matched: [], missing: cov.missing,
                latencyMs: null, llmLatencyMs: null, usage: err.usage || null, rag: null, code: null,
            });
        }
        fs.appendFileSync(resultsPath, `${JSON.stringify(record)}\n`);
        console.log(`[${n + 1}/${todo.length}] ${mode.name} ${test.id} (${test.engine}) render=${record.renderSuccess ? 'ok' : 'FAIL'} coverage=${(record.coverage * 100).toFixed(0)}% latency=${record.latencyMs ?? '-'}ms${record.error ? ` error=${record.error.slice(0, 80)}` : ''}`);
    }

    const { report, complete } = writeReports(meta);
    console.log(`\nDone (complete: ${complete}). Reports: reports/evaluation/report.md and report.json`);
    console.log(JSON.stringify(report.comparison, null, 2));
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
