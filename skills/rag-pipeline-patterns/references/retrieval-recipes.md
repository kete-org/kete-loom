# Retrieval recipes (Postgres + pgvector)

Read this when the project stores vectors in Postgres. The patterns carry over to other stores; check that store's docs for the equivalent syntax.

## Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  chunk_id     text PRIMARY KEY,
  doc_id       text NOT NULL,
  tenant_id    text NOT NULL,
  heading_path text,
  content      text NOT NULL,
  content_hash text NOT NULL,
  updated_at   timestamptz NOT NULL,
  embedding    vector(1024) NOT NULL,          -- dimension of YOUR model; HNSW on `vector` indexes up to 2,000 dims
  tsv          tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks USING gin (tsv);
CREATE INDEX ON chunks (tenant_id);
```

pgvector distance operators: `<=>` cosine distance, `<->` Euclidean (L2), `<#>` negative inner product. The index operator class must match the operator you query with (`vector_cosine_ops` for `<=>`).

## Hybrid search with reciprocal rank fusion

```sql
WITH vec AS (
  SELECT chunk_id, row_number() OVER (ORDER BY embedding <=> $1) AS rank
  FROM chunks
  WHERE tenant_id = $2                      -- pre-filter: permissions first
  ORDER BY embedding <=> $1
  LIMIT 50
),
kw AS (
  SELECT chunk_id,
         row_number() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS rank
  FROM chunks, websearch_to_tsquery('english', $3) q
  WHERE tenant_id = $2 AND tsv @@ q
  ORDER BY ts_rank_cd(tsv, q) DESC
  LIMIT 50
)
SELECT c.chunk_id, c.doc_id, c.heading_path, c.content,
       COALESCE(1.0 / (60 + vec.rank), 0) + COALESCE(1.0 / (60 + kw.rank), 0) AS rrf
FROM vec FULL OUTER JOIN kw USING (chunk_id)
JOIN chunks c USING (chunk_id)
ORDER BY rrf DESC
LIMIT 40;   -- send these to the reranker
```

`$1` is the query embedding, `$2` the caller's tenant, `$3` the raw query text.

## Filtered approximate search

With a selective filter, HNSW may return fewer than `LIMIT` rows because the filter is applied after the index scan. Two knobs, both set per query inside a transaction:

- `SET LOCAL hnsw.ef_search = 200;` widens the candidate list (default 40).
- From pgvector 0.8.0: `SET LOCAL hnsw.iterative_scan = relaxed_order;` (or `strict_order`) keeps scanning the index until enough rows pass the filter. IVFFlat uses `ivfflat.iterative_scan`.

Check the installed version (`SELECT extversion FROM pg_extension WHERE extname = 'vector';`) before relying on iterative scans. For a very selective filter (one small tenant), a partial index or exact search on that subset can beat both.

## Incremental re-ingest

```
for each source document:
    new_hash = hash(normalised text)
    if new_hash == stored doc hash: skip
    chunks = chunk(document)
    upsert chunks by chunk_id (re-embed only chunks whose content_hash changed)
    delete chunks for this doc_id whose chunk_id is not in the new set
for each doc_id in index but not in source: delete its chunks
```

Run the delete pass in the same job as the upsert pass so a failure can't leave removed documents searchable.
