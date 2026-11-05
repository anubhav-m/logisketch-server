// Ingestion: data/engine-docs/<engine>.md -> chunks -> local embeddings -> data/rag-index.json
// Idempotent: the output only depends on the docs content. If the docs hash did not change,
// the existing index is kept as is (no rewrite).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildIdf, embed, EMBEDDER_NAME, DIMENSIONS } from './embedder.js';

export const INDEX_VERSION = 1;

// One chunk per "## " section. The engine name and the doc title are prefixed so the
// chunk is self-describing when it is pasted into the prompt.
export const chunkMarkdown = (engine, markdown) => {
    const text = markdown.replace(/\r\n/g, '\n');
    const title = (/^#\s+(.+)$/m.exec(text)?.[1] || engine).trim();
    const sections = text.split(/^##\s+/m).slice(1);
    return sections.map((section, n) => {
        const [heading, ...body] = section.split('\n');
        return {
            id: `${engine}#${n + 1}`,
            engine,
            title: `${title}: ${heading.trim()}`,
            text: body.join('\n').trim(),
        };
    }).filter((c) => c.text.length > 0);
};

export const loadChunks = (docsDir) => {
    const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md')).sort();
    return files.flatMap((f) => chunkMarkdown(path.basename(f, '.md'), fs.readFileSync(path.join(docsDir, f), 'utf-8')));
};

export const hashDocs = (docsDir) => {
    const h = crypto.createHash('sha256');
    for (const f of fs.readdirSync(docsDir).filter((x) => x.endsWith('.md')).sort()) {
        h.update(f);
        h.update(fs.readFileSync(path.join(docsDir, f), 'utf-8').replace(/\r\n/g, '\n'));
    }
    h.update(`${EMBEDDER_NAME}:${DIMENSIONS}:${INDEX_VERSION}`);
    return h.digest('hex');
};

export const buildIndex = (docsDir) => {
    const chunks = loadChunks(docsDir);
    const docText = (c) => `${c.title}\n${c.text}`;
    const idfTable = buildIdf(chunks.map(docText));
    return {
        version: INDEX_VERSION,
        embedder: EMBEDDER_NAME,
        dimensions: DIMENSIONS,
        docsHash: hashDocs(docsDir),
        ...idfTable,
        chunks: chunks.map((c) => ({ ...c, vector: embed(docText(c), idfTable) })),
    };
};

// Returns { written: boolean, index }
export const ingest = (docsDir, indexPath) => {
    const docsHash = hashDocs(docsDir);
    if (fs.existsSync(indexPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            if (existing.docsHash === docsHash && existing.version === INDEX_VERSION) {
                return { written: false, index: existing };
            }
        } catch {
            // corrupt index -> rebuild
        }
    }
    const index = buildIndex(docsDir);
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(indexPath, JSON.stringify(index));
    return { written: true, index };
};
