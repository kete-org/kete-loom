# Reading MySQL EXPLAIN

## Traditional EXPLAIN columns

| Column | Meaning | Watch for |
|---|---|---|
| `type` | access method, best to worst: `system`, `const`, `eq_ref`, `ref`, `range`, `index`, `ALL` | `ALL` (full table scan) or `index` (full index scan) on a large table |
| `possible_keys` | indexes the optimizer considered | `NULL`: no usable index for this predicate |
| `key` | index chosen | `NULL` while `possible_keys` is set: optimizer judged the index not selective, or stats are stale |
| `key_len` | bytes of the index key used | shorter than expected: only the leftmost columns are used; a range stopped the rest |
| `rows` | estimated rows examined | far larger than the result |
| `filtered` | % of rows kept after the condition | low % with high `rows`: index doesn't match the filter |
| `Extra` | notes | `Using filesort`, `Using temporary`, `Using where` on a scan; `Using index` is good (covering) |

## EXPLAIN ANALYZE and FORMAT=TREE

`EXPLAIN FORMAT=TREE` shows the iterator tree. `EXPLAIN ANALYZE` runs the query and adds `actual time=first..last rows=N loops=L`. Compare estimated rows with actual rows; times are per loop. MariaDB's equivalent is `ANALYZE <statement>` (and `ANALYZE FORMAT=JSON`). Check which your server supports.

## Common fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `key = NULL`, `WHERE DATE(created_at) = ?` | function on column | range: `created_at >= ? AND created_at < ?` |
| `key = NULL`, `WHERE phone = 233201234567` on a `VARCHAR` | implicit numeric cast | pass a string |
| join not using index | charset or collation mismatch between columns | align both columns |
| `Using filesort` with `ORDER BY created_at LIMIT 20` | index doesn't end in the sort column | composite `(filter_cols..., created_at)` |
| `Using temporary` for `GROUP BY` | no index in group order | index on group columns, or accept for rare queries |
| estimate way off | stale stats | `ANALYZE TABLE t;` (cheap on InnoDB) |
| deep pagination slow | `OFFSET` reads and discards rows | keyset: `WHERE id > ? ORDER BY id LIMIT 20` |

## Finding slow queries

- Slow query log: `slow_query_log = ON`, `long_query_time = 1`, then summarise with `pt-query-digest`.
- MySQL 8 `sys.statements_with_runtimes_in_95th_percentile` and `performance_schema.events_statements_summary_by_digest` rank statements by total time.
