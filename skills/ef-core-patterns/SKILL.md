---
name: ef-core-patterns
description: Entity Framework Core data-access rules for .NET - scoped DbContext lifetime, pooling and IDbContextFactory, AsNoTracking for read paths, LINQ that translates to SQL instead of throwing or evaluating on the client, projections, Include versus AsSplitQuery for N+1 and cartesian explosion, ExecuteUpdate and ExecuteDelete for bulk writes, safe dotnet ef migrations and idempotent scripts, and optimistic concurrency with row versions. Use when writing or reviewing EF Core queries or DbContext setup, fixing slow or untranslatable LINQ, adding or deploying an EF Core migration, or handling DbUpdateConcurrencyException.
license: MIT
compatibility: Any Agent Skills host. Needs the .NET SDK and the dotnet-ef tool for migrations. Written for EF Core 8 and later.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "dotnet"
  kete-loom/owner: "Kete-org"
---

# EF Core patterns

Use EF Core so every query is one you would have written by hand, and every write is safe under concurrency. For the web host around it follow `aspnet-core-patterns`; for engine-specific SQL tuning follow `postgres-patterns` or `mysql-patterns`.

## 0. Before you change anything

1. Read the `Microsoft.EntityFrameworkCore.*` package versions and the provider (SqlServer, Npgsql, Sqlite, Pomelo MySQL). Behaviour differs by provider.
2. Turn on SQL logging locally so you can see what each query does:
   ```csharp
   options.UseNpgsql(cs).LogTo(Console.WriteLine, LogLevel.Information)
          .EnableSensitiveDataLogging(env.IsDevelopment());
   ```
3. Run `dotnet test`. If it fails before you start, **stop and tell the user**.

## 1. DbContext lifetime

- Web apps: `AddDbContext<AppDbContext>` registers it **scoped**, one per request. For hot paths, `AddDbContextPool<AppDbContext>` reuses instances; pooled contexts must not hold per-request state in fields.
- Singletons, background services, Blazor Server components and parallel work: inject `IDbContextFactory<AppDbContext>` (`AddDbContextFactory`) and `await using var db = await factory.CreateDbContextAsync(ct);`.
- A `DbContext` is not thread-safe. Never run two queries on the same context at once (`Task.WhenAll` over one context throws). Use separate contexts.
- Keep a context short-lived. A long-lived context's change tracker grows and serves stale data.

## 2. Tracking vs no-tracking

| Path | Use |
|---|---|
| Read-only list or detail | `AsNoTracking()` or a `Select` projection |
| Read then update the same entities | Tracking (default), then `SaveChangesAsync` |
| Read-only with repeated references you need deduplicated | `AsNoTrackingWithIdentityResolution()` |

- Set `UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)` on the context only if the whole codebase is read-heavy and every update path re-attaches explicitly. Otherwise opt in per query.
- Projections (`Select(o => new OrderDto(...))`) are never tracked and fetch only the columns used. Prefer them for APIs.

## 3. Query translation pitfalls

1. Keep the query `IQueryable` until the end. `ToList()`, `AsEnumerable()` or `IEnumerable<T>` parameters in the middle pull every row into memory and filter in C#.
2. Methods EF can't translate (your own C# helpers, most string formatting, complex `GroupBy` shapes) throw `InvalidOperationException: ... could not be translated`. Rewrite with translatable operators, move the logic to after a projection that already limits rows, or use `FromSql` with parameters.
3. Client evaluation is allowed only in the final `Select`. Don't rely on it for filtering.
4. `string.Equals(a, b, StringComparison.OrdinalIgnoreCase)` usually doesn't translate; use the column's collation, `EF.Functions.ILike` (Npgsql) or `EF.Functions.Like`.
5. `Contains` over a local list becomes `IN` or a parameterised array; keep lists bounded.
6. Raw SQL: `FromSql($"... WHERE id = {id}")` and `ExecuteSql($"...")` parameterise interpolated values. `FromSqlRaw` / `ExecuteSqlRaw` with string concatenation is SQL injection.
7. Always `await` the async operators (`ToListAsync`, `FirstOrDefaultAsync`, `SaveChangesAsync`) and pass the `CancellationToken`.
8. Paginate with `OrderBy` then `Skip`/`Take` (or keyset `Where(x => x.Id > lastId)` for deep pages). `Skip` without `OrderBy` gives unstable pages.

