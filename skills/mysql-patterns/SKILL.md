---
name: mysql-patterns
description: MySQL and MariaDB on InnoDB, covering clustered primary keys and secondary index design, reading EXPLAIN and EXPLAIN ANALYZE output, utf8mb4 character sets and collations, REPEATABLE READ with gap and next-key locks, deadlock diagnosis, online DDL algorithms, and stale reads from lagging replicas. Use when creating or tuning MySQL or MariaDB tables, a MySQL query is slow, emoji or accented text is mangled, InnoDB lock waits or deadlocks appear, or reads from a replica return outdated data.
license: MIT
compatibility: Any Agent Skills host. Running queries needs the mysql or mariadb client and a reachable server; never point it at production without the user's say-so.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "mysql"
  kete-loom/owner: "Kete-org"
---

# MySQL and MariaDB patterns

InnoDB stores each table as a btree ordered by its primary key, so key choice drives everything else. Design for that, check every query with `EXPLAIN`, and assume replicas are behind. For step-by-step live schema changes use the `database-migrations` skill; for PostgreSQL use `postgres-patterns`.

## 0. Before you start

1. Identify the server: `SELECT VERSION();`. MySQL and MariaDB have diverged (optimizer, JSON, defaults, replication syntax). Check that product's docs for its version before giving version-specific advice.
2. Check the engine: `SHOW TABLE STATUS WHERE Name = 't';`. Everything here assumes InnoDB. If you find MyISAM, tell the user: it has no transactions or row locks.
3. Ask which environment you may query. `EXPLAIN ANALYZE` **executes** the statement.

## 1. Schema rules for InnoDB

- Primary key: short and monotonic, usually `BIGINT UNSIGNED AUTO_INCREMENT`. Every secondary index stores the primary key, so a wide PK makes every index wide. Random UUID v4 PKs scatter inserts across pages; if you need UUIDs, store them as `BINARY(16)` and prefer a time-ordered variant.
- Always declare a primary key. Without one InnoDB invents a hidden one you can't use, and row-based replication of updates gets slow.
- Money: `DECIMAL(p, s)` or integer minor units, never `FLOAT`/`DOUBLE`.
- Time: `DATETIME` for business dates you store in UTC; `TIMESTAMP` converts through the session time zone and has a 2038 upper limit. Pick one convention and set the connection time zone explicitly.
- Booleans are `TINYINT(1)`; enumerations a lookup table or `ENUM` only if the set truly never changes.
- Turn on strict mode (`sql_mode` containing `STRICT_TRANS_TABLES`), so bad data errors instead of being silently truncated. Check the server's current value before assuming.
- Declare foreign keys: InnoDB creates an index on the FK column if none exists, and enforces the reference.

## 2. Character sets and collations

