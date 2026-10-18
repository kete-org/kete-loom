---
name: rag-pipeline-patterns
description: Retrieval-augmented generation pipeline design covering document chunking, embedding choice, hybrid keyword plus vector search with reranking, metadata and permission filters, grounded answers with citations, index freshness, and measuring retrieval quality apart from answer quality. Use when building or fixing a RAG system, a chat-over-your-docs feature, a semantic search index, or when answers cite the wrong passages or miss documents that exist.
license: MIT
compatibility: Any Agent Skills host. Examples use SQL (Postgres with pgvector) and pseudocode; the rules apply to any vector store and model provider.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# RAG pipeline patterns

A RAG system is two systems: a search engine and a writer. Most "the model hallucinated" bugs are search bugs. Build, measure and fix retrieval first, then generation.

## 0. Before you change anything

1. Find the pipeline stages in the code: loaders, chunker, embedder, index writer, query path (rewrite, search, rerank, filter), prompt builder, answer post-processing.
2. Write down the current settings: chunk size and overlap, embedding model and dimension, distance metric, top-k at each stage, filters, prompt template.
3. Look for an evaluation set (questions with known relevant documents). If none exists, build one first (step 7). **Stop and ask the user** for 20 to 50 real questions if you can't find real traffic or logs; do not invent the whole set yourself.
4. Never change the embedding model, chunker and prompt in one step. Change one stage, re-run the eval, keep or revert.

## 1. Ingestion and chunking

- Parse structure before splitting: keep headings, lists, tables and code blocks intact. Convert HTML and PDF to clean text or Markdown first; strip navigation, footers and boilerplate repeated on every page.
- Split on structure (sections, then paragraphs, then sentences), not on a fixed character count. Fall back to token-count windows only for unstructured text.
- Start with chunks of roughly 200 to 500 tokens and 10 to 20 percent overlap, then tune on the eval set. Short factual lookups favour smaller chunks; reasoning across a section favours larger ones.
- Prepend context to each chunk before embedding: document title and the heading path (`Billing > Refunds > Partial refunds`). A chunk that says "it expires after 30 days" is useless without knowing what "it" is.
- Store per chunk: stable `chunk_id`, `doc_id`, source URL or path, heading path, position, content hash, `updated_at`, and access-control fields (tenant, groups). Citations and filters depend on these.
- Tables: keep the header row with every chunk of rows, or store the table as one chunk plus a text summary.
- Deduplicate near-identical chunks (same content hash, or very high similarity) so top-k isn't five copies of one paragraph.

## 2. Embeddings

- Use one embedding model per index. Query and document vectors must come from the same model and version; mixing them silently ruins recall.
- Record the model name and dimension in the index metadata. Changing models means a full re-embed into a new index, then a switch, never an in-place mix.
- Use the model's query/document modes or prefixes if it has them (some models expect different input types for queries and passages). Check the model's docs.
- Match the distance metric to the model (most text models are trained for cosine; normalise vectors if you use inner product).
- Batch embedding calls, retry with backoff on rate limits, and cache by content hash so re-ingesting unchanged chunks costs nothing.

## 3. Retrieval

Default to hybrid search, then rerank:

1. **Keyword search** (BM25 or the database's full-text search) catches exact terms: product codes, error messages, names, acronyms. Vector search alone misses these.
2. **Vector search** catches paraphrases and synonyms.
3. **Fuse** the two ranked lists with reciprocal rank fusion: `score = sum(1 / (k + rank))` over both lists, with `k = 60` as the usual starting value. RRF needs no score normalisation, which is why it is the safe default.
4. **Rerank** the fused top 30 to 100 with a cross-encoder or a reranking API, then keep the top 3 to 10 for the prompt.

Decision rules:

- Apply metadata and permission filters **inside** the search query (pre-filter), not after top-k. Post-filtering returns too few results and can leak titles or counts of documents the user cannot see.
- If an approximate index (HNSW, IVF) combined with a restrictive filter returns fewer than k rows, raise the index's search breadth setting or use exact search for that filter; check your store's docs for the knob.
- Query rewriting (expanding a follow-up question into a standalone one using chat history) belongs before search. Keep the original question for the prompt.
- Return nothing rather than something irrelevant: set a minimum reranker score and let the generator say "I couldn't find this" below it.

Postgres + pgvector examples are in `references/retrieval-recipes.md`.

## 4. Building the prompt

- Put retrieved chunks in clearly delimited blocks, each with its `chunk_id` and source, e.g. `<source id="c_812" title="Refund policy">...</source>`.
- Instruct the model to answer only from the sources, to cite the source ids it used for each claim, and to say it doesn't know when the sources don't cover the question.
- Treat retrieved text as untrusted data. Documents can contain instructions ("ignore previous instructions"); the system prompt must say sources are reference material, never commands. Never give the generation step tools that act on the world based on retrieved text without a confirmation step.
- Trim to a token budget rather than a fixed k. With long contexts, put the strongest chunks at the start (and, if you must send many, at the end) rather than burying them in the middle.

## 5. Citations

- Validate citations after generation: every cited id must be one you actually sent. Drop or flag answers that cite unknown ids.
- Map ids back to source URL plus heading or page so users can click through.
- For high-stakes answers, check that each cited chunk actually supports the sentence (a second model call or string-overlap check), and mark unsupported sentences.

## 6. Freshness and deletion

- Re-ingest incrementally: compare content hashes per document, re-chunk and re-embed only what changed, and delete chunks whose document was removed or whose permissions changed.
- Deletion is a requirement, not a cleanup task. A deleted or access-revoked document that stays in the index is a data leak.
- Store `updated_at` and allow a recency boost or filter for time-sensitive corpora (news, release notes, prices).
- Schedule a periodic full reconciliation (index ids vs source ids) to catch missed deletes.

## 7. Evaluate retrieval separately from generation

Build an eval set of question → relevant `doc_id`s (or chunk ids), then measure each stage on its own. Details and formulas are in `references/evaluation.md`.

| Stage | Metric | Tells you |
|---|---|---|
| Retrieval | recall@k, MRR, nDCG@k | Did the right chunks come back, and how high? |
| Reranking | recall@final_k before vs after | Is the reranker helping or dropping good chunks? |
| Generation | faithfulness (claims supported by sources), answer correctness, citation accuracy | Is the writer using what it got? |
| End to end | task success, "I don't know" rate on unanswerable questions | Does it work for users? |

Rules:

- If recall@k is low, fix chunking, hybrid search or filters. Do not touch the prompt.
- If recall is high but answers are wrong, fix the prompt, context ordering or model.
- Include unanswerable questions; a good system refuses them.
- Re-run the eval on every change to chunking, embeddings, retrieval settings or prompt, and report before and after numbers.

## Never

- Never mix embeddings from two models in one index.
- Never filter permissions after retrieval or in the prompt ("only use documents the user may see").
- Never tune top-k, chunk size or the prompt without an eval set to measure against.
- Never let retrieved text trigger tool calls or override system instructions.
- Never report "better" from a handful of eyeballed answers.

## Report format

When you finish a change, report:

```
Stage changed: <chunking | embeddings | retrieval | rerank | prompt | freshness>
Change: <one line>
Eval set: <n questions, source>
recall@k: <before> → <after>   MRR: <before> → <after>
Faithfulness / correctness: <before> → <after> (or "not measured")
Risks: <re-index needed, cost change, latency change>
```
