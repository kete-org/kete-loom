---
name: tdd-workflow
description: Test-first development loop that writes a failing test, makes it pass with the smallest change, then refactors with the suite green. Use when adding a feature, fixing a reproducible bug, or refactoring code in a project that has (or should have) automated tests.
license: MIT
compatibility: Any Agent Skills host. Needs the project's test runner and git.
metadata:
  kete-loom/version: "0.2.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# TDD workflow

Drive every behaviour change with a test that fails first. The loop is short on purpose: red, green, refactor, commit.

## 0. Before you start

1. Find how this project runs tests. Check, in order: the README, `AGENTS.md`, `package.json` scripts, `Makefile`, `pyproject.toml`, `go.mod`, `Cargo.toml`, CI config in `.github/workflows/`.
2. Run the existing suite once. Record the result.
   - If it already fails, **stop and tell the user** which tests fail before changing anything. Do not "fix" unrelated failures silently.
3. Restate the behaviour you are about to build as 1–5 concrete examples (input → expected output). If you cannot, ask the user for the missing detail.

## 1. Red: write one failing test

- Pick the **smallest** example that is not yet supported.
- Put the test next to existing tests for that module, following their naming, fixtures and style.
- Test behaviour through the public interface, not private helpers.
- Run only that test. It must fail **for the expected reason** (assertion fails, or the function doesn't exist). A test that fails because of a typo or import error doesn't count; fix the test and rerun.

For a bug fix, the first test reproduces the bug exactly as reported.

## 2. Green: make it pass

- Write the least code that makes the test pass. Hard-coding is acceptable at this step if the next test will force generalisation.
- Run the single test, then the whole related test file.
- Do not add features no test asks for.

## 3. Refactor: clean up with the suite green

- Remove duplication, improve names, extract functions.
- Run the full suite after each refactor. If anything goes red, undo the last refactor rather than debugging forward.

## 4. Repeat or finish

Go back to step 1 with the next example until every example from step 0 is covered. Then also cover:

- Edge cases: empty input, boundaries, invalid input, and the error path.
- Anything the user called out as important.

Prefer a few meaningful tests over chasing a coverage number. If the project enforces a coverage threshold, meet it.

## 5. Commit

When the full suite is green, commit with a message that states the behaviour added or the bug fixed. One logical change per commit. Don't commit if the suite is red.

## Rules

- Never delete, skip or weaken an existing test to make the suite pass. If an existing test is wrong, explain why to the user and get agreement first.
- Never mock the unit under test. Mock only slow or external boundaries (network, clock, filesystem when needed).
- Keep tests deterministic: no real network calls, fixed seeds, fixed time.
- If you can't get to green after three focused attempts, stop and report what you tried and what you observed.
- Production code written before its test doesn't count. Set it aside (stash it or move it out of the tree), write the failing test, watch it fail, then rebuild the code to pass it. Don't adapt the old code to the new test; use it as a reference at most. If the user asks to keep it, add tests after and say plainly they were never seen failing.
- Before adding a mock, a test helper or a cleanup method, check `references/testing-anti-patterns.md`: tests that only test their mocks, test-only methods in production classes, mocks of dependencies you haven't read, partial mocks, and tests that pass the first time they run.

## Report back

End with: tests added (names), the command you ran, the final pass/fail counts, and anything left uncovered.
