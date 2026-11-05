// Code-only scoring. No LLM judge.
import crypto from 'crypto';

// Lowercase and drop everything that is not a letter or digit, so
// "Order Item", "order_item", "OrderItem" and "ORDER-ITEM" all compare equal.
export const normalize = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// requiredElements: (string | string[])[]; an array means "any of these alternatives".
export const elementCoverage = (code, requiredElements = []) => {
    const haystack = normalize(code);
    const matched = [];
    const missing = [];
    for (const element of requiredElements) {
        const options = Array.isArray(element) ? element : [element];
        const label = options[0];
        if (haystack && options.some((o) => normalize(o) && haystack.includes(normalize(o)))) matched.push(label);
        else missing.push(label);
    }
    const total = requiredElements.length;
    return { matched, missing, coverage: total === 0 ? 1 : matched.length / total };
};

// A render only counts when Kroki answered 2xx with a real SVG document.
export const isRenderSuccess = (svg) => typeof svg === 'string' && /<svg[\s>]/i.test(svg);

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Nearest-rank percentile.
export const percentile = (xs, p) => {
    if (!xs.length) return null;
    const sorted = [...xs].sort((a, b) => a - b);
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1];
};

const round = (x, d = 3) => (x === null || x === undefined ? null : Number(x.toFixed(d)));

// Summary of a list of result records (see scripts/evaluate.js for the record shape).
// Failed LLM calls count as failures: renderSuccess=false and coverage=0.
export const summarize = (records) => {
    const n = records.length;
    const ok = records.filter((r) => r.llmOk);
    const latencies = ok.map((r) => r.latencyMs).filter((x) => typeof x === 'number');
    const sum = (key) => records.reduce((a, r) => a + (r.usage?.[key] || 0), 0);
    return {
        tests: n,
        llmCallFailures: n - ok.length,
        renderSuccess: records.filter((r) => r.renderSuccess).length,
        renderSuccessRate: n ? round(records.filter((r) => r.renderSuccess).length / n) : null,
        avgElementCoverage: n ? round(mean(records.map((r) => r.coverage ?? 0))) : null,
        fullCoverageCount: records.filter((r) => r.coverage === 1).length,
        latencyAvgMs: round(mean(latencies), 0),
        latencyP95Ms: percentile(latencies, 95),
        tokens: {
            prompt: sum('promptTokens'),
            output: sum('outputTokens'),
            thought: sum('thoughtTokens'),
            total: sum('totalTokens'),
            avgPromptPerCall: ok.length ? round(ok.reduce((a, r) => a + (r.usage?.promptTokens || 0), 0) / ok.length, 0) : null,
            avgTotalPerCall: ok.length ? round(ok.reduce((a, r) => a + (r.usage?.totalTokens || 0), 0) / ok.length, 0) : null,
        },
    };
};

export const groupBy = (records, key) => {
    const groups = {};
    for (const r of records) (groups[r[key]] ||= []).push(r);
    return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, summarize(v)]));
};

export const hashTestset = (testset) =>
    crypto.createHash('sha256').update(JSON.stringify(testset.tests)).digest('hex');
