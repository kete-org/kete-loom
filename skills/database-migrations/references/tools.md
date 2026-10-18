# Migration tool notes

Read the tool's docs for the installed version; these are the points that most often cause outages.

| Tool | Generate / apply | Non-transactional statement (Postgres `CONCURRENTLY`) | Watch out for |
|---|---|---|---|
| Rails | `bin/rails g migration`, `bin/rails db:migrate` | `disable_ddl_transaction!` plus `add_index ..., algorithm: :concurrently` | `self.ignored_columns` before dropping; `strong_migrations` gem flags unsafe operations |
| Django | `manage.py makemigrations`, `manage.py migrate` | `atomic = False` on the `Migration`; `AddIndexConcurrently` from `django.contrib.postgres.operations` | `RunPython` backfills run inside the migration transaction by default; `sqlmigrate` shows the SQL |
| Alembic | `alembic revision --autogenerate`, `alembic upgrade head` | `with op.get_context().autocommit_block():` | autogenerate turns renames into drop and add; review every generated file |
| Flyway | versioned files `V<n>__desc.sql`, `flyway migrate` | script config `executeInTransaction=false`; on Postgres also check the `postgresql.transactional.lock` setting | never edit an applied file: checksum validation fails |
| Liquibase | changelog changesets, `liquibase update` | `runInTransaction="false"` on the changeset | each changeset is identified by id + author + file; editing applied ones fails validation |
| Prisma | `prisma migrate dev` (dev only), `prisma migrate deploy` (CI/prod) | edit the generated `migration.sql` (`--create-only`) and keep a concurrent index alone in its own migration; check your version's docs for transaction behaviour | `migrate dev` can offer to reset the database; never run it against shared data |
| Knex | `knex migrate:make`, `knex migrate:latest` | `exports.config = { transaction: false }` | |
| golang-migrate | `migrate create`, `migrate up` | keep a `CONCURRENTLY` statement alone in its file: Postgres runs a multi-statement query string as one implicit transaction | a failed migration marks the version dirty; fix then `migrate force` |
| EF Core | `dotnet ef migrations add`, `dotnet ef database update` or a generated script | `migrationBuilder.Sql(..., suppressTransaction: true)` | review generated `RenameColumn` vs drop/add; prefer idempotent scripts for production |

## Running migrations in deploys

- Run migrations as a separate step before the new code rolls out, from one place only (a job or init container), never from every app instance at startup.
- Expand migrations go before the code that needs them; contract migrations go in a later release after the code stopped using the old shape.
- Keep a lock timeout in the migration session so a blocked migration fails the deploy instead of taking the site down.
