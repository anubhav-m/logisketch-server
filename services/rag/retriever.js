// Local vector search: brute-force cosine similarity over the chunks of ONE engine.
// The corpus is tiny (a few chunks per engine), so an in-memory scan is fast (< 1 ms)
// and a vector database would add nothing.
import fs from 'fs';
import { RAG_CONFIG } from '../../config/env.js';
import { embed, cosine } from './embedder.js';
import { buildIndex } from './ingest.js';
import { logger } from '../../utilities/logger.utilities.js';

export const createRetriever = ({ indexPath = RAG_CONFIG.indexPath, docsDir = RAG_CONFIG.docsDir, index: givenIndex } = {}) => {
    let index = givenIndex || null;

    const load = () => {
        if (index) return index;
        if (fs.existsSync(indexPath)) {
            index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        } else {
            // No index on disk yet: build it in memory (same result as `npm run ingest`).
            logger.warn('rag.index_missing', { indexPath, action: 'building in memory; run npm run ingest' });
            index = buildIndex(docsDir);
        }
        return index;
    };

    // Top-k chunks for this engine only. Never returns chunks of another engine.
    const retrieve = (query, engine, k = RAG_CONFIG.topK) => {
        const idx = load();
        const q = embed(query, idx);
        return idx.chunks
            .filter((c) => c.engine === engine)
            .map((c) => ({ id: c.id, engine: c.engine, title: c.title, text: c.text, score: cosine(q, c.vector) }))
            .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
            .slice(0, k);
    };

    return { retrieve, load };
};

export const retriever = createRetriever();
