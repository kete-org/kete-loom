---
name: database-migrations
description: Plans and writes zero-downtime schema migrations with the expand-migrate-contract sequence, so columns, tables and indexes can be added, renamed, retyped or dropped while old and new app versions run side by side, with batched backfills, lock and statement timeouts, tested rollbacks, and the conventions of tools such as Flyway, Liquibase, Alembic, Django, Rails, Prisma and Knex. Use when writing a migration against a live database, renaming or dropping a column in production, backfilling a large table, adding a NOT NULL column or foreign key without locking writes, or planning how to roll a schema change back.
license: MIT
compatibility: Any Agent Skills host. Generating and running migrations needs the project's migration tool and a non-production database to rehearse on.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Safe database migrations

A migration is safe when every app version that is running during the deploy works with the schema at every step, no statement holds a blocking lock for more than a few seconds, and you know how to go back. This skill is the process; engine details live in `postgres-patterns` and `mysql-patterns`, and SQL recipes in `references/recipes.md`.

## 0. Before you write anything

1. Identify the engine and version, the migration tool (look for `migrations/`, `db/migrate/`, `alembic/`, `prisma/migrations/`, `flyway.conf`, `changelog.xml`) and how migrations run in deploys (before, during or after the new code ships).
2. Find the table size: row count and on-disk size. A change that is instant on 10k rows can lock a 200M-row table for an hour.
3. Search the codebase for every reader and writer of the affected tables and columns: models, raw SQL, reports, ETL jobs, other services.
4. **Stop and ask the user** if any of these is unknown: whether the table is large or hot, whether other services share the database, whether data may be deleted.

## 1. Classify the change

| Change | Safe in one step? | Pattern |
|---|---|---|
| Add a nullable column, or one with a constant default | Usually yes (check the engine notes) | single migration |
| Add a table, add an index built online | Yes | single migration, online index build |
| Add `NOT NULL` column or constraint to existing rows | No | add nullable, backfill, then enforce |
| Add a foreign key or check on a big table | No | add unvalidated, then validate separately |
| Rename a column or table | **No** | expand-contract |
| Change a column type | **No** (usually a rewrite) | expand-contract with a new column |
| Drop a column or table | **No** | stop using it in code first, then drop later |
| Split, merge or move data between tables | **No** | expand-contract plus backfill |

## 2. Expand, migrate, contract

Ship each phase as its own deploy. Do not move on until the previous one is live everywhere.

1. **Expand.** Add the new column, table or index. Nothing reads it yet. Old code keeps working because nothing it uses changed.
2. **Dual write.** Deploy code that writes both old and new shapes (in the app, or with a trigger if many writers exist). Reads still use the old shape.
3. **Backfill.** Copy existing rows to the new shape in batches (section 3). Verify with a count of rows where old and new disagree; it must be 0.
4. **Switch reads.** Deploy code that reads the new shape. Keep writing both, so you can switch back.
5. **Contract.** Stop writing the old shape, wait at least one deploy cycle, then drop the old column or table in a separate migration.

Renames follow this pattern: add `new_name`, dual write, backfill, read from `new_name`, drop `old_name`. ORMs that cache column lists (Rails, Django, Hibernate) need the column ignored or removed from the model **before** the drop migration runs.

## 3. Backfills

- Never one `UPDATE` over the whole table. It holds row locks, bloats or fills undo/WAL, and stalls replicas.
- Batch by primary key range, 1k to 10k rows per batch, each batch its own short transaction:
  ```sql
  UPDATE orders SET total_minor = round(total * 100)
  WHERE id > :last_id AND id <= :last_id + 5000 AND total_minor IS NULL;
  ```
- Make it idempotent (`WHERE new_col IS NULL`) and resumable (record the last ID), so it can be stopped and restarted.
- Pause between batches and watch replica lag and database CPU; slow down if lag grows.
- Run long backfills as a job or script, not inside the schema migration transaction. Many tools wrap each migration in one transaction.

## 4. Locks and timeouts

- Set a short lock timeout before DDL on any live table, so a blocked `ALTER` fails fast instead of queuing all traffic behind it. Postgres: `SET lock_timeout = '3s'`. MySQL: `SET SESSION lock_wait_timeout = 5`.
- Retry a timed-out DDL with backoff; don't raise the timeout to minutes.
- Build indexes online: Postgres `CREATE INDEX CONCURRENTLY` (outside a transaction; tell the tool, for example `disable_ddl_transaction!` in Rails, `atomic = False` in Django, `autocommit_block()` in Alembic). MySQL `ALGORITHM=INPLACE, LOCK=NONE`.
- One risky statement per migration file, so a failure leaves a clear state.

## 5. Rollbacks

1. Write the down path, or state why there isn't one. A drop of data cannot be rolled back by a migration: the rollback is a restore.
2. Prefer rolling **forward**: in expand-contract the old shape still exists until the contract step, so you roll back the code, not the schema.
3. Before any destructive step (drop, type change, delete), confirm a recent backup or snapshot exists and that restore has been tested. **Stop and ask the user** to confirm.
4. Rehearse: run up, down, then up again on a copy with production-like volume. Time each step.

## 6. Tool conventions

- Never edit a migration that has run in any shared environment. Add a new one.
- Keep schema migrations and data backfills separate. Generated migrations (Django `makemigrations`, Prisma `migrate dev`, Alembic `--autogenerate`) must be read before commit: they can turn a rename into drop-and-add, which loses data.
- Check what the tool does inside a transaction and with locks. Per-tool notes: `references/tools.md`.

## Never

- Never drop or rename a column that deployed code still reads.
- Never run a destructive migration without a confirmed backup and the user's explicit go-ahead.
- Never combine the expand and contract steps in one deploy.
- Never run a migration against production yourself unless the user asks for that exact action.

## Report back

Return a migration plan in this shape:

```
Change: <one line>
Engine / tool: <e.g. PostgreSQL 16 / Alembic>   Table size: <rows, GB>
Steps:
  1. [deploy|migration|job] <what> — lock taken, expected duration, rollback
  2. ...
Verification: <query that proves the step worked>
Risks and open questions: <list, or "none">
```

Then the migration files you wrote and the result of rehearsing them.
