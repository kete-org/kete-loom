---
name: prisma-patterns
description: Prisma ORM practice for TypeScript backends, detecting whether the project is on Prisma 6, 7 or the Prisma 8 contract-based release, then covering schema modelling, the migrate dev versus deploy workflow, include and select to kill N+1 queries, sequential and interactive transactions, pool sizing behind serverless functions and PgBouncer, and injection-safe raw SQL. Use when editing schema.prisma or a Prisma contract, creating or deploying Prisma migrations, debugging slow Prisma queries or connection pool timeouts, or writing $queryRaw.
license: MIT
compatibility: Any Agent Skills host. Needs Node and the project's package manager to run the Prisma CLI. Prisma 7 needs Node 20.19 or later and a driver adapter; Prisma 8 differs a lot, see the reference file.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "node, npx"
  kete-loom/owner: "Kete-org"
---

# Prisma patterns

Prisma changed shape twice in a short time. Find out which major version the project uses **before** writing a line, then follow the rules for that version.

## 0. Detect the version first

1. Read `package.json` for `prisma` and `@prisma/client` (Prisma 6 or 7) or `@prisma/orm-postgres` / `@prisma/orm-mongo` (Prisma 8). Confirm with the project's package manager, for example `npx prisma --version`.
2. Look for the schema: `prisma/schema.prisma` with `generator` and `datasource` blocks means 6 or 7. A `contract.prisma` starting with `// use prisma-8` means 8.
3. If it's Prisma 8, read `references/prisma-8.md` and use its command and API names. The rest of this file describes 6 and 7.
4. **Never upgrade the major version as a side effect.** On a Prisma 7 project, a bare `npm install prisma` can pull the Prisma 8 CLI; pin it (`npm install --save-dev prisma@7`). Ask the user before any major upgrade.
5. Find the migration history (`prisma/migrations/`) and how CI deploys it. Read `references/workflow.md` before creating or deploying a migration.

## 1. Schema design (6 and 7)

- In Prisma 7, the `generator` block needs an explicit `output` path, datasource URLs move to `prisma.config.ts`, and the client is created with a driver adapter (for example `@prisma/adapter-pg`). Follow the pattern already in the project.
- Use `@id @default(cuid())`, `uuid()` or `autoincrement()` consistently with the existing models. Map to existing table and column names with `@@map` and `@map` instead of renaming the database.
- Add `@@index` for every foreign key you filter or join on. PostgreSQL never indexes foreign key columns on its own. MySQL (InnoDB) does when real foreign keys exist, but not with `relationMode = "prisma"`, which needs the indexes added by hand.
- Use `@@unique` for real invariants (`@@unique([tenantId, email])`), and set `onDelete` explicitly on relations (`Cascade`, `Restrict`, `SetNull`) rather than relying on defaults.
- Money: `Decimal` (`@db.Decimal(12, 2)`) or integer minor units, never `Float`. Timestamps: `DateTime @default(now())` and `@updatedAt`.
- Enums are fine for small closed sets; adding a value is a migration.

## 2. Queries and N+1

- Ask for related data in the same call: `include: { posts: true }` or a nested `select`. A loop that calls `findUnique` or `findMany` per parent row is N+1; replace it with one `findMany({ where: { id: { in: ids } } })` or an `include`.
- `select` only the fields the caller needs, especially on wide tables and in list endpoints.
- `relationLoadStrategy` is still a Preview feature: it needs `previewFeatures = ["relationJoins"]` in the generator and works on PostgreSQL, CockroachDB and MySQL. With the flag on, `"join"` (one SQL query) is the default and `"query"` sends one query per relation level. Measure both on deep includes, and don't add a preview flag without telling the user.
- Paginate with `cursor` + `take` on an indexed unique field for large lists; `skip` scans skipped rows.
- Use `createMany`, `updateMany`, `deleteMany` for bulk work instead of loops; they don't return the rows (use `createManyAndReturn` where supported).
- To see the SQL, construct the client with `log: ["query"]` in development, then run `EXPLAIN` on the slow statement in the database.

## 3. Transactions

- **Nested writes** (`create` with nested `create`/`connect`) are already one transaction. Prefer them for parent-and-children writes.
- **Sequential**: `prisma.$transaction([a, b])` runs independent operations atomically.
- **Interactive**: `prisma.$transaction(async (tx) => { ... })` for read-then-write logic. Use `tx` for every query inside; a query on `prisma` runs outside the transaction. Defaults are `maxWait` 2000 ms and `timeout` 5000 ms; raise them only with a reason.
- Never do network calls (payments, email, HTTP) inside an interactive transaction: it holds a connection and row locks while it waits.
- For concurrency-sensitive updates, use an atomic update (`update({ where: { id, version }, data: { balance: { decrement: 10 }, version: { increment: 1 } } })`) or `isolationLevel: "Serializable"` with a retry on serialization failure (`P2034`).

## 4. Connections and serverless

- Create **one** client per process and reuse it. In dev servers with hot reload, keep it on `globalThis` so reloads don't open new pools.
- Prisma 6: the pool size comes from `connection_limit` in the URL (default `num_physical_cpus * 2 + 1`) and `pool_timeout` (default 10 s). Prisma 7: the driver adapter owns the pool, for example `new PrismaPg({ connectionString, max: 10 })`; `pg` defaults to 10 connections and no acquire timeout, so set `connectionTimeoutMillis`.
- Serverless functions multiply pools: every warm instance holds its own. Size per-instance pools small (1 to 5), and put a pooler in front (PgBouncer in transaction mode, Supabase's or Neon's pooler, or Prisma Accelerate). On Prisma 6 with PgBouncer, add `pgbouncer=true` to the URL.
- Migrations must use a **direct** (unpooled) connection: `directUrl` in Prisma 6, the URL in `prisma.config.ts` in Prisma 7.
- Pool timeout errors (`P2024`) mean the pool is exhausted: look for slow or long transactions and missing `await`s before raising the pool size.

## 5. Raw SQL

- Use tagged templates: ``prisma.$queryRaw`SELECT * FROM "User" WHERE email = ${email}` ``. Values become bound parameters.
- Build dynamic fragments with `Prisma.sql` and lists with `Prisma.join(ids)`. Identifiers (table or column names) can't be parameters; pick them from a fixed allow-list in code.
- `$queryRawUnsafe` / `$executeRawUnsafe` and `Prisma.raw` with any user input are SQL injection. Use them only with `$1` placeholders and parameters passed separately, and flag any other use in review.
- Prefer TypedSQL (`.sql` files in `prisma/sql/`, run through `prisma generate --sql`) for complex reads that must stay typed. Check whether your version still needs the `typedSql` preview feature.

## Never

- Run `prisma migrate dev`, `prisma migrate reset` or `prisma db push` against a shared, staging or production database.
- Edit a migration that has already been applied anywhere except your machine.
- Swallow Prisma errors: map known codes (`P2002` unique violation, `P2025` record not found) to domain errors and rethrow the rest.
- Return raw Prisma models from an API without choosing fields; it leaks columns such as password hashes.

## Report format (when reviewing)

```
Prisma review: <scope>
Version: Prisma <6|7|8>, provider <postgresql|mysql|sqlite|mongodb|...>
Findings:
1. [severity] <file:line>: <problem> → <fix>
Migrations: <state of prisma/migrations, drift or pending>
Not verified: <anything you could not run>
```
