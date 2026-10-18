---
name: csharp-testing
description: Writes and fixes .NET tests in C# with xUnit (or the NUnit or MSTest framework already in the repo), FluentAssertions or built-in asserts, Moq or NSubstitute test doubles, WebApplicationFactory in-memory API tests and Testcontainers-backed database tests, all run through dotnet test. Use when adding unit or integration tests to a C# project, setting up a new .NET test project, mocking a dependency, or debugging a flaky or failing dotnet test run.
license: MIT
compatibility: Any Agent Skills host. Needs the .NET 8+ SDK. Testcontainers tests also need a running Docker-compatible engine.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "dotnet"
  kete-loom/owner: "Kete-org"
---

# C# testing

Tests that run with `dotnet test`, fail for one reason, and don't depend on the machine, the clock or test order.

## 0. Discover before writing

1. Find the test projects: search for `*.Tests.csproj` / `*Tests.csproj` and look at their `PackageReference`s.
2. **Use the framework, assertion and mocking libraries the repo already uses.** Do not add a second one. Detect by package:
   - xUnit: `xunit` (v2) or `xunit.v3`. NUnit: `NUnit` + `NUnit3TestAdapter`. MSTest: `MSTest` or `MSTest.TestFramework`.
   - Assertions: `FluentAssertions`, `Shouldly`, or framework asserts.
   - Doubles: `Moq`, `NSubstitute`, `FakeItEasy`.
3. Run `dotnet test` once and record pass/fail counts. If tests already fail, **stop and tell the user** before changing anything.
4. New test project with nothing to match: xUnit, built-in `Assert`, NSubstitute. Before adding FluentAssertions, tell the user that versions 8 and later need a paid Xceed licence for commercial use (version 7 is Apache 2.0); let them choose.

## 1. New test project

```bash
dotnet new xunit -n MyApp.Tests -o tests/MyApp.Tests
dotnet sln add tests/MyApp.Tests/MyApp.Tests.csproj
dotnet add tests/MyApp.Tests/MyApp.Tests.csproj reference src/MyApp/MyApp.csproj
```

Mirror the production namespace and folder structure. One test class per class under test (`OrderServiceTests`).

## 2. Unit test shape

- Name: `Method_Scenario_ExpectedResult` or the repo's convention.
- Arrange / Act / Assert, one behaviour per test. Several asserts are fine if they describe one outcome.
- Data-driven: xUnit `[Theory]` + `[InlineData]` / `[MemberData]`; NUnit `[TestCase]`; MSTest `[DataRow]`.
- Async tests return `Task` (never `async void`). Assert exceptions with `await Assert.ThrowsAsync<T>(() => sut.RunAsync())`.
- xUnit v3: pass `TestContext.Current.CancellationToken` to async calls (analyzer xUnit1051 flags it).
- Time: inject `TimeProvider` and use `FakeTimeProvider` (package `Microsoft.Extensions.TimeProvider.Testing`). Never `Thread.Sleep` or `DateTime.Now` in tests.
- Logging: `NullLogger<T>.Instance`, or `FakeLogger<T>` from `Microsoft.Extensions.Diagnostics.Testing` when you assert on logs.

## 3. Test doubles

- Mock only boundaries you own an interface for: repositories, HTTP clients, message buses, clocks. Never mock the class under test or simple value types.
- NSubstitute: `var repo = Substitute.For<IOrderRepository>(); repo.GetAsync(id, Arg.Any<CancellationToken>()).Returns(order);` verify with `await repo.Received(1).SaveAsync(...)`.
- Moq: `var repo = new Mock<IOrderRepository>(); repo.Setup(r => r.GetAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(order);` verify with `repo.Verify(..., Times.Once)`.
- Prefer asserting on the result over verifying calls. Verify a call only when the call **is** the behaviour (an email was sent).
- `HttpClient`: don't mock `HttpClient`. Use a fake `HttpMessageHandler`, or test through `WebApplicationFactory`.
- EF Core: don't mock `DbContext` or `DbSet`. The InMemory provider doesn't enforce constraints or transactions; use SQLite in-memory for quick tests and Testcontainers for real behaviour.

## 4. Integration tests

- ASP.NET Core APIs: `WebApplicationFactory<Program>` from `Microsoft.AspNetCore.Mvc.Testing`; swap services in `ConfigureTestServices`.
- Real databases, queues and caches: Testcontainers (`Testcontainers.PostgreSql`, `Testcontainers.MsSql`, `Testcontainers.Redis`), one container per test class or collection fixture, never per test.
- Full examples, fixture sharing and auth stubbing are in `references/integration-tests.md`.
- If Docker isn't available, **stop and tell the user**; don't silently replace a Testcontainers test with the InMemory provider.

## 5. Run and filter

- All: `dotnet test`. One project: `dotnet test tests/MyApp.Tests`.
- Filter: `dotnet test --filter "FullyQualifiedName~OrderServiceTests"` or `--filter "Category=Integration"` (xUnit `[Trait("Category","Integration")]`, NUnit `[Category]`, MSTest `[TestCategory]`). Under Microsoft.Testing.Platform (common with xUnit v3) the filter options differ by framework; always confirm the run reports a non-zero test count.
- Coverage: `dotnet test --collect:"XPlat Code Coverage"` (coverlet.collector), or the repo's existing coverage setup.
- Verbose failure output: `dotnet test --logger "console;verbosity=detailed"`.

## 6. Flaky tests

1. Run the single test 20 times in a loop. If it fails sometimes, look for: shared static state, test order dependence, real time or timers, unawaited tasks, ports or files shared between parallel tests.
2. xUnit runs test **classes** in parallel. Tests that share a resource go in one `[Collection("Name")]`.
3. Fix the cause. Do not add retries, `Skip`, or longer sleeps.

## Rules

- Never delete, skip (`[Fact(Skip=...)]`, `[Ignore]`) or weaken an existing test to make the suite pass without the user's agreement.
- No real network calls, real external services or production connection strings in tests.
- Don't add test packages beyond what the job needs, and match the version style the repo uses (central `Directory.Packages.props` or per-project).

## Report back

End with: tests added (names and files), the exact `dotnet test` command run, pass/fail/skip counts, packages added, and what is still untested.
