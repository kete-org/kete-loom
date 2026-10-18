# Prisma migration workflow (Prisma 6 and 7)

Read this before creating, editing or deploying a migration. For Prisma 8, use `references/prisma-8.md` instead.

## Local development

1. Edit `schema.prisma`.
2. Create and apply the migration on your **local** database:
   ```
   npx prisma migrate dev --name add_order_status
   ```
   It diffs the schema against the migration history using a shadow database, writes `prisma/migrations/<timestamp>_add_order_status/migration.sql`, and applies it.
3. On Prisma 7, run `npx prisma generate` afterwards; `migrate dev` no longer generates the client for you.
4. Read the generated SQL. Edit it before committing when Prisma can't infer intent:
   - A renamed column shows up as drop plus add, which loses data. Replace it with `ALTER TABLE ... RENAME COLUMN`.
   - A new required column on a table with rows needs a default or a backfill step.
   - Large tables: on PostgreSQL, change `CREATE INDEX` to `CREATE INDEX CONCURRENTLY` in its own migration file (it can't run inside a transaction).
5. Use `npx prisma migrate dev --create-only` to write the file without applying it, when you need to edit it first.
6. Commit the migration folder together with the schema change.

## Deploy (CI, staging, production)

```
npx prisma migrate deploy
```

- Applies pending migrations in order. It never creates migrations, never resets, and needs no shadow database.
- Run it once per deploy, from one place (a release step or job), not from every app instance at boot.
- Use a direct, unpooled connection.
- Check state first with `npx prisma migrate status`.

## Expand and contract for zero downtime

Old and new app versions run side by side during a deploy, so split breaking changes:

1. **Expand**: add the new column or table (nullable or with a default). Deploy code that writes both and reads the old.
2. **Backfill** in batches from a script.
3. Deploy code that reads the new column.
4. **Contract**: drop the old column in a later migration.

## When things go wrong

| Situation | Action |
|---|---|
| Drift detected in development | `npx prisma migrate dev` offers a reset; fine only on a local throwaway database |
| A deploy failed half way | Fix the database by hand, then `npx prisma migrate resolve --applied <name>` or `--rolled-back <name>` |
| Existing database with no migration history | Baseline: write `prisma/migrations/0_init/migration.sql` with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` (older Prisma 6 releases call this flag `--to-schema-datamodel`; check `npx prisma migrate diff --help`), then `prisma migrate resolve --applied 0_init` |
| Need the SQL between two states | `prisma migrate diff` with `--from-*` and `--to-*` flags. Prisma 7 removed the URL flags; use `--from-config-datasource` / `--to-config-datasource`, and treat "No difference detected" as suspect until you've confirmed the datasource is configured |

Never run `migrate reset` or `db push` on a shared database; both can drop data. Ask the user before running `migrate resolve` anywhere except locally.
