---
name: test-coverage
description: Find untested behaviour in the current change and add focused tests for it, then show the coverage before and after.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[files or area to cover]"
  kete-loom/owner: "Kete-org"
---

Close the test gaps in the current change.

1. If the `pr-test-analyzer` agent is available, ask it to list the untested behaviour in the current diff, ranked by risk.
2. If the `test-coverage-improvement` skill is available, follow it to add the tests. Otherwise:
   - Find the project's test command and coverage command in CI, package scripts or the Makefile. Run the coverage command once to get a baseline.
   - For each changed function or branch without a test, add a test next to the existing tests, in their style and framework. Cover the error paths and edge cases, not just the happy path.
   - Test behaviour through the public interface. Do not change production code to make it testable without asking the user first.
   - Never weaken or delete an existing test, and never write a test that only asserts the code runs.
3. Run the new tests and the full suite. If a new test fails because the code is wrong, stop and report the bug instead of changing the test to pass.
4. Report: tests added (file and what each covers), coverage before and after if measured, and any gaps you left with the reason.

Files or area from the user, if any: $ARGUMENTS
