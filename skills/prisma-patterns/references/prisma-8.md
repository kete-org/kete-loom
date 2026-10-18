# Prisma 8 differences

Prisma 8 replaces the generated `PrismaClient` with a contract-based client. At the time this was written (October 2026) it was a **release candidate** and the docs said details may still change. Check https://www.prisma.io/docs/orm/release-status and the "Coming from Prisma ORM 7" guide before relying on anything here, and keep using the 6/7 rules in `SKILL.md` for projects that haven't migrated.

Prisma 7 remains supported (bug fixes and security updates for 18 months after Prisma 8 reaches general availability). Do not migrate a project to Prisma 8 unless the user asks.

## Databases

PostgreSQL, SQLite and MongoDB. There is no MySQL support, so a MySQL project stays on Prisma 7.

## Files

- Contract: `src/prisma/contract.prisma`, first line `// use prisma-8`. No `generator` or `datasource` block; connection settings go in the `orm` section of `prisma.config.ts`.
- Database types are field types: `VarChar(255)` instead of `String @db.VarChar(255)`. `Json` means PostgreSQL `json`; use `Jsonb` for `jsonb`.
- SQL defaults use `` sql`...` `` instead of `dbgenerated(...)`. `cuid()` is written `cuid(2)`.
- Implicit many-to-many relations need an explicit join model.

## Commands

| Prisma 7 | Prisma 8 |
|---|---|
| `prisma generate` | `prisma contract emit` |
| `prisma migrate dev` | `prisma db update`, or `prisma migration plan` then `prisma db migrate` |
| `prisma migrate deploy` | `prisma db migrate` |
| `prisma db pull` | `prisma contract infer` |
| `prisma migrate diff` | `prisma db update --dry-run` or `prisma migration show` |
| `prisma migrate reset`, `prisma db seed` | none |

## Client and queries

- Create `db` once (for PostgreSQL in `src/prisma/db.ts`, with `postgres<Contract>(...)` from `@prisma/orm-postgres/runtime`).
- Models live under `db.orm.<schema>.<Model>`, for example `db.orm.public.User`.
- `findMany` → `.where(...).all()`; `findFirst`/`findUnique` → `.first()` (returns `null`); `select` → `.select("id", "email")`; `take`/`skip` → `.limit()`/`.offset()`.
- Relations: `.include("posts")`. Nested writes are limited to `create`, `connect` and `disconnect`. `relationLoadStrategy` is gone.
- Errors carry codes such as `RUNTIME.NO_ROWS` and `error.sqlState`; the `P2002`-style codes are gone.

## Transactions

- `db.transaction(async (tx) => { ... })`, querying through `tx.orm`. There is no array form; write the steps one after another in the callback.
- No `timeout`, `maxWait` or `isolationLevel` options and no automatic retries. Set a database-side limit (PostgreSQL `idle_in_transaction_session_timeout`, or `transaction_timeout` on PostgreSQL 17+) and run `SET TRANSACTION ISOLATION LEVEL ...` as the first statement when you need another level.
- Transactions don't nest: pass `tx` into helpers instead of starting another transaction.
- The MongoDB client has no `db.transaction`; use the MongoDB driver's session API.

## Raw SQL

`$queryRaw`, `$executeRaw`, `Prisma.sql`, `Prisma.join`, `Prisma.raw` and TypedSQL are gone. Raw SQL goes through the `db.raw.sql` tagged template: reads end in `.returnsRow({...}).build()` and run with `db.runtime().query(...)`; writes end in `.affectedCount()` and run with `db.runtime().execute(...)`. The injection rule stays the same: values are parameters, identifiers come from an allow-list.
