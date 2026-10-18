---
name: csharp-patterns
description: Idiomatic modern C# on .NET 8 and later, covering nullable reference types, records, pattern matching, async/await with CancellationToken, LINQ deferred-execution traps, IDisposable and IAsyncDisposable, Microsoft.Extensions.DependencyInjection lifetimes, the dotnet CLI and Roslyn analyzers. Use when writing or restructuring C# application or library code, enabling nullable or analyzers in a .NET project, or choosing how a class, service or async API should be shaped.
license: MIT
compatibility: Any Agent Skills host. Needs the .NET 8+ SDK (dotnet CLI) to build and run checks.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "dotnet"
  kete-loom/owner: "Kete-org"
---

# C# patterns

Write C# that the compiler and analyzers can check for you. Most C# production bugs are nulls, blocked async calls, leaked disposables and LINQ queries that run more than once; the rules below close those doors.

## 0. Before you write code

1. Find the target framework and language settings: open the `.csproj` (and `Directory.Build.props` if present) and note `TargetFramework`, `Nullable`, `LangVersion`, `ImplicitUsings`, `TreatWarningsAsErrors`, `AnalysisLevel`.
2. Run `dotnet build` once and record the warning count. Do not add new warnings.
3. Match the code style already in the repo (`.editorconfig`, file-scoped namespaces, `var` usage). Don't reformat files you aren't changing.
4. If the project targets anything older than `net8.0` (`netstandard2.0`, `net48`, `net6.0`), **stop and ask** before using newer language features or APIs (`required`, `TimeProvider`, `ArgumentNullException.ThrowIfNull`); they may not exist there, and the user may have consumers on that framework.

## 1. Nullable reference types

- New projects: `<Nullable>enable</Nullable>`. Existing projects without it: enable per file with `#nullable enable` in files you touch, and **ask the user** before flipping it project-wide (it can produce hundreds of warnings).
- A non-nullable type is a promise. Validate at trust boundaries (public API, deserialised input, config): `ArgumentNullException.ThrowIfNull(x)`, `ArgumentException.ThrowIfNullOrEmpty(s)`.
- Never silence a warning with `!` (null-forgiving) unless you can name the guarantee in a one-line comment. `!` on `FirstOrDefault()` or a dictionary lookup is a bug.
- Required members: use `required` properties or constructor parameters instead of `= null!` initialisers (CS8618).
- Use `[NotNullWhen(true)]`, `[MaybeNullWhen(false)]` on `TryGet...` methods so callers get correct flow analysis.

## 2. Types: records, classes, structs

| Need | Use |
|---|---|
| Immutable data with value equality (DTOs, messages, keys) | `record` or `sealed record` with positional or `init` properties |
| Small value (≤16 bytes), no identity | `readonly record struct` |
| Identity, mutable state, behaviour | `sealed class` (seal by default; unseal when you design for inheritance) |
| Closed set of cases | abstract `record` base plus sealed derived records, matched with `switch` |

- Records give value equality over **all** fields; a record holding a `List<T>` compares the list by reference. `ImmutableArray<T>` also compares by reference; if value equality over the collection matters, override `Equals`/`GetHashCode` (with `SequenceEqual`) yourself.
- Prefer primary constructors for DI-only classes; don't mutate the captured parameters.

## 3. Pattern matching

- Use `is null` / `is not null`, not `== null` (operators can be overloaded).
- Use switch expressions for mapping and dispatch; end with a discard arm that throws (`_ => throw new UnreachableException()`) only when the input set is truly closed.
- Property and list patterns (`{ Status: OrderStatus.Paid, Total: > 0 }`, `[var first, ..]`) beat chains of `&&` checks.

## 4. Async and cancellation

