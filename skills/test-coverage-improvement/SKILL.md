---
name: test-coverage-improvement
description: Raises meaningful test coverage by measuring line and branch coverage, ranking untested code by risk and churn, adding tests that pin observable behaviour rather than executing lines, and using mutation testing (Stryker, PIT, mutmut, cargo-mutants, Infection) to prove the new tests catch faults. Use when coverage is low or below a CI threshold, when asked where tests are missing in a module, or when a team wants coverage numbers they can trust.
license: MIT
compatibility: Any Agent Skills host. Needs the project's test runner and its coverage tool; mutation testing tools are optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Test coverage improvement

Coverage tells you what code ran during tests, not what was checked. The goal is fewer escaped bugs, so spend tests where a bug would hurt and make every test assert something a user or caller would notice.

## 1. Measure the baseline

1. Find the existing coverage command in CI, package scripts or the Makefile. Use it if it exists.
2. Otherwise run the language default with **branch** coverage on where the tool supports it (Go reports statement coverage only; `cargo llvm-cov --branch` needs a nightly toolchain):

| Stack | Command |
|---|---|
| Jest | `npx jest --coverage` |
| Vitest | `npx vitest run --coverage` (needs `@vitest/coverage-v8`) |
| Python | `pytest --cov=<pkg> --cov-branch --cov-report=term-missing` (pytest-cov) |
| Go | `go test -coverprofile=cover.out ./...` then `go tool cover -func=cover.out` |
| Rust | `cargo llvm-cov` (cargo-llvm-cov) or `cargo tarpaulin` |
| Java | JaCoCo via `mvn verify` or `gradle jacocoTestReport` |
| .NET | `dotnet test --collect:"XPlat Code Coverage"` |
| PHP | `vendor/bin/phpunit --coverage-text` (needs Xdebug or PCOV) |

3. Record: total line %, branch %, and the per-file numbers. If the suite fails, **stop and tell the user** first; coverage from a red suite is meaningless.
4. If adding a coverage tool would add a dependency the project doesn't have, ask before installing it.

## 2. Find the risky gaps

Do not sort by "lowest %". Rank untested code by risk:

1. **Money, auth, permissions, data deletion, migrations** and anything security-sensitive.
2. **Branches with no test**: `else` paths, error handlers, early returns, `catch` blocks, default cases. Branch coverage reports show these as partial lines.
3. **High churn**: files changed often recently (`git log --since=6.months --name-only --format= | sort | uniq -c | sort -rn | head -20`). Churn plus low coverage is where regressions come from.
4. **Recent bugs**: code touched by recent fix commits.
5. Public API used by many callers.

Skip, and say you skipped: generated code, trivial getters and setters, framework glue with no logic, and code scheduled for deletion. Prefer excluding them in coverage config (with a comment) over writing hollow tests.

Write the top 5 to 10 targets as a list with the reason each one is risky, and confirm with the user if the list is long.

## 3. Write behaviour tests

For each target:

- Name the behaviour: "rejects a refund larger than the original charge", not "test refund function".
- Drive it through the public interface the callers use.
- Assert the observable result: return value, raised error and its type or message, state persisted, message sent. One behaviour per test.
- Cover the branch you found: the error path, the boundary (0, 1, max, empty, null), the permission denied case.
- Mock only external boundaries (network, clock, randomness, third-party services). Never mock the unit under test or its own collaborators just to reach a line.
- Follow the existing test style, folders and fixtures.

A test that would pass if the code under test returned a wrong value is not a test. Avoid:

- No assertion, or `expect(result).toBeDefined()` / `assert result is not None` as the only check.
- Snapshotting large output nobody reviews.
- Asserting that a mock was called, without checking the outcome.
- Calling a function in a loop over inputs just to light up lines.

## 4. Check with mutation testing

Mutation testing changes the code (flips `>` to `>=`, removes a call, returns a constant) and reruns the tests. A surviving mutant is a fault your tests don't catch.

| Stack | Tool | Run |
|---|---|---|
| JS/TS | StrykerJS | `npx stryker run` |
| Java/Kotlin (JVM) | PIT | `mvn org.pitest:pitest-maven:mutationCoverage` |
| Python | mutmut | `mutmut run`, then `mutmut results` |
| Rust | cargo-mutants | `cargo mutants` |
| PHP | Infection | `vendor/bin/infection` |
| C# | Stryker.NET | `dotnet stryker` |

- Scope it to the files you just tested; a full-repo run can take hours.
- For each surviving mutant: add or sharpen an assertion that kills it, or note it as equivalent (the change cannot alter behaviour).
- If no tool exists for the stack, do it by hand for the riskiest function: break one condition, run the tests, confirm one fails, revert.

## 5. Re-measure and lock in

1. Rerun the coverage command. Report before and after for the files you touched, line and branch.
2. If CI has a threshold, meet it. If it has none, suggest a ratchet (fail only if coverage drops) rather than an arbitrary target.
3. Run the full suite twice to check the new tests are deterministic.

## Rules

- Never delete, skip or weaken existing tests to change the number.
- Never add tests that assert current buggy behaviour without flagging it. If you find a bug, **stop and tell the user**, and write the test for the correct behaviour marked as expected-to-fail only if they agree.
- Never exclude risky code from coverage to raise the percentage.
- Don't chase 100 %. Stop when the risky list is covered and mutants are killed.

## Report back

```
Coverage: <line>% → <line>% lines, <branch>% → <branch>% branches (files touched)
Tests added: <file>: <test names>
Mutation: <killed>/<total> killed in <files>; survivors: <list or none>
Bugs found: <list or none>
Not covered, on purpose: <items and why>
Command: <exact commands run>
```
