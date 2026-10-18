---
name: csharp
description: Always-on rules for C# and .NET code, covering nullable reference types, async and await, disposal, exceptions, data access safety, and build and test checks.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.cs"
  kete-loom/owner: "Kete-org"
---

- Keep nullable reference types enabled and fix nullable warnings; never silence them with `!` unless the value is proven non-null.
- Never block on async code with `.Result`, `.Wait()` or `.GetAwaiter().GetResult()`; use `await` all the way up.
- Never write `async void` except for event handlers. Return `Task` or `ValueTask`.
- Accept a `CancellationToken` in async APIs that do I/O and pass it to every call that takes one.
- Dispose every `IDisposable` with `using` or `await using`; never leave a stream, connection or reader open.
- Do not create a new `HttpClient` per request; use `IHttpClientFactory` or a shared instance.
- Throw specific exceptions and rethrow with `throw;`, never `throw ex;`, which loses the stack trace.
- Never build SQL by string concatenation or interpolation; use parameters or the ORM's parameterized APIs.
- Never deserialize untrusted data with `BinaryFormatter` or with type-name handling (such as Newtonsoft `TypeNameHandling` other than `None`) that lets the payload choose the type.
- Avoid enumerating an `IEnumerable<T>` or LINQ query more than once; materialize it with `ToList()` when you need it twice.
- Run `dotnet build` with warnings visible and `dotnet test`, and use the project's configured formatter and analyzers.

For more, load the csharp-patterns and csharp-testing skills.