1. Async all the way. Never call `.Result`, `.Wait()` or `.GetAwaiter().GetResult()` on a task in application code: it deadlocks under a synchronization context and starves the thread pool under load.
2. Never write `async void` except for event handlers. Return `Task` or `ValueTask`.
3. Every public async method that does I/O takes a `CancellationToken cancellationToken = default` as the **last** parameter and passes it to every call that accepts one. In ASP.NET Core, use `HttpContext.RequestAborted` or the action's token parameter.
4. Library code (NuGet packages, shared libraries): `await x.ConfigureAwait(false)`. ASP.NET Core application code has no synchronization context, so it doesn't need it; UI apps (WPF, WinForms, MAUI) must not use it before touching UI.
5. Don't wrap synchronous work in `Task.Run` inside a server request. Use `Task.Run` only to move CPU-bound work off a UI thread.
6. Run independent calls concurrently with `Task.WhenAll`; don't `await` in a loop when the calls are independent.
7. `ValueTask` only for hot paths that often complete synchronously; never await a `ValueTask` twice.
8. Timeouts: `using var cts = CancellationTokenSource.CreateLinkedTokenSource(token); cts.CancelAfter(timeout);`.
9. Catch `OperationCanceledException` only to clean up or translate; let it propagate otherwise.

## 5. LINQ

- `IEnumerable<T>` is lazy. Enumerating it twice runs the query twice (and hits the database twice for `IQueryable<T>`). Materialise once with `ToList()` / `ToArray()` when you'll iterate more than once.
- `Any()` not `Count() > 0`; `FirstOrDefault` returns `null`/`default` and needs a null check.
- With EF Core `IQueryable`, keep filters before `ToListAsync()`. A `.AsEnumerable()` or a client-side method call in `Where` pulls whole tables into memory.
- Don't use LINQ for side effects (`Select` that mutates). Use `foreach`.
- Hot paths: avoid LINQ allocations in tight loops; measure first.

## 6. Disposal

- Anything `IDisposable` you create, you dispose: `using var stream = ...;` or `await using var conn = ...;` for `IAsyncDisposable`.
- Don't dispose objects you didn't create (injected services, `HttpClient` from `IHttpClientFactory`).
- `HttpClient`: get it from `IHttpClientFactory` (`services.AddHttpClient<T>()`) or reuse one static instance; never `new HttpClient()` per request (socket exhaustion).
- Implement `IDisposable` only when you own an unmanaged resource or another disposable. Seal the class and skip the full dispose pattern unless it's designed for inheritance.

## 7. Dependency injection

- Register in `Program.cs` or an `IServiceCollection` extension method per feature (`services.AddOrders()`).
- Lifetimes: `Singleton` for stateless or thread-safe shared state, `Scoped` for per-request things (`DbContext`), `Transient` for lightweight stateless services.
- A singleton must never depend on a scoped service (captive dependency). Development builds validate this (`ValidateScopes`); keep it on.
- Inside a singleton or `BackgroundService` that needs a scoped service, create a scope: `using var scope = scopeFactory.CreateScope();`.
- Config: bind with `services.AddOptions<T>().Bind(config.GetSection("X")).ValidateDataAnnotations().ValidateOnStart();` and inject `IOptions<T>`. Never read secrets from code or committed `appsettings.json`.
- Constructor injection only. No service locator (`IServiceProvider.GetService` in business code).

## 8. Errors

- Throw specific exceptions; `throw;` to rethrow (never `throw ex;`, it loses the stack).
- Don't catch `Exception` except at a boundary (middleware, background loop) where you log and keep going.
- Log with structured templates: `logger.LogInformation("Order {OrderId} paid", id)`, never string interpolation in the template.

## 9. Tooling (dotnet CLI and analyzers)

- Build: `dotnet build -warnaserror` in CI. Format check: `dotnet format --verify-no-changes`.
- Packages: `dotnet add package <Id>`; check with `dotnet list package --outdated` and `dotnet list package --vulnerable`.
- Turn on the built-in analyzers in `.csproj` or `Directory.Build.props`. Settings and the rules most worth enforcing are in `references/analyzers.md`.
- Don't add third-party analyzer packages or change `AnalysisLevel` without asking the user; they can break the build for the whole team.

## Never

- `async void`, `.Result`, `.Wait()` in request or UI code.
- `catch { }` or `catch (Exception) { }` that swallows errors.
- `!` to silence a nullable warning you don't understand.
- `#pragma warning disable` or `<NoWarn>` to make a build pass without telling the user.
- `new HttpClient()` per call, or `DateTime.Now` in testable logic (inject `TimeProvider`).

## Report back

End with: files changed, the `dotnet build` warning count before and after, analyzer or nullable settings you changed (if any), and anything you chose not to fix.
