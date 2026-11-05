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

## 2. RAG over engine syntax

- `data/engine-docs/<engine>.md`: short syntax notes, common mistakes and valid examples for
  all 15 engines, written for this project (not copied from external docs).
  `npm run validate-docs` renders every example with Kroki: 24/24 render.
- `npm run ingest` chunks the docs (one chunk per `##` section, 74 chunks), embeds them
  locally and writes `data/rag-index.json`. Idempotent: if the docs hash is unchanged the
  file is not rewritten.
- Retrieval (`services/rag/retriever.js`) filters to the selected engine first, then ranks
  by cosine similarity and returns the top `RAG_TOP_K` (default 3, clamped to 1..3) chunks.
  They are appended to the engine system prompt as a "SYNTAX REFERENCE" section.
- `RAG_ENABLED` (default `true`). The diagram service also accepts a per-call override
  (used by the evaluation). If retrieval throws, it logs `rag.retrieval_failed` and
  generates without RAG.

### Assumptions
- **"Local embeddings" = hashed TF-IDF vectors** (word unigrams + bigrams + syntax tokens,
  4096 hashed dimensions, L2-normalised), computed in plain JavaScript. Reasons: zero
  downloads, zero native dependencies, deterministic, no LLM quota, and the search space per
  engine is only 3-7 chunks, so a neural embedding model would not change the ranking much.
  The embedder is one file (`services/rag/embedder.js`) and can be replaced by a neural
  local model later (e.g. transformers.js) without touching the retriever.
- **Vector search = brute-force cosine in memory.** No vector database is needed for 74 chunks.
- The index file is committed so the server works without running ingestion; if it is
  missing, the retriever builds it in memory and logs a warning.

## 3. Evaluation

- `eval/testset.json`: 30 prompts (6 each: ER, flowchart, sequence, UML, architecture) over
  10 engines, each with `requiredElements`. Committed before any run and frozen.
- `npm run eval` runs every prompt with RAG off, then with RAG on, same model, same test
  set, same code path as the API (`services/diagram.services.js`). Each output is rendered
  with Kroki and scored by code (`eval/scoring.js`).
- Results are appended to `reports/evaluation/runs/<model>__<testset-hash>/results.jsonl`
  after every prompt; rerunning resumes. `--dry-run` prints the call estimate, `--report`
  rebuilds reports, `--fresh` archives old results.
- If all keys hit the quota the run stops (exit code 2) without recording that prompt, so a
  resume retries it. Any other LLM failure is recorded as a failure (render false, coverage 0).
- Reports: `reports/evaluation/report.json` and `report.md`.

### Assumptions
- Element coverage is a normalised substring match (lowercase, punctuation removed) of
  the element names in the generated code. Alternatives are allowed where several
  names are equally correct (e.g. "auth server" / "authorization server").
- Latency = LLM HTTP time (all attempts) + retrieval time, without pacing and backoff
  waits, so it measures the model rather than the rate limiter. Only successful calls count.
- Kroki calls are retried on network/5xx errors only (Kroki outages are not counted as
  invalid diagrams); a 4xx from Kroki is a render failure.
- "Bypass any cache": the app has no response cache; Kroki is called with POST and
  `Cache-Control: no-cache`; every test makes a fresh Gemini call.
- The run is sequential (RAG off fully, then RAG on), as requested. Model sampling uses
  temperature 0.2, so runs are not bit-for-bit reproducible.
