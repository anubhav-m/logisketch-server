# Defending the design

A plain-language guide to how Logisketch works, why it is built this way, and the questions
an interviewer is likely to ask.

## 1. What the service does

You send a sentence like "ER diagram for a library" plus an engine name like `mermaid`.
The server asks an LLM to write diagram code in that engine's language, sends the code to
Kroki (a public diagram-rendering service), and returns both the code and the SVG picture.

## 2. Request flow (POST /api/generate-image)

```
client
  |  { prompt: { text, image? }, engine }
  v
Express app (app.js)
  1. dynamicCors      - CORS; browsers need a valid X-API-Key for their origin to be allowed
  2. express.json     - parse body (8 MB limit, enough for a data-URL image)
  3. arcjetMiddleware - bot detection, shield, token-bucket rate limit (429 when exceeded)
  4. validateGenerate - prompt.text required (max 4000 chars), engine must be one of 15
  5. generateImage controller
       |
       v
     diagramService.generateDiagramCode   (services/diagram.services.js)
       a. RAG (if RAG_ENABLED): retriever.retrieve(text, engine, k=3)
            - local index, only chunks of THIS engine, cosine similarity
            - on any error: log rag.retrieval_failed and continue without RAG
       b. system prompt = engine rules (prompts/<engine>.prompts.txt) + retrieved syntax notes
       c. llmClient.generateText(system, user text, image)   (services/llm.services.js)
            - pick the API key that is free soonest (pacing), POST to Gemini
            - timeout per attempt; retry 429 / 5xx / timeout / network with backoff
            - log model, latency, prompt/output/thinking tokens
       d. extractCode: first ``` block of the reply
       |
       v
     callKroki(code, engine)   (services/kroki.services.js, with timeout)
       |
       v
  200 { success: true, code, svg }
  any error -> errorMiddleware -> { success: "false", error } with the right status code