## 4. N+1, Include and split queries

- Lazy loading proxies make N+1s invisible. If the project has `UseLazyLoadingProxies()`, don't add more reliance on it; load explicitly.
- Load what you need: `Include(o => o.Lines).ThenInclude(l => l.Product)`, or better, a projection that selects just the fields.
- Several collection `Include`s in one query cause cartesian explosion (rows multiply). EF warns about this. Use `AsSplitQuery()` on that query, or `UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)` globally with `AsSingleQuery()` where you need one round trip.
- Split queries are not one snapshot: data can change between them. Use a transaction with a suitable isolation level when consistency matters, and always `OrderBy` before `Skip`/`Take` with split queries.
- Filtered include: `Include(o => o.Lines.Where(l => !l.Cancelled))`.

## 5. Writes

- Bulk changes without loading: `ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Archived), ct)` and `ExecuteDeleteAsync(ct)`. They bypass the change tracker, interceptors that hook `SaveChanges`, and concurrency checks. Say so when you use them.
- One `SaveChangesAsync` per unit of work; it runs in a transaction. Use `await using var tx = await db.Database.BeginTransactionAsync(ct);` only when you span several `SaveChanges` or raw SQL.
- With retrying execution strategies (`EnableRetryOnFailure`), wrap manual transactions in `db.Database.CreateExecutionStrategy().ExecuteAsync(...)`.

## 6. Concurrency tokens

```csharp
// SQL Server rowversion
[Timestamp] public byte[] RowVersion { get; set; } = [];
// Any provider: an app-managed token
modelBuilder.Entity<Account>().Property(a => a.Version).IsConcurrencyToken();
// Npgsql: a uint property marked as row version maps to the xmin system column
public uint Version { get; set; }
modelBuilder.Entity<Account>().Property(a => a.Version).IsRowVersion();
```

- Handle `DbUpdateConcurrencyException`: reload the entry (`entry.GetDatabaseValuesAsync()`), then retry, merge or return 409 to the client. Never catch and ignore it.
- APIs send the token to the client (ETag or a field) and require it on update, so stale writes are rejected.
- An app-managed token must be changed on every update (for example `Version = Guid.NewGuid()` or an incremented int).

## 7. Migrations

1. Create: `dotnet ef migrations add AddInvoiceTable` (add `--project` / `--startup-project` when the context lives in another project).
2. **Read the generated migration.** EF can scaffold a rename as drop plus add; edit it to `RenameColumn` when that happens. Check for data loss before you commit it.
3. Never edit a migration that has been applied in a shared environment; add a new one.
4. Deploy with an idempotent script or a bundle, reviewed and run by the pipeline:
   ```
   dotnet ef migrations script --idempotent -o migrate.sql
   dotnet ef migrations bundle --self-contained
   ```
   Prefer this over `Database.Migrate()` at app startup in production: startup migration needs schema rights for the app identity and gives no review step. Before EF Core 9, several instances migrating at once could also race; EF Core 9+ takes a database-wide lock but SQL scripts do not.
   Add `dotnet ef migrations has-pending-model-changes` to CI (EF Core 8+) so a model change without a migration fails the build.
5. Large tables: add nullable columns, backfill in batches, then make them required in a later migration. Raw SQL for things EF can't express (`migrationBuilder.Sql(...)`, for example concurrent index creation on PostgreSQL with the transaction suppressed).
6. Keep the model snapshot in source control and resolve merge conflicts in it by re-adding the migration, not by hand-merging.

## Stop and ask the user

- Before a migration that drops or renames a column or table with data.
- Before turning on global no-tracking, global split queries or lazy loading.
- Before running migrations against any non-local database.

## Never

- Never register `DbContext` as a singleton or share one across threads.
- Never build SQL with string concatenation in `FromSqlRaw` / `ExecuteSqlRaw`.
- Never `ToList()` a table to filter it in memory.
- Never swallow `DbUpdateConcurrencyException`.

## Finish

Run `dotnet test` and look at the logged SQL for each query you changed. Report: queries changed with before/after query counts, migrations added and whether they lose data, and concurrency handling added.
