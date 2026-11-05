# Evaluation report: RAG off vs RAG on

- Model: `gemini-3.5-flash-lite` (gemini, temperature 0.2)
- Run started: 2026-11-05T06:49:55.505Z; report generated: 2026-11-05T06:53:48.926Z
- Git commit at run start: `b55cf7fde3bc49ddc1a4cb586a46435794e47190` (feature/single-llm-rag-eval)
- Test set: 30 prompts, sha256 `b6660cc8eb3dcb62`
- RAG top-k: 3; status: complete

## Comparison

| Metric | RAG off | RAG on | Change |
|---|---|---|---|
| Render success | 27/30 (90.0%) | 30/30 (100.0%) | +10.0 pts |
| Avg required-element coverage | 99.4% | 99.4% | +0.0 pts |
| Full coverage (all elements) | 29/30 | 29/30 | |
| LLM call failures | 0 | 0 | |
| Avg latency | 3274 ms | 2053 ms | -1221 ms |
| p95 latency | 7871 ms | 3518 ms | -4353 ms |
| Prompt tokens (total) | 32305 | 45774 | +13469 |
| Output tokens (total) | 7348 | 7303 | -45 |
| Thinking tokens (total) | 0 | 0 | |
| All tokens (total) | 39653 | 53077 | +13424 |
| Avg prompt tokens per call | 1077 | 1526 | |

## Per engine

| engine | n | Render off | Render on | Coverage off | Coverage on | Avg latency off | Avg latency on |
|---|---|---|---|---|---|---|---|
| blockdiag | 1 | 1/1 | 1/1 | 100.0% | 100.0% | 1227 ms | 2002 ms |
| c4plantuml | 2 | 2/2 | 2/2 | 100.0% | 100.0% | 1830 ms | 2269 ms |
| d2 | 3 | 3/3 | 3/3 | 100.0% | 100.0% | 3698 ms | 2632 ms |
| erd | 2 | 2/2 | 2/2 | 100.0% | 100.0% | 2968 ms | 1277 ms |
| graphviz | 3 | 3/3 | 3/3 | 100.0% | 100.0% | 2328 ms | 1981 ms |
| mermaid | 8 | 7/8 | 8/8 | 100.0% | 100.0% | 2692 ms | 1635 ms |
| nomnoml | 2 | 1/2 | 2/2 | 100.0% | 100.0% | 4928 ms | 2526 ms |
| plantuml | 5 | 4/5 | 5/5 | 100.0% | 100.0% | 3710 ms | 1724 ms |
| seqdiag | 2 | 2/2 | 2/2 | 91.7% | 91.7% | 5782 ms | 2798 ms |
| structurizr | 2 | 2/2 | 2/2 | 100.0% | 100.0% | 3912 ms | 3158 ms |

## Per category

| category | n | Render off | Render on | Coverage off | Coverage on | Avg latency off | Avg latency on |
|---|---|---|---|---|---|---|---|
| architecture | 6 | 6/6 | 6/6 | 100.0% | 100.0% | 2636 ms | 2786 ms |
| er | 6 | 6/6 | 6/6 | 100.0% | 100.0% | 4580 ms | 1656 ms |
| flowchart | 6 | 6/6 | 6/6 | 100.0% | 100.0% | 2537 ms | 1918 ms |
| sequence | 6 | 4/6 | 6/6 | 97.2% | 97.2% | 3375 ms | 1996 ms |
| uml | 6 | 5/6 | 6/6 | 100.0% | 100.0% | 3244 ms | 1911 ms |

## Per test

| Test | Engine | Render off | Render on | Coverage off | Coverage on | Missing (on) | Error (on) |
|---|---|---|---|---|---|---|---|
| er-01 | erd | yes | yes | 100.0% | 100.0% |  |  |
| er-02 | erd | yes | yes | 100.0% | 100.0% |  |  |
| er-03 | mermaid | yes | yes | 100.0% | 100.0% |  |  |
| er-04 | mermaid | yes | yes | 100.0% | 100.0% |  |  |
| er-05 | d2 | yes | yes | 100.0% | 100.0% |  |  |
| er-06 | plantuml | yes | yes | 100.0% | 100.0% |  |  |
| fc-01 | mermaid | yes | yes | 100.0% | 100.0% |  |  |
| fc-02 | mermaid | yes | yes | 100.0% | 100.0% |  |  |
| fc-03 | graphviz | yes | yes | 100.0% | 100.0% |  |  |
| fc-04 | graphviz | yes | yes | 100.0% | 100.0% |  |  |
| fc-05 | d2 | yes | yes | 100.0% | 100.0% |  |  |
| fc-06 | blockdiag | yes | yes | 100.0% | 100.0% |  |  |
| sq-01 | seqdiag | yes | yes | 83.3% | 83.3% | authorization code |  |
| sq-02 | seqdiag | yes | yes | 100.0% | 100.0% |  |  |
| sq-03 | plantuml | yes | yes | 100.0% | 100.0% |  |  |
| sq-04 | plantuml | no | yes | 100.0% | 100.0% |  |  |
| sq-05 | mermaid | yes | yes | 100.0% | 100.0% |  |  |
| sq-06 | mermaid | no | yes | 100.0% | 100.0% |  |  |
| uml-01 | plantuml | yes | yes | 100.0% | 100.0% |  |  |
| uml-02 | plantuml | yes | yes | 100.0% | 100.0% |  |  |
| uml-03 | nomnoml | no | yes | 100.0% | 100.0% |  |  |
| uml-04 | nomnoml | yes | yes | 100.0% | 100.0% |  |  |
| uml-05 | mermaid | yes | yes | 100.0% | 100.0% |  |  |
| uml-06 | mermaid | yes | yes | 100.0% | 100.0% |  |  |
| arch-01 | c4plantuml | yes | yes | 100.0% | 100.0% |  |  |
| arch-02 | c4plantuml | yes | yes | 100.0% | 100.0% |  |  |
| arch-03 | structurizr | yes | yes | 100.0% | 100.0% |  |  |
| arch-04 | structurizr | yes | yes | 100.0% | 100.0% |  |  |
| arch-05 | d2 | yes | yes | 100.0% | 100.0% |  |  |
| arch-06 | graphviz | yes | yes | 100.0% | 100.0% |  |  |

## How scores are computed

- **renderSuccess**: Kroki returned 2xx with an <svg> document
- **elementCoverage**: share of requiredElements found in the generated code (case/punctuation-insensitive substring match)
- **latency**: LLM HTTP time (all attempts, excluding pacing and backoff waits) + retrieval time, successful calls only
- **failures**: failed LLM calls count as renderSuccess=false and coverage=0
- **cache**: no response cache exists in the app; every test makes a new LLM call and Kroki render

Raw per-prompt results (including generated code): `reports/evaluation/runs/gemini-3.5-flash-lite__b6660cc8/results.jsonl`
