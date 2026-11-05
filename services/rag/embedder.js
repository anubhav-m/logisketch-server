// Local embeddings with no model download and no API calls.
//
// Each text becomes a sparse TF-IDF vector over hashed features (feature hashing):
//   - word unigrams and bigrams (meaning: "sequence diagram", "primary key")
//   - syntax tokens such as "->", "||--o{", "@startuml" (engine syntax matters for retrieval)
// Vectors are L2-normalised, so cosine similarity = dot product.
// The IDF table is learned from the corpus at ingestion time and stored in the index.

export const EMBEDDER_NAME = 'hashed-tfidf-v1';
export const DIMENSIONS = 4096;

const STOPWORDS = new Set(
    'a an the and or of to in on for with by is are be as at it this that from into use using must can should each one two its your you create make draw diagram show'.split(' ')
);

// FNV-1a 32-bit hash -> bucket index
const hash = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % DIMENSIONS;
};

export const tokenize = (text) => {
    const lower = String(text || '').toLowerCase();
    const words = (lower.match(/[a-z][a-z0-9_]*/g) || [])
        .map((w) => w.replace(/s$/, '')) // crude singular: "entities"->"entitie", "orders"->"order"
        .filter((w) => w.length > 1 && !STOPWORDS.has(w));
    const symbols = lower.match(/[-=.<>|{}*+o:@#[\]()]{2,}|@[a-z]+/g) || [];

    const features = [];
    for (let i = 0; i < words.length; i++) {
        features.push(`w:${words[i]}`);
        if (i + 1 < words.length) features.push(`b:${words[i]}_${words[i + 1]}`);
    }
    for (const s of symbols) features.push(`s:${s}`);
    return features;
};

const termCounts = (text) => {
    const counts = new Map();
    for (const f of tokenize(text)) {
        const idx = hash(f);
        counts.set(idx, (counts.get(idx) || 0) + 1);
    }
    return counts;
};

// Build IDF from a list of texts. Stored sparsely: { index: idf } for seen features.
export const buildIdf = (texts) => {
    const df = new Map();
    for (const t of texts) for (const idx of termCounts(t).keys()) df.set(idx, (df.get(idx) || 0) + 1);
    const n = texts.length;
    const idf = {};
    for (const [idx, d] of df) idf[idx] = Number((Math.log((1 + n) / (1 + d)) + 1).toFixed(5));
    return { idf, defaultIdf: Number((Math.log(1 + n) + 1).toFixed(5)) };
};

// Returns a sparse vector { i: number[], v: number[] }, L2-normalised.
export const embed = (text, { idf, defaultIdf }) => {
    const counts = termCounts(text);
    const entries = [];
    let norm = 0;
    for (const [idx, c] of counts) {
        const w = (1 + Math.log(c)) * (idf[idx] ?? defaultIdf);
        entries.push([idx, w]);
        norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    entries.sort((a, b) => a[0] - b[0]);
    return { i: entries.map((e) => e[0]), v: entries.map((e) => Number((e[1] / norm).toFixed(6))) };
};

export const cosine = (a, b) => {
    // both sorted by index -> merge
    let i = 0, j = 0, dot = 0;
    while (i < a.i.length && j < b.i.length) {
        if (a.i[i] === b.i[j]) { dot += a.v[i] * b.v[j]; i++; j++; }
        else if (a.i[i] < b.i[j]) i++;
        else j++;
    }
    return dot;
};
