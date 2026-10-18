---
name: fsharp
description: Always-on rules for F# code, covering immutability, discriminated unions and exhaustive matching, Option and Result, async and task code, .NET interop, and checks.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.fs, **/*.fsi, **/*.fsx"
  kete-loom/owner: "Kete-org"
---

- Prefer immutable values, records and F# collections; use `mutable` or `ref` only for local, contained state.
- Model closed sets of cases with discriminated unions and match them exhaustively; never ignore incomplete-match warnings.
- Avoid the wildcard `_` case over a union you own, so a new case is a compile warning at every match.
- Use `Option` for absence and `Result` for expected failures; keep exceptions for truly exceptional conditions.
- Never call `Option.get`, `List.head` or `.Value` on something that can be empty; match on it or use a safe function such as `List.tryHead`.
- Convert nulls from .NET APIs at the boundary with `Option.ofObj` or `Option.ofNullable`.
- Keep file order in the project file meaningful: a file only uses what is defined above it, so put new types before their users.
- Never block on async work with `Async.RunSynchronously` or `.Result` inside library or server code; compose with `async { }` or `task { }`.
- Pass a `CancellationToken` through async and task workflows that do I/O.
- Dispose resources with `use` or `use!`, not `let`.
- Never build SQL by string concatenation; use parameters or the data library's parameterized API.
- Annotate parameter and return types on public functions so an inference change cannot silently change the API.
- Treat compiler warnings as errors where the project does, and run `dotnet build` and `dotnet test` before finishing.
- Use the project's configured formatter and test framework.

For more, load the fsharp-patterns and fsharp-testing skills.
