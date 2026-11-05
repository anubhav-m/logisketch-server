# Logisketch – Smart Diagram Generator from Natural Language & Images

<br>

## About

Generate system architecture, ER, flowchart, network packet, circuit logic, math, and sequence
diagrams from natural language prompts (optionally with an image).
A backend-only diagram assistant: the LLM writes diagram code, [Kroki](https://kroki.io) renders it.
Supports **15 diagram engines** like PlantUML, Mermaid, Graphviz, Structurizr, D2, Vega-Lite, TikZ, and more.

- One LLM (Google Gemini, model set by `GEMINI_MODEL`), behind a single swappable client module
- RAG over hand-written, Kroki-validated syntax notes for each engine (local embeddings, no vector DB)
- A reproducible evaluation (30 prompts, RAG off vs on, code-only scoring)

Design notes and interview Q&A: [docs/DEFENSE.md](docs/DEFENSE.md). Change log and assumptions: [docs/CHANGES.md](docs/CHANGES.md).

---

<br>

## Supported Diagram Engines (via Kroki)

| Engine      | Can Generate                                      |
| ----------- | ------------------------------------------------- |
| Graphviz    | Flowcharts, directed/undirected graphs            |
| Blockdiag   | Block diagrams                                    |
| Seqdiag     | Sequence diagrams                                 |
| Packetdiag  | Network packet diagrams                           |
| C4          | C4 model diagrams (software architecture)         |
| D2          | Entity relationships, org charts, architectures   |
| ERD         | Entity Relationship Diagrams                      |
| Mermaid     | Flowcharts, Gantt, class, pie, state diagrams     |
| Nomnoml     | UML class diagrams                                |
| PlantUML    | UML diagrams (sequence, activity, use-case, etc.) |
| Structurizr | Software architecture diagrams (C4 model)         |
| Symbolator  | Digital logic and circuit diagrams                |
| Tikz        | Math figures, circuit diagrams, flowcharts        |
| Vega-Lite   | Bar, line, scatter charts (data visualization)    |
| Wavedrom    | Digital timing diagrams                           |

---

<br>

## Key Features

- Natural language (and image) to diagram via Kroki
- Single LLM client with timeouts, retries (429/5xx), request pacing, multi-key rotation, token and latency logs
- Engine-specific RAG with an on/off switch (`RAG_ENABLED`) and safe fallback
- Request validation, JWT auth, API keys, saved interactions (MongoDB)
- Rate limiting and bot protection via Arcjet
- Evaluation command with JSON + Markdown reports

---

<br>

## API Routes Description

### 1. `POST /api/generate-image`

Generates a diagram from a natural language prompt, with optional image input.
Runs the full pipeline (validation → RAG → Gemini → Kroki) and returns both the generated code and the rendered SVG.

### 2. `POST /api/render-code`

Renders given diagram code with the selected Kroki engine. No LLM involved.

### 3. Auth, API key and interaction routes

`/api/auth/sign-up`, `/api/auth/sign-in`, `/api/auth/delete-account`, `/api/api-key` (POST/GET/DELETE) and `/api/interaction` (POST/GET/PUT/DELETE) are unchanged and need a JWT (`Authorization: Bearer <token>`).

---

<br>

## API Usage

### Text prompt

> POST /api/generate-image

```json
{
  "prompt": {
    "text": "Create a CI/CD pipeline diagram with key stages and tool relationships."
  },
  "engine": "plantuml"
}
```

`prompt` may also be a plain string. A `model` field is accepted for backwards compatibility but ignored: the server always uses `GEMINI_MODEL`.

#### ✅ Success Response

```json
{
  "success": true,
  "code": "...",
  "svg": "..."
}
```

#### ❌ Error Response

```json
{
  "success": "false",
  "error": "..."
}
```

| Status | When |
|---|---|
| 400 | Missing `prompt.text`, prompt over 4000 characters, unknown `engine`, bad image |
| 429 | Arcjet rate limit, or LLM quota exhausted on all keys |
| 502 | LLM upstream error / empty reply / no code in reply |
| 504 | LLM or Kroki timeout |
| 4xx from Kroki | Generated code did not render (Kroki's status and message are passed through) |

### Text + image prompt

```json
{
  "prompt": {
    "text": "Create an ER diagram from following image",
    "image": "https://dataedo.com/asset/img/blog/erd_with_pen.png"
  },
  "engine": "erd"
}
```

`image` can be an `http(s)` URL (downloaded by the server, max 5 MB) or a `data:image/...;base64,...` URL.

### Rendering code

> POST /api/render-code

```json
{
  "code": "graph TD\n  A --> B",
  "engine": "mermaid"
}
```

Success: `{ "success": true, "svg": "..." }`

---

<br>

## Accepted Parameters

| Parameter | Type | Allowed Values | Description |
| --------- | ---- | -------------- | ----------- |
| `prompt.text` | string | 1-4000 characters | What to draw |
| `prompt.image` | string (optional) | http(s) URL or data URL | Image to base the diagram on |
| `engine` | string | `plantuml`, `mermaid`, `graphviz`, `structurizr`, `blockdiag`, `seqdiag`, `packetdiag`, `c4plantuml`, `d2`, `erd`, `nomnoml`, `tikz`, `vegalite`, `symbolator`, `wavedrom` | Kroki rendering engine |

---

<br>

## Environment Configuration (single LLM)

Copy `.env.example` to `.env` in the project root and fill it in. `.env` is gitignored; never commit it.
(The legacy `.env.development.local` / `.env.production.local` files are still read first if present.)

```env
NODE_ENV=development
PORT=3000

DB_URI=mongodb://localhost:27017/logisketch
JWT_SECRET=change_me
JWT_EXPIRY=1d
ARCJET_KEY=your_arcjet_key_here

# LLM (single provider: Gemini)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
# Optional extra keys for the same model, rotated when one is rate limited
# GEMINI_API_KEY_1=
# GEMINI_API_KEY_2=

# RAG
RAG_ENABLED=true
```

Optional tuning (defaults in brackets): `LLM_TIMEOUT_MS` [60000], `LLM_MAX_RETRIES` [4],
`LLM_MIN_INTERVAL_MS` per key [4000], `LLM_TEMPERATURE` [0.2], `LLM_MAX_OUTPUT_TOKENS` [8192],
`RAG_TOP_K` [3, max 3], `KROKI_URL` [https://kroki.io], `KROKI_TIMEOUT_MS` [30000].

### How the LLM client works

All model calls go through `services/llm.services.js` (`generateText({ system, user, image })`).
To change provider, rewrite that one file and keep its input/output shape.

- **Timeout** per attempt (`LLM_TIMEOUT_MS`).
- **Retries** with exponential backoff on 429, 5xx, timeouts and network errors. 400-type errors are not retried.
  On 429 the client honours Gemini's `retryDelay` and moves to another key; a daily-quota 429 parks that key.
- **Pacing**: each key is used at most once every `LLM_MIN_INTERVAL_MS`; the client picks the key that is free soonest.
- **Logging**: one JSON line per call (`llm.call`) with model, attempt, key slot (never the key), latency, prompt/output/thinking/total tokens.

### Get your keys

- **Gemini API key** → [Google AI Studio](https://aistudio.google.com/apikey)
- **Arcjet key** → [https://arcjet.com](https://arcjet.com) (without a key Arcjet logs an error and lets requests through)

---

<br>

## RAG (engine syntax retrieval)

```
data/engine-docs/<engine>.md  --npm run ingest-->  data/rag-index.json  --retrieve(engine)-->  top 3 chunks in the system prompt
```

- `data/engine-docs/` has short syntax notes, common mistakes and valid examples for all 15 engines, written for this project.
  `npm run validate-docs` renders every example through Kroki (24/24 render).
- `npm run ingest` splits each doc into one chunk per `##` section (74 chunks), embeds them **locally**
  (hashed TF-IDF vectors, pure JavaScript, no downloads, no LLM quota) and writes `data/rag-index.json`.
  It is idempotent: unchanged docs leave the file untouched.
- At request time the retriever keeps **only the chunks of the selected engine**, ranks them by cosine similarity
  to the prompt and adds the top 2-3 (`RAG_TOP_K`) to the system prompt under "SYNTAX REFERENCE".
- `RAG_ENABLED=false` turns it off. If retrieval throws, the error is logged (`rag.retrieval_failed`) and the
  diagram is generated without RAG.

---

<br>

## Evaluation

```bash
npm run eval -- --dry-run   # print the number of calls it will make
npm run eval                # run (or resume) RAG off, then RAG on, then write reports
npm run eval -- --report    # rebuild reports from saved results
npm run eval -- --fresh     # archive saved results and start again
```

- Test set: `eval/testset.json`, 30 frozen prompts: 6 ER, 6 flowchart, 6 sequence, 6 UML, 6 architecture,
  over 10 engines (mermaid, plantuml, graphviz, d2, erd, nomnoml, seqdiag, blockdiag, c4plantuml, structurizr).
  Each prompt lists its required elements.
- Both passes use the same model, test set and code path as the API. Each output is rendered by Kroki.
- Scoring is code only: render success (Kroki 2xx + SVG), required-element coverage, average and p95 latency, token usage.
- Failed LLM calls count as failures. There is no response cache, so every prompt makes a new call.
- Results are saved after every prompt (`reports/evaluation/runs/.../results.jsonl`, with the generated code), so a run
  can resume. If every key runs out of quota, the run stops and says so.
- Reports: [`reports/evaluation/report.md`](reports/evaluation/report.md) and `report.json` (comparison, per-engine,
  per-category, per-test, model, date, git commit, test-set hash).
- Cost: 60 LLM calls + 60 Kroki renders for a full run (more only if calls are retried).

### Results (real run, 2026-11-05)

Model `gemini-3.5-flash-lite`, temperature 0.2, 30 prompts × 2 modes = 60 LLM calls, 0 failed calls,
git commit `b55cf7f` at run start. Full report: [`reports/evaluation/report.md`](reports/evaluation/report.md).

| Metric | RAG off | RAG on |
|---|---|---|
| Render success (Kroki) | **27/30 (90.0%)** | **30/30 (100.0%)** |
| Avg required-element coverage | 99.4% | 99.4% |
| Avg latency (as measured) | 3274 ms | 2053 ms |
| p95 latency (as measured) | 7871 ms | 3518 ms |
| Avg latency, same 25 tests with no retries in either pass | 2497 ms | 1889 ms |
| Avg prompt tokens per call | 1077 | 1526 (+42%) |
| Total tokens (60 calls) | 39,653 | 53,077 |

What this shows:

- **RAG fixed all 3 render failures** without breaking any prompt that already worked: sq-04 (PlantUML sequence,
  syntax error), sq-06 (Mermaid sequence, invalid arrow `Auth--is Valid?-->Auth`) and uml-03 (nomnoml, parse error).
  All three are syntax mistakes of the kind the engine notes cover.
- **Coverage did not change** (99.4% both ways). The prompts name their elements explicitly, so the model almost always
  includes them; the only miss is sq-01, where the model wrote "Auth Code" and the test requires "authorization code".
  RAG improves syntax, not content.
- **Cost: about 450 extra prompt tokens per call (+42%)**; output tokens are unchanged (~244 per call).
- **Do not read the latency difference as a RAG speed-up.** Measured latency includes time spent on failed attempts:
  the RAG-off pass (run first) hit 7 Gemini 503 retries, RAG on hit 1. Even without those, RAG on was faster although its
  prompts are longer, so the gap comes from Gemini load changing during the run. Retrieval itself takes 0-1 ms
  (3-10 ms on the first call, which loads the index). The runner now records `attempts` per prompt so future reports can
  separate retried calls.

### Limitations

- 30 prompts is a small sample: one prompt is 3.3 points. The +10-point render gain is 3 prompts.
- One run per mode at temperature 0.2. A rerun will differ a little; repeat runs would be needed for confidence intervals.
- Render success means "Kroki accepted the syntax", not "the diagram is correct or readable".
- Element coverage is a substring check on names. It does not verify relationships, and a name in a comment counts.
  The prompts name their elements, so coverage is close to the ceiling and does not separate the two modes.
- 10 of the 15 engines are in the test set; packetdiag, symbolator, tikz, vegalite and wavedrom are not evaluated.
- Latency depends on Gemini's load at the time and on retries (see above); it is not a controlled benchmark.
- The embeddings are lexical (hashed TF-IDF). They are fine for short, keyword-rich prompts within one engine but would
  miss pure synonyms.
- Kroki is the public kroki.io instance; its availability affects both the API and the evaluation.

---

<br>

## Tests

```bash
npm test
```

43 tests with Node's built-in runner, no LLM quota used (HTTP is mocked): LLM failure handling (429 rotation, 5xx retry,
timeouts, quota exhaustion, key redaction, pacing), retrieval (engine filtering, ranking, idempotent ingestion),
the RAG on/off switch and fallback, scoring, and request validation.

`npm run smoke` sends one real request through the HTTP API (Express → RAG → Gemini → Kroki) and saves the SVG
to `reports/smoke/`. It uses 1 LLM call and does not need MongoDB.

---

<br>

## How to Run Locally

```bash
git clone git@github.com:anubhav-m/logisketch-server.git
cd logisketch-server
npm install
cp .env.example .env      # then fill in the values
npm run ingest            # optional: the index is committed, this rebuilds it if docs changed
npm run dev
```

---

<br>

## Deployment Guide

Build: `npm install` · Start: `npm start` · Set `NODE_ENV=production` and the variables from
[Environment Configuration](#environment-configuration-single-llm) as platform secrets (do not upload `.env` to git).

---

<br>

## License
This project is licensed under the terms of the [MIT License](./LICENSE).
