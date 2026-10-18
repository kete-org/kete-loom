---
name: clickhouse-patterns
description: ClickHouse table and query design for analytics, choosing a MergeTree family engine, ordering the sorting key for the filters that matter, keeping partitions coarse, building incremental and refreshable materialised views, batching or async-inserting writes to avoid too many parts, and reading EXPLAIN and system tables to make slow queries fast. Use when creating or changing ClickHouse tables, ingesting events into ClickHouse, a ClickHouse query scans too many rows, or deduplication and rollups give unexpected results.
license: MIT
compatibility: Any Agent Skills host. SQL runs in clickhouse-client or any ClickHouse driver. ClickHouse Cloud uses SharedMergeTree under the same MergeTree syntax; self-hosted replication uses Replicated* engines.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "clickhouse-client"
  kete-loom/owner: "Kete-org"
---

# ClickHouse patterns

ClickHouse is fast when it reads few granules of few columns, and when it receives few, large inserts. Almost every problem is a sorting key, a partition key or an insert pattern that breaks one of those. Engine details and view recipes are in `references/engines-and-views.md`.

## 0. Before you start

1. Get the version and deployment: `SELECT version()`, and whether it's ClickHouse Cloud, a single server, or a replicated cluster (`SELECT * FROM system.clusters`). Use the engine family the existing tables use.
2. Read the current table: `SHOW CREATE TABLE db.events`. Never guess the sorting key.
3. List the top queries the table must serve: which columns they filter on, group by and return, and the time range. If the table already exists, pull them from `system.query_log` (see section 5). If you can't get them, **stop and ask the user**; the sorting key depends on them.
4. The sorting key and partition key can't be changed in place. Changing them means a new table and a backfill (`INSERT INTO new SELECT * FROM old`, in chunks). Agree that plan with the user before starting.
5. Never run `DROP TABLE`, `TRUNCATE`, `ALTER TABLE ... DROP PARTITION`, `ALTER TABLE ... DELETE/UPDATE` or `OPTIMIZE ... FINAL` on a shared or production server without explicit approval. Mutations rewrite whole parts and can run for hours.

## 1. Sorting key (ORDER BY)

The sorting key decides how much data a query can skip. The primary index is sparse: one entry per granule (8192 rows by default).

1. Start with the columns most queries filter on with equality, usually a tenant, project or event type.
2. Order them from **low to high cardinality**: `ORDER BY (tenant_id, event_type, toDate(ts), user_id)`. Low-cardinality leading columns also compress better.
3. Put the time column after the equality filters, at the coarsest grain the queries need (`toDate(ts)` or `toStartOfHour(ts)` rather than the raw timestamp), unless queries are mainly time-range scans across all tenants.
4. Keep it to about four or five columns. Columns no query filters on don't belong in it.
5. `PRIMARY KEY` defaults to `ORDER BY`. Make it a shorter prefix only if the index is too big to keep in memory.

Check a query's pruning with `EXPLAIN indexes = 1 SELECT ...`: compare `Granules: selected/total` for the primary key. A query that selects most granules needs a different key, a projection, or a skip index.

## 2. Partitions

- Partitioning is for **data management** (dropping or moving old data, TTL), not for speed.
- Use a coarse key, usually `PARTITION BY toYYYYMM(ts)`, or none at all for small tables. Keep the number of partitions well under about 1000.
- Never partition by a high-cardinality column (user ID, raw timestamp, day across many years): every insert touching many partitions creates many parts and ends in `Too many parts` errors.
- Expire data with `TTL ts + INTERVAL 90 DAY`; whole expired partitions are dropped cheaply, especially with `ttl_only_drop_parts = 1`.

## 3. Inserts

- Insert in **batches of at least 1,000 rows, ideally 10,000 to 100,000**, at about one insert per second per table or less. Each insert creates at least one part per partition it touches.
- When many clients send small writes (events from apps, logs), enable server-side buffering instead of building a batcher: `SETTINGS async_insert = 1, wait_for_async_insert = 1`. Keep `wait_for_async_insert = 1` so errors reach the client.
- Inserts are retried safely when the same block is resent to a replicated or Cloud table: identical blocks are deduplicated. Keep retries byte-identical (same rows, same order).
- Use the native or RowBinary formats from drivers for throughput; JSONEachRow is fine for moderate volumes.
- Watch part counts: `SELECT table, partition, count() FROM system.parts WHERE active GROUP BY table, partition ORDER BY count() DESC`. Hundreds of active parts in one partition means inserts are too small or too spread out.

