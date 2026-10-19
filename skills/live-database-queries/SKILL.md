---
name: live-database-queries
description: Safe ad-hoc querying of a real PostgreSQL, MySQL or SQL Server database by the agent itself - connecting as a dedicated read-only login, opening read-only sessions or transactions, allowing one SELECT statement per call, enforcing a statement timeout and a row cap, keeping credentials in environment variables, .pgpass or option files rather than the chat, choosing the right database from a described inventory, and running EXPLAIN before anything heavy. Use when asked to look something up in a live or production database, answer a question from real tables, connect the agent to a database for exploration, or set up a least-privilege account for agent queries.
license: MIT
compatibility: Any Agent Skills host with a shell. Needs the matching client (psql, mysql or sqlcmd) and network access to the database.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: network
  kete-loom/requires: "psql, mysql, sqlcmd"
  kete-loom/owner: "Kete-org"
---

# Live database queries

Answer questions from a real database without changing it, slowing it down, or leaking what is in it. Schema design and query tuning belong to `postgres-patterns` and `mysql-patterns`; this skill is about the agent safely running queries itself.

## Ground rules

1. **The login is the real control.** Connect as an account that can only read the schemas needed. Session read-only settings are a second layer: in PostgreSQL and MySQL a client can switch them off again, so they never replace grants.
2. **Credentials never enter the conversation.** Read them from environment variables, `~/.pgpass` or `pg_service.conf`, a MySQL option file or `mysql_config_editor` login path, or a secrets manager. Never put a password on the command line, in a file you commit, or in your reply. If the user pastes one, tell them to rotate it.
3. **One statement per call, and it must be a read.** Allow `SELECT`, `WITH ... SELECT`, `EXPLAIN` (without ANALYZE), `SHOW`, `DESCRIBE` and catalog views. Refuse any statement that uses the keywords `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `CALL`, `EXEC`, `COPY`, `SELECT ... INTO` (including `INTO OUTFILE`) or `FOR UPDATE`/`FOR SHARE`, and anything with a second statement after `;`. Match keywords as SQL tokens, not substrings: a column named `created_at` or `updated_by` is fine. A SELECT can still have side effects through functions; refuse calls to user-defined functions and to admin or file functions such as `pg_terminate_backend`, `pg_cancel_backend`, `pg_read_file`, `lo_export`, `dblink`, `set_config`, `nextval` and `setval` unless the user confirms what they do.
4. **Every query has a timeout and a row cap.** Default 30 seconds and 500 rows unless the user sets others. Use `LIMIT` / `TOP` in the SQL and the session timeout; never rely on one alone.
5. **Production is a replica when one exists.** Prefer a read replica or reporting copy; ask before querying a primary that serves customers.
6. **Minimise personal data.** Select only the columns needed, aggregate where possible, and mask emails, phones and IDs in what you show.

## Pick the database

If the user's setup lists several databases (for example a `databases.md` or service file describing each one), match the question to the description, say which one you chose and why, and stop and ask when two are plausible or the only match is a production primary. Never guess between staging and production.

## Steps

1. **Confirm the target**: engine, host alias, database, and that the account is read-only. Check its grants once (queries in `references/engine-setup.md`); if it can write, stop and tell the user.
2. **Open a guarded session** for the engine:
   - PostgreSQL: `PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=30s -c lock_timeout=5s -c idle_in_transaction_session_timeout=60s' psql "service=reporting" -X -v ON_ERROR_STOP=1`
   - MySQL: connect with a login path, then `SET SESSION TRANSACTION READ ONLY; SET SESSION max_execution_time = 30000; SET SESSION sql_select_limit = 500;` (`max_execution_time` is milliseconds and covers SELECT only).
   - SQL Server: `sqlcmd` with `-t 30` (query timeout in seconds), a `db_datareader`-only user, `SET LOCK_TIMEOUT 5000;`, and `SET TRANSACTION ISOLATION LEVEL READ COMMITTED;` or snapshot isolation if the database enables it so readers do not block writers. SQL Server has no session read-only switch, so the grants carry all the weight.
3. **Learn the schema before querying data**: list tables and columns from `information_schema`, read comments, and check row counts from catalog statistics rather than `count(*)` on large tables.
4. **Write the query**, with explicit columns, a filter on an indexed column where possible, and `LIMIT`/`TOP`.
5. **EXPLAIN first** when the table is large (over about a million rows), the query joins several large tables, or it has no selective filter. Plain `EXPLAIN` only: `EXPLAIN ANALYZE` executes the statement. If the plan shows a full scan of a big table or a huge estimated row count, narrow it or ask before running.
6. **Run it**, then check the result makes sense (row count, nulls, totals against a known figure).
7. **Report** in the format below. Show the SQL you ran so the user can rerun it.

## Stop and ask the user

- The account has write, DDL or admin privileges.
- The only route is a production primary during business hours, or the plan predicts a long scan.
- The answer needs a write (a fix, a backfill, a status change). Draft the statement for a human to review and run; never run it yourself.
- The question needs data from a table holding health, payment card or national ID data.

## Never

- Run a statement the allow-list in rule 3 rejects, even if the user insists; offer the SQL as text instead.
- Disable the timeout, raise the row cap without being asked, or loop a query to page through a whole table.
- Use `EXPLAIN ANALYZE` on anything but a plain SELECT.
- Print connection strings, passwords or tokens, including inside error messages you quote.

## Report format

```
Database: <alias> (<engine>, <replica|primary>), account <name> (read-only verified)
Query:
  <SQL as run>
Plan check: <skipped - small table | EXPLAIN summary>
Result: <rows returned> rows (cap <n>), <elapsed>
<table or summary, personal data masked>
Caveats: <time zone, soft-deleted rows, replication lag, filters applied>
```

Per-engine setup for a read-only account, grant checks and credential files are in `references/engine-setup.md`.
