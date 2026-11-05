import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load `.env.<NODE_ENV>.local` first (legacy), then `.env`. dotenv never overrides
// variables that are already set, so real environment variables always win.
config({ path: path.join(ROOT, `.env.${process.env.NODE_ENV || 'development'}.local`), quiet: true });
config({ path: path.join(ROOT, '.env'), quiet: true });

const num = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && value !== '' && value !== undefined ? n : fallback;
};

const bool = (value, fallback) => {
    if (value === undefined || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

export const ROOT_DIR = ROOT;

export const PORT = process.env.PORT || 3000;

export const { NODE_ENV = 'development', JWT_SECRET, JWT_EXPIRY, DB_URI, ARCJET_KEY } = process.env;

// ---------- LLM (single provider: Gemini) ----------
// GEMINI_API_KEY is the main key. GEMINI_API_KEY_1..GEMINI_API_KEY_9 are optional extra
// keys for the same provider; the client rotates between them when one is rate limited.
const collectKeys = () => {
    const keys = [process.env.GEMINI_API_KEY];
    for (let i = 1; i <= 9; i++) keys.push(process.env[`GEMINI_API_KEY_${i}`]);
    return [...new Set(keys.filter((k) => typeof k === 'string' && k.trim() !== '').map((k) => k.trim()))];
};

export const LLM_CONFIG = {
    provider: 'gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    apiKeys: collectKeys(),
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    timeoutMs: num(process.env.LLM_TIMEOUT_MS, 60000),
    maxRetries: num(process.env.LLM_MAX_RETRIES, 4),
    // Minimum gap between two requests that use the same key (request pacing).
    minIntervalMs: num(process.env.LLM_MIN_INTERVAL_MS, 4000),
    temperature: num(process.env.LLM_TEMPERATURE, 0.2),
    maxOutputTokens: num(process.env.LLM_MAX_OUTPUT_TOKENS, 8192),
};

// ---------- RAG ----------
export const RAG_CONFIG = {
    enabled: bool(process.env.RAG_ENABLED, true),
    topK: Math.min(Math.max(num(process.env.RAG_TOP_K, 3), 1), 3),
    docsDir: path.join(ROOT, 'data', 'engine-docs'),
    indexPath: path.join(ROOT, 'data', 'rag-index.json'),
};

// ---------- Kroki ----------
export const KROKI_CONFIG = {
    url: process.env.KROKI_URL || 'https://kroki.io',
    timeoutMs: num(process.env.KROKI_TIMEOUT_MS, 30000),
};

// ---------- Diagram engines ----------
// Every engine has a system prompt in prompts/<engine>.prompts.txt.
export const ENGINE_NAMES = [
    'graphviz', 'blockdiag', 'seqdiag', 'packetdiag', 'c4plantuml',
    'd2', 'erd', 'mermaid', 'nomnoml', 'plantuml',
    'structurizr', 'symbolator', 'tikz', 'vegalite', 'wavedrom',
];

export const ENGINES = ENGINE_NAMES.map((name) => ({
    name,
    prompt: fs.readFileSync(path.join(ROOT, 'prompts', `${name}.prompts.txt`), 'utf-8'),
}));

export const isValidEngine = (engine) => ENGINE_NAMES.includes(engine);

export const getEnginePrompt = (engine) => ENGINES.find((e) => e.name === engine)?.prompt;
