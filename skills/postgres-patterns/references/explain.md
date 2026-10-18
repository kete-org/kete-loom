# Reading PostgreSQL plans

Run `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) <query>;` on a realistic copy. Add `SETTINGS` to show non-default planner settings. For a write, wrap it:

```sql
BEGIN;
EXPLAIN (ANALYZE, BUFFERS) UPDATE orders SET status = 'paid' WHERE id = 42;
ROLLBACK;
```

## What each number means

- `cost=startup..total`: planner estimate in arbitrary units. Compare only within one plan.
- `rows=`: estimated rows (first parenthesis) vs actual rows (`actual ... rows=`). A 10x or bigger gap means the planner is guessing; fix stats before anything else.
- `loops=`: how many times the node ran. Actual time and rows are **per loop**; multiply to get the total.
- `Buffers: shared hit=` pages found in cache, `read=` pages read from disk or OS cache, `dirtied`/`written` for writes.
- `Rows Removed by Filter`: rows read then discarded. Large numbers point to a missing or unusable index.

## Nodes and what they suggest

| Node | Usually fine when | Problem sign and fix |
|---|---|---|
| Seq Scan | small table, or most rows needed | big table, few rows returned: add an index matching the filter |
| Index Scan | selective filter | many loops inside a nested loop: check join order and estimates |
| Index Only Scan | `Heap Fetches` near 0 | high `Heap Fetches`: table needs `VACUUM` so the visibility map is current |
| Bitmap Heap Scan | medium selectivity | `Recheck Cond` removing many rows with `lossy` blocks: raise `work_mem` for that query |
| Nested Loop | outer side small | outer side large because of a bad estimate: fix stats or rewrite |
| Hash Join | medium/large inputs | `Batches` > 1: hash spilled to disk, raise `work_mem` for that session |
| Merge Join | both inputs already sorted | an explicit `Sort` below it on a huge input |
| Sort | `Sort Method: quicksort Memory` | `external merge Disk`: add an index matching `ORDER BY`, or raise `work_mem` locally |
| Limit + Sort | top-N heapsort | scanning the whole table to return 10 rows: index on the sort key |

## Fixing bad estimates

1. `ANALYZE table_name;` then re-plan.
2. Correlated columns (`city`, `postcode`): `CREATE STATISTICS s (dependencies, ndistinct) ON city, postcode FROM addresses; ANALYZE addresses;`
3. Skewed column: `ALTER TABLE t ALTER COLUMN c SET STATISTICS 1000; ANALYZE t;`
4. Generic plan for prepared statements chose badly: test with literal values, and consider `plan_cache_mode = force_custom_plan` for that session only.

## Non-sargable predicates and rewrites

| Slow form | Index-friendly form |
|---|---|
| `WHERE date(created_at) = '2024-01-01'` | `WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02'` |
| `WHERE lower(email) = $1` with a plain index | expression index `ON users (lower(email))` |
| `WHERE id::text = $1` | compare with the column's own type |
| `WHERE a = $1 OR b = $1` | two indexed queries joined with `UNION` (or rely on a BitmapOr if both are indexed) |
| `ORDER BY id LIMIT 20 OFFSET 100000` | keyset: `WHERE id > $last_id ORDER BY id LIMIT 20` |
| `NOT IN (subquery)` with nullable column | `NOT EXISTS (...)` (also correct with NULLs) |

## Finding the slow queries

```sql
-- needs the pg_stat_statements extension
SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time, 1) AS mean_ms, query
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;
```

`auto_explain` (with `auto_explain.log_min_duration`) logs plans of slow statements as they run in staging or production.
