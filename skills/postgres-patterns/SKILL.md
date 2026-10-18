---
name: postgres-patterns
description: PostgreSQL schema, indexing and query-tuning guide covering data types and constraints, btree, partial, expression and GIN indexes, reading EXPLAIN (ANALYZE, BUFFERS) plans, isolation levels and lock conflicts, JSONB modelling, PgBouncer connection pooling, and pg_dump or point-in-time backups. Use when designing Postgres tables, a Postgres query is slow, you need to pick an index type, decode a lock wait or deadlock, store documents in JSONB, or set up pooling and backups for a PostgreSQL database.
license: MIT
compatibility: Any Agent Skills host. Running queries needs psql or the project's database client and a reachable PostgreSQL server; never point it at production without the user's say-so.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "psql"
  kete-loom/owner: "Kete-org"
---

# PostgreSQL patterns

Design tables the database can enforce, index for the queries you actually run, and prove every tuning change with a plan. For changing a live schema step by step, use the `database-migrations` skill; for MySQL or MariaDB, use `mysql-patterns`.

## 0. Before you start

1. Find the server version (`SELECT version();`) and how the app connects (ORM, driver, pooler). Advice differs across major versions; check the docs for that version.
2. Ask which environment you may query. Run `EXPLAIN ANALYZE` only on a dev or staging copy unless the user agrees: it **executes** the statement, including writes.
3. Wrap any `EXPLAIN ANALYZE` of an `INSERT`, `UPDATE` or `DELETE` in `BEGIN; ... ROLLBACK;`.

## 1. Schema design rules

- Primary keys: `bigint GENERATED ALWAYS AS IDENTITY`, or `uuid` when IDs are made outside the database. Never `serial` in new code, never `int` for a table that can grow past 2 billion rows.
- Time: `timestamptz`, stored in UTC. Never `timestamp` without time zone for events.
- Money: `numeric(p, s)` or integer minor units. Never `float`/`double precision`, never the `money` type.
- Text: `text` with a `CHECK (char_length(col) <= n)` when a limit is a business rule. `varchar(n)` is fine; `char(n)` is not.
- Enumerations: a lookup table or a `CHECK (status IN (...))`. Native `enum` types are hard to shrink later.
- Constraints are the schema: `NOT NULL` by default, `UNIQUE` for natural keys, `FOREIGN KEY` for every reference, `CHECK` for invariants. App-only validation drifts.
- Index every foreign key column you join or delete through. Postgres does not create them for you, and an unindexed FK makes parent deletes scan the child table.
- Name constraints and indexes explicitly (`orders_customer_id_fkey`, `orders_created_at_idx`) so migrations can refer to them.

## 2. Pick the index

| Query shape | Index |
|---|---|
| `=`, `<`, `>`, `BETWEEN`, `ORDER BY`, `LIKE 'abc%'` (C collation or `text_pattern_ops`) | btree (default) |
| Filter always on a subset (`WHERE deleted_at IS NULL`, `status = 'pending'`) | partial btree: `CREATE INDEX ... WHERE status = 'pending'` |
| Filter on a function (`lower(email)`, `(data->>'sku')`) | expression index on exactly that expression |
| JSONB containment `@>`, key exists `?`, arrays `&&`/`@>`, full-text `@@` | GIN (`jsonb_path_ops` when you only need `@>` and jsonpath) |
| Substring / fuzzy text `ILIKE '%abc%'` | GIN with `pg_trgm` (`gin_trgm_ops`) |
| Huge append-only table filtered by time | BRIN on the time column |
| Ranges, geometry, exclusion constraints | GiST |

Rules:

1. Multicolumn btree: equality columns first, then the range or sort column. `(tenant_id, created_at)` serves `WHERE tenant_id = $1 ORDER BY created_at DESC`.
2. Use `INCLUDE (...)` to make an index covering for an index-only scan, instead of adding columns to the key.
3. Every index costs writes, disk and vacuum time. Check `pg_stat_user_indexes.idx_scan` before adding more; drop indexes that stay at 0 on the primary and every replica (stats are per server), except ones that back a `UNIQUE` or primary key constraint.
4. On a table with live traffic, build with `CREATE INDEX CONCURRENTLY` (not inside a transaction). If it fails it leaves an `INVALID` index: drop it and retry.

