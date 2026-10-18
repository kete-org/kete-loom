---
name: fsharp-testing
description: Writes and fixes F# tests with Expecto or xUnit, FsCheck property-based tests for invariants, Unquote quotation assertions, and correct testing of task and async code without blocking. Use when adding tests to an F# project, turning example-based F# tests into properties, choosing between Expecto and xUnit for F#, or debugging flaky or hanging F# async tests.
license: MIT
compatibility: Any Agent Skills host. Needs the .NET SDK (dotnet CLI) and the project's test packages.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "dotnet"
  kete-loom/owner: "Kete-org"
---

# F# testing

Test behaviour through public functions, prefer properties for invariants, and keep async tests asynchronous.

## 0. Find the setup first

1. Find the test project (`*.Tests.fsproj`) and read its `<PackageReference>`s (or `paket.references`): Expecto, xUnit (`xunit` or `xunit.v3`), NUnit, FsCheck, `FsCheck.Xunit` / `FsCheck.Xunit.v3`, `Expecto.FsCheck`, Unquote.
2. **Use the framework already there.** Don't add Expecto to an xUnit project or the reverse. If there is no test project, ask the user which one; default to Expecto for F#-only code and xUnit when the solution already uses it for C#.
3. Run the suite once: `dotnet test` (or `dotnet run --project tests/X.Tests` for Expecto projects without the test adapter). If it already fails, **stop and tell the user** before changing anything.
4. Remember file order: a new test file must be added to `<Compile Include=...>` in the test `.fsproj`, after the helpers it uses and before `Main.fs` / `Program.fs`.

## 1. Expecto

```fsharp
module OrderTests

open Expecto

[<Tests>]
let tests =
    testList "Order" [
        testCase "total sums line amounts" <| fun () ->
            let order = Order.create [ line 2 10m; line 1 5m ]
            Expect.equal (Order.total order) 25m "total"

        testCase "empty order is rejected" <| fun () ->
            Expect.isError (Order.tryCreate []) "empty order"

        testTask "saves and reloads" {
            let! saved = repo.Save order
            let! loaded = repo.Load saved.Id
            Expect.equal loaded (Some saved) "round trip"
        }

        testCaseAsync "async workflow" <| async {
            let! r = Workflow.run input
            Expect.isOk r "workflow"
        }
    ]
```

- `Expect.*` arguments are **actual, expected, message**. Swapping them gives misleading failure output.
- Entry point: `[<EntryPoint>] let main argv = runTestsInAssemblyWithCLIArgs [] argv`, with `[<Tests>]` on each test value.
- For `dotnet test` and IDE discovery, reference `YoloDev.Expecto.TestSdk` and `Microsoft.NET.Test.Sdk`.
- Never commit `ftestCase` / `ftestList` (focused) or `ptestCase` (pending) by accident; focused tests silently skip the rest of the suite.
- Use `testSequenced` for tests that share a resource (a database, a port); Expecto runs tests in parallel by default.

## 2. xUnit

```fsharp
module OrderTests

open Xunit
open Swensen.Unquote

[<Fact>]
let ``total sums line amounts`` () =
    let order = Order.create [ line 2 10m; line 1 5m ]
    test <@ Order.total order = 25m @>

[<Theory>]
[<InlineData("", false)>]
[<InlineData("a@b.co", true)>]
let ``email validation`` (input: string, ok: bool) =
    test <@ Result.isOk (EmailAddress.create input) = ok @>

[<Fact>]
let ``saves and reloads`` () = task {
    let! saved = repo.Save order
    let! loaded = repo.Load saved.Id
    loaded =! Some saved
}
```

- Use backtick names that read as sentences. Put tests in a module, not a class, unless you need fixture constructors or `IDisposable` cleanup.
- Async tests return `Task` via `task { }`. Never call `.Result`, `.Wait()` or `Async.RunSynchronously` in a test; it can deadlock and hides the real exception.
- Use `Assert.ThrowsAsync<T>` (or Unquote `raises`) for expected exceptions, not `try ... with`.

## 3. Unquote

- `test <@ expr @>` fails with a step-by-step reduction of the expression, which beats `Assert.True`.
- Operators: `actual =! expected`, `actual <>! other`, `x >! y`, `raises<ArgumentException> <@ f bad @>`.
- Works inside Expecto and xUnit. Keep each quotation to one claim; split compound `&&` checks into separate tests.

## 4. FsCheck property tests

Write a property when a rule holds for all inputs: round trips (`parse (format x) = x`), invariants (total is never negative), equivalence to a simple model, idempotence (`normalise (normalise x) = normalise x`).

```fsharp
// xUnit
[<Property>]
let ``reverse twice is identity`` (xs: int list) =
    List.rev (List.rev xs) = xs

// Expecto (Expecto.FsCheck)
testProperty "format then parse round trips" <| fun (m: Money) ->
    Money.parse (Money.format m) = Ok m
```

- Custom data: build a `Gen` and turn it into an `Arbitrary` with `Arb.fromGen`. Use `Gen.choose (lo, hi)`, `Gen.elements`, `Gen.map`, `Gen.filter` sparingly (heavy filters make FsCheck give up).
- Register generators as a type with static members returning `Arbitrary<'T>`, then `[<Property(Arbitrary = [| typeof<Generators> |])>]` in xUnit, or the `arbitrary` field of `FsCheckConfig` in Expecto.
- For validated types (private single-case unions), generate raw values that pass `create`, so properties exercise the real constructor.
- Use `==>` for preconditions only when they rarely fail; otherwise write a generator.
- When a property fails, FsCheck prints the shrunk counterexample and a seed. Copy the counterexample into a regular example test so it stays covered, then fix the code.
- FsCheck 2 and 3 differ (for example, 3 uses `ArbMap.defaults` where 2 used `Arb.Default`). Check the referenced version before copying examples.

## 5. Testing task and async code

- Test the async function itself; don't wrap it in a synchronous helper.
- Pass a `CancellationToken` in and assert cancellation behaviour with a pre-cancelled token.
- Replace real time and I/O with function parameters (`now: unit -> DateTimeOffset`, `send: Email -> Task<Result<unit, SendError>>`). Pass fakes as plain lambdas; you rarely need a mocking library in F#.
- For `Result`-returning workflows, assert on the exact error case (`Error (OutOfStock sku)`), not just `isError`.
- No real network or wall-clock sleeps. If a test needs a delay, the design needs an injected clock.

## Never

- Never delete, skip or weaken an existing test to make the suite pass without the user's agreement.
- Never leave focused (`ftest*`) or `Skip =` tests in a commit.
- Never assert on `ToString()` or `sprintf "%A"` output of records and unions; compare values, they have structural equality.

## Report back

List tests added (names and file), the command you ran (`dotnet test --filter ...` or the Expecto run), final pass/fail counts, any FsCheck seed that found a bug, and what is still untested.
