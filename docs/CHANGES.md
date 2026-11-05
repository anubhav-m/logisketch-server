# Changes and assumptions

Branch: `feature/single-llm-rag-eval`

## 1. Single LLM

- Removed the multi-LLM setup: `LLM_MODELS`, GROQ/OpenRouter variables, the text/image
  model split, and model lookup by name. There was no separate preview-model route in
  the code; the dead parts were the unused model list entries and the `model` request
  field.
- One client: `services/llm.services.js` (`createLLMClient` / `llmClient.generateText`).
  Provider is Gemini (REST `generateContent`). Changing provider = rewriting this one file.
- Added: request timeout (`LLM_TIMEOUT_MS`), retries with exponential backoff for 429,
  5xx, timeouts and network errors (`LLM_MAX_RETRIES`), per-key request pacing
  (`LLM_MIN_INTERVAL_MS`), and a JSON log line per call with latency and token counts.
- Prompt -> code logic moved to `services/diagram.services.js` so the API and the
  evaluation use the same code path.
- Added request validation middleware (`middlewares/validate.middlewares.js`).

### Assumptions
- **Several keys, one provider.** The user supplied 3 Gemini keys. `GEMINI_API_KEY` plus
  optional `GEMINI_API_KEY_1..9` are all keys for the same model; the client picks the
  key that is free soonest and moves to another key on 429. Still a single LLM.
- **`model` in the request body is ignored** (kept accepted for backwards compatibility).
  The model always comes from `GEMINI_MODEL`.
- **Image prompts kept.** The old image model path is replaced by Gemini's native image
  input. `prompt.image` can be a data URL or an http(s) URL (downloaded, max 5 MB).
- Env loading now reads `.env` (and still the legacy `.env.<NODE_ENV>.local`, which wins).
- The 15 engines are now a constant list in `config/env.js` instead of `ENGINE_1..15`
  variables (same 15 engines, same prompt files).
- `extractCode` falls back to the whole reply when the model forgets code fences.
- Thinking-model "thought" parts are dropped from the reply text; their token count is
  logged as `thoughtTokens`.

### Small bug fixes found on the way
- `error.middlewares.js` assigned to an undeclared `error` variable (ReferenceError in
  ES modules) so Mongoose errors always became 500. Fixed; also maps malformed JSON to 400.
- `apiKey.controllers.js` had `stausCode` typo (404 became 500). Fixed.
- Unknown engine errors now return 400 instead of 500.
- `app.js` now exports `app` and only starts listening when run directly (needed for tests).