```

`POST /api/render-code` skips steps a-d and only calls Kroki. Auth, API-key and interaction
routes are unchanged (JWT + MongoDB).

## 3. Main decisions and why

| Decision | Why | Trade-off |
|---|---|---|
| One LLM client module | Old code had a list of Groq/OpenRouter models picked by name per request. One module is simpler to test and to swap. The rest of the app only knows `generateText({system, user, image})`. | No per-request model choice. |
| Gemini via REST `fetch`, no SDK | No extra dependency; full control over timeouts, retries and logging. | We parse the response ourselves. |
| Several keys for one provider | Free-tier keys have low per-minute limits. Rotating keys on 429 raises throughput without adding another model. | Must respect the provider's terms for multiple keys. |
| Per-key pacing (4 s default) | Prevents bursts that trigger 429 in the first place. | Adds waiting under load; tunable with `LLM_MIN_INTERVAL_MS`. |
| Retry only 429, 5xx, timeouts, network errors | These are temporary. A 400 means our request is wrong; retrying wastes quota. | — |
| Daily-quota 429 parks the key | Retrying a key that is out of daily quota is pointless. When all keys are parked we stop with `LLM_QUOTA_EXHAUSTED`. | — |
| RAG over hand-written syntax notes | LLMs mix up similar syntaxes (Mermaid vs PlantUML arrows, erd vs Mermaid ER). Short, validated notes for the chosen engine fix that. All 24 doc examples render on Kroki (`npm run validate-docs`). | Notes must be maintained by hand. |
| Retrieve only within the selected engine | Notes from another engine would teach the wrong syntax. Filter first, then rank. | — |
| Local hashed TF-IDF embeddings | No downloads, no native modules, no API quota, deterministic. Each engine has only 3-7 chunks, so ranking is easy. | Weaker on synonyms than a neural model. Can be swapped in one file. |
| Brute-force cosine, JSON index | 74 chunks: a scan takes 0-1 ms. A vector DB adds ops cost with no gain. | Would not scale to millions of chunks (not needed). |
| RAG failure falls back to no-RAG | RAG is an improvement, not a dependency; the request must still work. | Silent quality drop, so it is logged as a warning. |
| Evaluation uses the same service as the API | So the numbers measure the real production path. | — |
| Code-only scoring | Reproducible and cheap: Kroki render success + required-element substring match. No LLM judge bias or extra quota. | Does not judge layout or semantic correctness of relationships. |
| Append-only results file | A run can stop (quota, crash) and resume without redoing or faking anything. | — |

## 4. Likely interview questions

**Q: Walk me through what happens when I call /api/generate-image.**
See section 2. In one line: validate → retrieve syntax notes for that engine → build prompt →
Gemini (paced, with retries) → extract code block → Kroki renders SVG → return code + SVG.

**Q: Why RAG here? The model already knows Mermaid.**
It knows Mermaid well, but it is weaker on niche engines (erd, seqdiag, blockdiag, nomnoml,
Structurizr) and often mixes syntaxes. RAG gives it the exact rules and a valid example of the
selected engine. The evaluation measures whether that actually helps; see the README for the
real numbers, including where it did not help.

**Q: Why not a vector database like Pinecone?**
74 small chunks. A linear scan is instant, and a hosted DB adds latency, cost, a network
dependency and another secret. If the corpus grew to many thousands of chunks I would move to
an approximate-nearest-neighbour index (e.g. HNSW, or pgvector since there is already a DB).

**Q: Those are not "real" embeddings.**
They are sparse TF-IDF vectors with feature hashing, a classic embedding. For this corpus the
query and the right chunk share obvious words ("class", "inheritance", "foreign key",
"sequence"), and the search is already restricted to one engine. Tests check the right chunk
ranks first. The embedder is isolated in `services/rag/embedder.js`, so a local neural model
(transformers.js + MiniLM) could replace it without touching the retriever.

**Q: How do you make sure retrieval does not mix engines?**
The retriever filters by `engine` before ranking. A test runs a query against all 15 engines
and asserts every returned chunk belongs to the requested engine.

**Q: What happens if Gemini is down or rate limited?**
Timeouts and 5xx are retried with exponential backoff (1 s, 2 s, 4 s, up to 15 s). 429 moves
to another key and honours the `retryDelay` hint. After the retries are used up the user gets a
clear status: 504 (timeout), 502 (upstream error) or 429 (quota exhausted). A 400 is never
retried. All of this is unit-tested with a mocked `fetch`.

**Q: How do you avoid leaking the API key?**
Keys live only in `.env` (gitignored); `.env.example` has placeholders. The key goes in the
`x-goog-api-key` header, not the URL, so it does not show up in URL logs. Any error text is passed
through `redact()`, which removes every configured key. Logs show the key slot number (1, 2, 3)
only. A test asserts a key never appears in an error message.

**Q: How did you evaluate, and how do you know the numbers are honest?**
30 fixed prompts (6 per diagram type, 10 engines), written and committed before the first run.
Same model, same prompts, RAG off then on. Each output is rendered by Kroki and scored by code.
Failed LLM calls count as failures. Every call is fresh (there is no response cache). Results are
saved per prompt with the generated code, so anyone can re-check them. The report records the
model, date, git commit and the test-set hash.

**Q: What are the weaknesses of your scoring?**
Render success only means "valid syntax", not "good diagram". Element coverage is a substring
check, so it can be fooled (an element named in a comment counts) and it does not check that
relationships are right. 30 prompts is small; a difference of one or two prompts is noise.
Temperature is 0.2, so reruns vary a little.

**Q: Why does latency go up with RAG?**
In our run it did not: measured latency went down, but that came from Gemini load and 503
retries during the RAG-off pass, not from RAG. In principle RAG adds about 450 prompt tokens
(+42%), which costs a little reading time. Retrieval itself takes 0-1 ms (a few ms on the
first call while the index loads).

**Q: What did RAG actually improve?**
Render success went from 27/30 to 30/30. All three fixed cases were syntax errors (a PlantUML
sequence, a Mermaid sequence with an invalid arrow, a nomnoml class diagram). Element
coverage stayed at 99.4%, because RAG teaches syntax, not content. With 30 prompts that is
3 prompts, so it is a positive signal, not a proof.

**Q: How would you change the LLM provider?**
Rewrite `services/llm.services.js` to call the new API but keep the same function signature
and return shape (`text`, `usage`, `latencyMs`). Update `LLM_CONFIG` in `config/env.js`.
Nothing else changes; the tests for the switch and scoring stay valid.

**Q: How would you scale this?**
Stateless Express servers behind a load balancer; move the pacing/rate state to Redis so it is
shared; self-host Kroki to remove the public dependency; add a response cache keyed by
(engine, prompt, model) for repeated prompts (switched off for evaluation).

**Q: What would you do next?**
Self-correction loop: if Kroki rejects the code, send the Kroki error back to the model once
and ask for a fix. Add more test prompts per engine. Try a neural embedder and compare it with the
same evaluation command.
