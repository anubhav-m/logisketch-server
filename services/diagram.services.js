// Prompt -> diagram code. Used by the API controller AND the evaluation runner, so the
// evaluation measures exactly the production path.
import { getEnginePrompt, isValidEngine, RAG_CONFIG } from '../config/env.js';
import { llmClient } from './llm.services.js';
import { retriever as defaultRetriever } from './rag/retriever.js';
import { extractCode } from '../utilities/extractCode.utilites.js';
import { logger } from '../utilities/logger.utilities.js';

const badRequest = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};

// Engine rules first, then the retrieved syntax notes as reference material.
export const buildSystemPrompt = (enginePrompt, chunks = []) => {
    if (!chunks.length) return enginePrompt;
    const context = chunks
        .map((c, i) => `[Reference ${i + 1}] ${c.title}\n${c.text}`)
        .join('\n\n');
    return `${enginePrompt}\n\n---\nSYNTAX REFERENCE (retrieved for this engine; use it to write valid syntax, ` +
        `do not copy its example content unless it matches the request):\n\n${context}`;
};

export const createDiagramService = ({ llm = llmClient, retriever = defaultRetriever, ragEnabled = RAG_CONFIG.enabled, topK = RAG_CONFIG.topK } = {}) => {

    // options.ragEnabled overrides the default per call (used by the evaluation runner).
    const generateDiagramCode = async ({ text, image, engine }, options = {}) => {
        if (!isValidEngine(engine)) throw badRequest(`Engine ${engine} not found in ENGINES`);

        const useRag = options.ragEnabled ?? ragEnabled;
        const rag = { enabled: useRag, used: false, chunks: [], error: null, latencyMs: 0 };

        if (useRag) {
            const started = Date.now();
            try {
                const chunks = retriever.retrieve(text, engine, topK);
                rag.chunks = chunks.map((c) => ({ id: c.id, title: c.title, score: Number(c.score.toFixed(4)), text: c.text }));
                rag.used = chunks.length > 0;
            } catch (err) {
                // Retrieval must never break generation: log and continue without RAG.
                rag.error = err.message;
                logger.warn('rag.retrieval_failed', { engine, error: err.message });
            }
            rag.latencyMs = Date.now() - started;
            logger.info('rag.retrieve', { engine, used: rag.used, chunks: rag.chunks.map((c) => `${c.id}:${c.score}`), latencyMs: rag.latencyMs });
        }

        const system = buildSystemPrompt(getEnginePrompt(engine), rag.chunks);
        const result = await llm.generateText({ system, user: text, image });
        const code = extractCode(result.text);

        if (!code) {
            const error = new Error('LLM response did not contain diagram code');
            error.statusCode = 502;
            error.usage = result.usage;
            throw error;
        }

        return {
            code,
            raw: result.text,
            usage: result.usage,
            latencyMs: result.latencyMs + rag.latencyMs,
            llmLatencyMs: result.latencyMs,
            model: result.model,
            rag: { ...rag, chunks: rag.chunks.map(({ text: _t, ...meta }) => meta) },
        };
    };

    return { generateDiagramCode };
};

export const diagramService = createDiagramService();
