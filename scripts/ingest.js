// npm run ingest  — builds data/rag-index.json from data/engine-docs/*.md (idempotent)
import { RAG_CONFIG } from '../config/env.js';
import { ingest } from '../services/rag/ingest.js';

const { written, index } = ingest(RAG_CONFIG.docsDir, RAG_CONFIG.indexPath);
const engines = new Set(index.chunks.map((c) => c.engine));
console.log(`${written ? 'Index written' : 'Index up to date (no changes)'}: ${index.chunks.length} chunks, ${engines.size} engines, embedder ${index.embedder}, docsHash ${index.docsHash.slice(0, 12)}`);
console.log(`Path: ${RAG_CONFIG.indexPath}`);
