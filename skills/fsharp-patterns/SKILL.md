---
name: fsharp-patterns
description: Idiomatic F# for writing and restructuring code - discriminated unions and records that make illegal states unrepresentable, Option and Result pipelines instead of exceptions and null, task/async/result computation expressions, compilation-order-aware module layout, and safe .NET interop. Use when writing new F# code, modelling a domain in F#, converting exception-heavy or C#-style F# to a functional style, or calling .NET libraries from F#.
license: MIT
compatibility: Any Agent Skills host. Needs the .NET SDK (dotnet CLI). Nullable reference type guidance needs F# 9 or later.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "dotnet"
  kete-loom/owner: "Kete-org"
---

# F# patterns

Write F# that the compiler can check: types carry the rules, functions are total, errors are values, and side effects live at the edges.

## 0. Before you write

1. Open the `.fsproj` and read the `<Compile Include=...>` list. F# compiles files **in that order**; a file can only use what is above it.
2. Check the target framework and `LangVersion`, and whether `<Nullable>enable</Nullable>` is set (F# 9+).
3. Check `<PackageReference>` (or `paket.references`) for FsToolkit.ErrorHandling, FSharpPlus or similar. Use what the project already has; don't add a library for a few helpers.
4. Match the existing style: Fantomas config (`.editorconfig`), module vs namespace usage, naming. If the project is formatted with Fantomas, run `dotnet fantomas <files>` after editing.

## 1. Model the domain with types

- **Records** for data that always has all its fields. **Discriminated unions** for "one of these". Never a record with a `Kind: string` plus optional fields that only apply to some kinds.
- **Single-case unions with a private constructor** for validated primitives, with a `create` that returns `Result`:

```fsharp
type EmailAddress = private EmailAddress of string

module EmailAddress =
    let create (s: string) =
        if System.String.IsNullOrWhiteSpace s || not (s.Contains '@')
        then Error "invalid email"
        else Ok (EmailAddress (s.Trim()))
    let value (EmailAddress s) = s
```

- Encode states as cases, not flags: `type Order = Draft of DraftOrder | Paid of PaidOrder | Shipped of ShippedOrder`, so a function that ships only accepts `PaidOrder`.
- Use `[<Measure>]` units for money and quantities that must not mix (`decimal<GHS>`). Use `decimal`, never `float`, for money.
- Use `option` for "may be absent". Use `| null` (F# 9) only at interop boundaries, never to model missing domain data.
- Add `[<RequireQualifiedAccess>]` to unions whose case names would clash (`Status.Active`).

## 2. Keep functions total

- No partial functions on input you don't control: avoid `List.head`, `List.find`, `Seq.head`, `Map.find`, `Array.get`/`arr.[i]`, `Option.get`, `.Value` and `int "abc"`. Use `List.tryHead`, `List.tryFind`, `Map.tryFind`, `Array.tryItem`, `Int32.TryParse`.
- Every `match` must be complete. Treat warning FS0025 (incomplete matches) as an error: `<WarningsAsErrors>$(WarningsAsErrors);FS0025</WarningsAsErrors>` (append, so existing entries survive).
- Avoid a trailing `| _ ->` on your own unions: it hides new cases. List the cases so adding one breaks the build where it matters.
- Prefer immutable values and `List`/`Map`/`Set`. Use `mutable` or `ref` only inside a function for a local loop or measured hot path, never shared across threads or captured in a closure that outlives it.

## 3. Errors as values

Decision rule:

| Situation | Use |
|---|---|
| Value may be missing, no reason needed | `Option` |
| Expected failure the caller must handle (validation, not found, conflict) | `Result<'T, DomainError>` with a union error type |
| Bug or broken invariant (should never happen) | exception (`invalidOp`, `failwith`) |
| .NET call that throws on expected failure (I/O, parsing, HTTP) | catch at the boundary, convert to `Result` |

- Make the error type a union (`type OrderError = NotFound of OrderId | OutOfStock of Sku | PaymentDeclined of string`), not `string`, once callers branch on it.
- Compose with `Result.bind`, `Result.map`, `Result.mapError`, `Option.bind`, `Option.map`, `Option.defaultValue`.
- Convert at the edges: `Option.ofObj` / `Option.ofNullable` for .NET nulls, `Result.requireSome` (FsToolkit) or a small helper for Option to Result.
- Wrap throwing calls once, at the boundary, and catch the specific exception:

```fsharp
let readConfig path =
    try Ok (System.IO.File.ReadAllText path)
    with
    | :? System.IO.FileNotFoundException -> Error (ConfigMissing path)
    | :? System.UnauthorizedAccessException -> Error (ConfigDenied path)
```

Never catch `exn` and turn it into `Ok` or a default; never use `try ... with _ -> ()`.

## 4. Computation expressions

- `task { }` for code that talks to .NET (ASP.NET Core, EF Core, HttpClient). It is hot (starts immediately) and has less overhead.
- `async { }` for cold, composable workflows and F#-first libraries; pass `CancellationToken` via `Async.CancellationToken` or explicit parameters. Convert with `Async.AwaitTask` and `Async.StartAsTask` at the boundary only.
- Don't mix: pick one per layer. Never block with `.Result`, `.Wait()` or `Async.RunSynchronously` except in `main` or a script.
- `result { }`, `option { }`, `asyncResult { }`, `taskResult { }` and `validation { }` come from FsToolkit.ErrorHandling (not FSharp.Core; a FsToolkit.ErrorHandling.TaskResult package also exists, so check which one the project references before using `taskResult`). Use them if the project references it; otherwise use `Result.bind` pipelines, or ask before adding the package.
- `let!` binds, `do!` awaits unit, `return!` returns a wrapped value, `and!` runs applicatively (accumulates errors in `validation { }`).
- In `task { }`, `use` disposes when the task finishes; don't return a disposable resource out of the block.

```fsharp
// deps.FindCustomer and deps.Save return Task<Result<_, OrderError>>
let placeOrder (deps: Deps) (req: PlaceOrderRequest) : Task<Result<OrderId, OrderError>> =
    taskResult {
        let! customer = deps.FindCustomer req.CustomerId
        let! lines = validateLines req.Lines |> Result.mapError InvalidLines
        let order = Order.create customer lines
        do! deps.Save order
        return order.Id
    }
```

## 5. Modules and file order

- Order files bottom-up: domain types, then pure domain logic, then infrastructure (DB, HTTP), then composition root / `Program.fs` last.
- One concept per file: a type and its module of functions with the same name (`type Order` + `module Order`), types first.
- Use `namespace` at the top of library files and modules inside; a top-level `module X` is fine for small apps and scripts.
- Mutually recursive types go in one `type ... and ...` group or a `namespace rec`; use `rec` sparingly, not to dodge file order.
- Keep side effects out of domain modules. Pass dependencies as function parameters or a small record of functions; reach for interfaces only when interop needs them.
- Mark helpers `private` and keep public surface small. Add `.fsi` signature files only if the project already uses them.

## 6. .NET interop

- Treat every value from a C#/.NET API as possibly null: wrap with `Option.ofObj`, `Option.ofNullable`, or `match x with null -> ... | v -> ...`. With `<Nullable>enable</Nullable>`, annotate interop types as `string | null` and let the compiler warn.
- `TryParse`-style out parameters return a tuple: `match Int32.TryParse s with | true, n -> Some n | _ -> None`.
- Expose C#-friendly APIs from library code consumed by C#: classes with members, `Task<T>` not `Async<T>`, `seq`/`IReadOnlyList` not F# `list`, no curried public members, `[<CompiledName>]` where useful.
- Records and unions get structural equality; .NET classes don't. Don't use classes as `Map` keys unless they implement equality.
- `[<CLIMutable>]` on records only when a serializer or ORM needs a parameterless constructor. For JSON with unions, use the project's serializer setup (for example FSharp.SystemTextJson) rather than hand-written converters.
- Implement `IDisposable` with `interface IDisposable with member _.Dispose() = ...` and bind with `use`, not `let`.

## Never

- Never use exceptions for control flow inside a `Result` pipeline.
- Never `ignore` a `Result`, `Task` or `Async` (`|> ignore` on a `Task<Result<_,_>>` drops the error).
- Never add `| _ ->` just to silence FS0025.
- Never reorder `.fsproj` files without checking every file that depended on the old order still compiles.

## Stop and ask the user

- Before adding a NuGet package (FsToolkit.ErrorHandling, FSharpPlus, a JSON library).
- Before changing a public signature that C# or other assemblies consume.
- When the domain rule is unclear (which states are valid, which errors callers need to distinguish).

## Report back

List the files changed and where they sit in the compile order, any new types or error cases, and the build or test command you ran with its result.