## 4. Column types

- Use the smallest type that fits (`UInt32` not `Int64` for counts, `Date` when you don't need time, `DateTime64(3)` for milliseconds).
- `LowCardinality(String)` for strings with fewer than about 10,000 distinct values (country, status, event name).
- Avoid `Nullable` unless "unknown" is different from a default; it adds a hidden column and slows queries. Use `DEFAULT` values.
- Use `Decimal` for money. Add codecs (`CODEC(Delta, ZSTD)` for monotonic timestamps and counters) only after checking `system.columns` compression ratios.
- Use `Map`, `Tuple`, `JSON` or a `String` column with JSON functions for semi-structured data, and pull hot fields into real columns (`MATERIALIZED JSONExtractString(raw, 'path')`).

## 5. Query optimisation

1. Find the slow queries:
   ```sql
   SELECT query, query_duration_ms, read_rows, formatReadableSize(read_bytes) AS read, memory_usage
   FROM system.query_log
   WHERE type = 'QueryFinish' AND event_time > now() - INTERVAL 1 DAY
   ORDER BY read_bytes DESC LIMIT 20
   ```
2. Read fewer columns: never `SELECT *` in production queries.
3. Filter on sorting-key columns, in key order. ClickHouse moves selective filters to `PREWHERE` on its own; check with `EXPLAIN`.
4. For a second access path, add a **projection** (`ALTER TABLE t ADD PROJECTION p (SELECT * ORDER BY user_id)`, then `ALTER TABLE t MATERIALIZE PROJECTION p` to build it for existing parts; that is a mutation, so ask first on production) or a materialised view into a table with a different key. For needle-in-haystack filters, a skip index (`INDEX idx col TYPE bloom_filter GRANULARITY 4`) can help; prove it with `EXPLAIN indexes = 1`.
5. Joins: put the smaller table on the right side, filter both sides before joining, and use dictionaries (`dictGet`) for dimension lookups.
6. Use `uniq` instead of `uniqExact` and `quantile` instead of `quantileExact` when approximate is acceptable; say so to the user.
7. Pre-aggregate dashboards with a materialised view (section 6) instead of scanning raw events on every page load.

## 6. Materialised views and rollups

- An **incremental** materialised view (`CREATE MATERIALIZED VIEW mv TO target AS SELECT ...`) is an insert trigger: it processes only blocks inserted into the source after it is created. It does **not** see existing rows; backfill them with an explicit `INSERT INTO target SELECT ...`.
- Always use `TO <target table>` so you control the target's engine, key and TTL.
- Rollups into `SummingMergeTree` or `AggregatingMergeTree` are merged in the background, so rows for one key may exist several times. Queries must still aggregate (`sum(...)`, `uniqMerge(...)` with `GROUP BY`).
- A **refreshable** materialised view (`REFRESH EVERY 1 HOUR`) re-runs a full query on a schedule; use it for joins and heavy reports where incremental logic is wrong.
- `ReplacingMergeTree` deduplicates rows with the same sorting key only during merges, at an unknown time. Read with `FINAL` or `argMax(..., version)` per key when you need the latest row.

## Never

- Insert one row per request without async inserts.
- Use `ALTER TABLE ... UPDATE` as a normal write path; model changes as new rows (ReplacingMergeTree, versioned rows) or use lightweight `DELETE FROM` sparingly.
- Run `OPTIMIZE TABLE ... FINAL` on a schedule to "fix" duplicates; fix the query instead.
- Claim a speedup without `read_rows` and `query_duration_ms` before and after.

## Report format (when reviewing)

```
ClickHouse review: <tables or queries>
Deployment/version: <Cloud | single | replicated>, <version>
Findings:
1. [severity] <table or file:line>: <problem> → <fix>
Evidence: <query> read_rows / granules selected / duration, before → after
Not verified: <anything you could not run>
```
