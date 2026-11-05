import { isValidEngine, ENGINE_NAMES } from '../config/env.js';

const MAX_PROMPT_CHARS = 4000;
const MAX_CODE_CHARS = 100000;

const fail = (next, message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return next(error);
};

const checkEngine = (engine) =>
    isValidEngine(engine) ? null : `engine must be one of: ${ENGINE_NAMES.join(', ')}`;

// POST /api/generate-image  { prompt: { text, image? } | "text", engine }
// `model` is accepted for backwards compatibility but ignored: the server uses GEMINI_MODEL.
export const validateGenerate = (req, res, next) => {
    const body = req.body || {};
    const prompt = typeof body.prompt === 'string' ? { text: body.prompt } : body.prompt;

    if (!prompt || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
        return fail(next, 'prompt.text is required');
    }
    if (prompt.text.length > MAX_PROMPT_CHARS) {
        return fail(next, `prompt.text must be at most ${MAX_PROMPT_CHARS} characters`);
    }
    if (prompt.image !== undefined && prompt.image !== null && prompt.image !== '' && typeof prompt.image !== 'string') {
        return fail(next, 'prompt.image must be a string (data URL or http(s) URL)');
    }
    const engineError = checkEngine(body.engine);
    if (engineError) return fail(next, engineError);

    req.body.prompt = { text: prompt.text.trim(), image: prompt.image || undefined };
    next();
};

// POST /api/render-code  { code, engine }
export const validateRender = (req, res, next) => {
    const body = req.body || {};
    if (typeof body.code !== 'string' || body.code.trim() === '') return fail(next, 'code is required');
    if (body.code.length > MAX_CODE_CHARS) return fail(next, `code must be at most ${MAX_CODE_CHARS} characters`);
    const engineError = checkEngine(body.engine);
    if (engineError) return fail(next, engineError);
    next();
};
