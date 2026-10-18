# PostgreSQL locks: what blocks what

## Table lock levels you meet most

| Lock | Taken by | Blocks |
|---|---|---|
| ACCESS SHARE | `SELECT` | only ACCESS EXCLUSIVE |
| ROW EXCLUSIVE | `INSERT`, `UPDATE`, `DELETE` | SHARE and stronger (for example plain `CREATE INDEX`) |
| SHARE UPDATE EXCLUSIVE | `VACUUM`, `ANALYZE`, `CREATE INDEX CONCURRENTLY`, `VALIDATE CONSTRAINT` | other schema changes, not reads or writes |
| SHARE | plain `CREATE INDEX` | all writes to the table |
| SHARE ROW EXCLUSIVE | `ADD FOREIGN KEY` (on both tables) | writes |
| ACCESS EXCLUSIVE | most `ALTER TABLE`, `DROP`, `TRUNCATE`, `VACUUM FULL` | everything, including `SELECT` |

`REINDEX` without `CONCURRENTLY` takes SHARE on the table (blocks writes) and ACCESS EXCLUSIVE on the index (blocks queries that would use it).

The queue matters: an `ALTER TABLE` waiting for ACCESS EXCLUSIVE behind one long transaction makes every later `SELECT` wait behind it. Always set `lock_timeout` before DDL on a busy table:

```sql
SET lock_timeout = '3s';
SET statement_timeout = '15min';
ALTER TABLE ...;
```

If it times out, retry later; don't raise the timeout to minutes.

## Who is blocking whom

```sql
SELECT a.pid, a.state, a.wait_event_type, a.wait_event,
       pg_blocking_pids(a.pid) AS blocked_by,
       now() - a.xact_start AS xact_age, left(a.query, 120) AS query
FROM pg_stat_activity a
WHERE a.datname = current_database() AND a.pid <> pg_backend_pid()
ORDER BY xact_age DESC NULLS LAST;
```

Long `idle in transaction` sessions at the top are the usual culprit. `pg_cancel_backend(pid)` cancels the query; `pg_terminate_backend(pid)` drops the connection. Ask the user before running either on a shared server.

## Row locks

- `FOR UPDATE`: you will update or delete the row.
- `FOR NO KEY UPDATE`: you will update non-key columns; does not block inserts of child rows referencing it. Plain `UPDATE` of non-key columns takes this.
- `FOR SHARE`: others must not update or delete it.
- `FOR KEY SHARE`: others must not delete it or change its key; non-key updates still proceed. FK checks take this on the parent row.
- `NOWAIT` fails immediately instead of waiting; `SKIP LOCKED` skips locked rows (job queues only, it gives an inconsistent view).

## Deadlocks

The server log line `deadlock detected` lists both statements. Fix by locking rows in one order everywhere (sort IDs before a batch update), keeping transactions short, and not mixing `SELECT ... FOR SHARE` then `UPDATE` on the same rows from two sessions.

## Advisory locks

`pg_advisory_xact_lock(key)` serialises work on an app-level key (for example one cron job at a time) and releases at commit. Session-level `pg_advisory_lock` does not work safely behind a transaction-mode pooler.