## 3. Tune a slow query

1. Get the exact statement and real parameter values. Check `pg_stat_statements` for total and mean time if it is installed.
2. Run `EXPLAIN (ANALYZE, BUFFERS) <query>` on a realistic copy.
3. Read the plan bottom-up. Look for: estimated vs actual rows off by 10x or more, `Seq Scan` on a big table with a selective filter, `Rows Removed by Filter` much larger than rows returned, `Sort` with `external merge`, nested loops with a high `loops` count.
4. Fix the cause, in this order: stale stats (`ANALYZE table`), a missing or wrong index, a non-sargable predicate (function on the column, implicit cast, leading `%`), then query shape (`EXISTS` instead of `IN` with a big subquery, keyset pagination instead of big `OFFSET`).
5. Re-run the same `EXPLAIN` and compare time and buffers. Report before and after.

Plan-node reference and worked examples: `references/explain.md`.

## 4. Transactions, isolation and locks

- Default isolation is `READ COMMITTED`: each statement sees a fresh snapshot. Read-then-write logic (check balance, then update) needs `SELECT ... FOR UPDATE`, a guarded `UPDATE ... WHERE balance >= $1`, or `SERIALIZABLE`.
- `REPEATABLE READ` and `SERIALIZABLE` can fail with SQLSTATE `40001`. The app **must** retry the whole transaction; if it can't, don't use them.
- Lock rows in a consistent order (for example by primary key) to avoid deadlocks (`40P01`).
- Queues: `SELECT ... FOR UPDATE SKIP LOCKED LIMIT n` lets several workers claim jobs without blocking each other.
- Keep transactions short. Never hold one open across a network call or user think-time. Set `idle_in_transaction_session_timeout` so a stuck client can't hold locks for hours.
- Upserts: `INSERT ... ON CONFLICT (key) DO UPDATE` instead of select-then-insert.
- Diagnose waits with `pg_stat_activity` (`wait_event_type = 'Lock'`) and `pg_blocking_pids(pid)`. Queries: `references/locks.md`.

## 5. JSONB

- Use JSONB for genuinely variable attributes, payload archives and sparse settings. Columns you filter, join or constrain on every request belong in real columns.
- Index what you query: GIN for `@>`; an expression btree for one hot key (`((data->>'customer_id'))`).
- Validate shape with `CHECK (jsonb_typeof(data->'items') = 'array')` or in the app; Postgres won't do it otherwise.
- Updating one key rewrites the whole value. Large, frequently updated documents bloat the table.

## 6. Connections and pooling

- Each connection is a backend process. Keep the total across all app instances small (a rule of thumb is a few connections per database CPU core; measure from there), not one per request thread.
- Put PgBouncer (or the platform's pooler) in front when many app instances or serverless functions connect. In `transaction` pool mode, session state does not survive between transactions: no session `SET`, advisory session locks, `LISTEN`, or temp tables across transactions. Server-side prepared statements need pooler support (PgBouncer 1.21+ `max_prepared_statements`) or must be disabled in the driver.
- Set `statement_timeout` per role or per request for web traffic so a runaway query can't pin a connection.

## 7. Backups

- Logical: `pg_dump -Fc dbname > db.dump`, restore with `pg_restore -d target db.dump`. Good for small databases and moving data between versions.
- Physical with point-in-time recovery: a base backup (`pg_basebackup` or a tool such as pgBackRest or WAL-G) plus continuous WAL archiving. Use this for production.
- A backup you have never restored is not a backup. Schedule a restore test and record how long it takes.
- Managed services: confirm the retention window and PITR setting rather than assuming.

## Never

- Never run `EXPLAIN ANALYZE`, `VACUUM FULL`, `REINDEX` without `CONCURRENTLY`, or any DDL against production without the user's explicit go-ahead.
- Never disable a constraint or trigger to make a load "faster" without a plan to re-validate.
- Never build SQL by string concatenation with user input. Use bind parameters.
- Never change a `postgresql.conf` setting without stating the old value, the new value and how to revert.

## Report back

For a tuning task: the query, the plan's key problem (one line), the change made, before and after timings and buffers, and anything you could not test. For a design task: the DDL, one line per non-obvious choice, and the indexes with the query each one serves.