1. Use `utf8mb4` everywhere: server, database, table, column **and** connection. `utf8`/`utf8mb3` stores at most 3 bytes per character, so emoji and some CJK characters fail or turn into `?`.
2. Check all layers:
   ```sql
   SHOW VARIABLES LIKE 'character_set_%';
   SHOW VARIABLES LIKE 'collation_%';
   SHOW CREATE TABLE t;
   ```
   The driver must also connect with `utf8mb4` (connection option `charset=utf8mb4` or the driver's equivalent).
3. Collation decides equality and sorting: `_ci` is case-insensitive, `_as`/`_ai` accent sensitive or insensitive, `_bin` byte-exact. A unique index on a `_ci` column rejects `Bob` when `bob` exists. Use a `_bin` or `_cs` collation where case matters (tokens, codes).
4. Joining columns with different charsets or collations disables index use on one side and can raise `Illegal mix of collations`. Make them match.
5. Converting a table (`ALTER TABLE t CONVERT TO CHARACTER SET utf8mb4 COLLATE ...`) rebuilds it and can lengthen index keys. Plan it as a migration, not a quick fix.

## 3. Index design

1. Composite index order: equality columns first, then one range or sort column. `(tenant_id, status, created_at)` serves `WHERE tenant_id = ? AND status = ? ORDER BY created_at`.
2. Leftmost prefix rule: an index on `(a, b, c)` helps queries on `a`, `a, b` and `a, b, c`, not `b` alone.
3. A covering index (all selected columns in the index) shows `Using index` in `EXPLAIN` and skips the table lookup.
4. Don't index low-cardinality columns alone (`is_active`). Put them inside a composite after a selective column.
5. Long strings: prefix indexes (`col(32)`) save space but cannot cover a query or serve `ORDER BY` fully.
6. Remove duplicates: `(a)` is redundant when `(a, b)` exists. `sys.schema_redundant_indexes` and `sys.schema_unused_indexes` list candidates on MySQL; confirm across all replicas before dropping.

## 4. Read a plan

Run `EXPLAIN <query>` (or `EXPLAIN FORMAT=TREE`, and `EXPLAIN ANALYZE` on servers that support it, on a copy). Key columns and red flags: `references/explain.md`.

Quick rules: `type = ALL` on a big table, `rows` far above the result size, `Using filesort` or `Using temporary` on a hot query, and `key = NULL` when you expected an index all need a fix. Common causes: a function or implicit cast on the indexed column, a leading `%` in `LIKE`, a charset mismatch in a join, or an `OR` across different columns.

After any change, re-run the same `EXPLAIN` and the query itself, and report both.

## 5. Transactions and locking

- Default isolation is `REPEATABLE READ`. Plain `SELECT` reads a consistent snapshot; locking reads (`SELECT ... FOR UPDATE`, `FOR SHARE`), `UPDATE` and `DELETE` see the latest committed rows and take **next-key locks** (row plus the gap before it).
- An `UPDATE` or `DELETE` whose `WHERE` isn't served by an index locks every row it scans, which can be the whole table. Index the predicate of every write statement.
- Gap locks make "check if exists, then insert" deadlock under load. Use a unique key with `INSERT ... ON DUPLICATE KEY UPDATE`, or `INSERT IGNORE` only when silently dropping the row is truly fine.
- Job queues: `SELECT ... FOR UPDATE SKIP LOCKED` (MySQL 8.0+, MariaDB 10.6+).
- Deadlocks are normal under concurrency: the app must catch error 1213 and retry the transaction. Lock wait timeouts are error 1205 (`innodb_lock_wait_timeout`).
- Diagnose with `SHOW ENGINE INNODB STATUS\G` (section `LATEST DETECTED DEADLOCK`) and, on MySQL 8, `performance_schema.data_locks` and `sys.innodb_lock_waits`.
- Keep transactions short. Autocommit off in a driver plus a forgotten commit holds locks and undo history indefinitely.

## 6. Replication lag

- Replicas apply changes after the source commits. Lag can be seconds or more during big writes or DDL.
- Read-your-writes: after a user writes, read their data from the source (for a short window, or per session), not a replica.
- Never use a replica read to decide a write (balance checks, uniqueness, "already processed?").
- One huge `UPDATE`/`DELETE` replicates as one huge event and stalls replicas. Batch it (see `database-migrations`).
- Measure lag with `SHOW REPLICA STATUS\G` (`SHOW SLAVE STATUS` on older servers) or a heartbeat table such as `pt-heartbeat`; `Seconds_Behind_Source` (`Seconds_Behind_Master` on older servers and MariaDB) is `NULL` when a replication thread is stopped and only measures against the relay log, so it can read 0 while the I/O thread is behind.

## 7. Online schema changes

Prefer `ALTER TABLE ..., ALGORITHM=INSTANT` or `ALGORITHM=INPLACE, LOCK=NONE` and let the server refuse if it can't. Stating the algorithm makes the statement fail instead of quietly copying the table. Details, plus when to reach for `gh-ost` or `pt-online-schema-change`: `references/online-ddl.md`.

## Never

- Never run DDL, `OPTIMIZE TABLE` or bulk writes on production without the user's explicit go-ahead.
- Never "fix" charset problems by changing only the column; check connection and client too.
- Never build SQL by concatenating user input; use placeholders.
- Never disable `foreign_key_checks` or `unique_checks` outside a controlled bulk load you then verify.

## Report back

For tuning: the query, the `EXPLAIN` before and after (key, type, rows, Extra), the change, and the timing difference. For design: the `CREATE TABLE`, the charset and collation chosen, and one line per index naming the query it serves.
