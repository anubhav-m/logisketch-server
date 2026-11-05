// Prompt -> diagram code. Used by the API controller AND the evaluation runner, so the
// evaluation measures exactly the production path.
import { getEnginePrompt, isValidEngine } from '../config/env.js';
import { llmClient } from './llm.services.js';
import { extractCode } from '../utilities/extractCode.utilites.js';

const badRequest = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};

export const buildSystemPrompt = (enginePrompt) => enginePrompt;

export const createDiagramService = ({ llm = llmClient } = {}) => {

    const generateDiagramCode = async ({ text, image, engine }) => {
        if (!isValidEngine(engine)) throw badRequest(`Engine ${engine} not found in ENGINES`);

        const system = buildSystemPrompt(getEnginePrompt(engine));
        const result = await llm.generateText({ system, user: text, image });
        const code = extractCode(result.text);

        if (!code) {
            const error = new Error('LLM response did not contain diagram code');
            error.statusCode = 502;
            throw error;
        }

        return { code, raw: result.text, usage: result.usage, latencyMs: result.latencyMs, model: result.model };
    };

    return { generateDiagramCode };
};

export const diagramService = createDiagramService();
