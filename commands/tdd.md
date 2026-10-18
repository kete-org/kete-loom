---
name: tdd
description: Implement the requested change test-first, writing one failing test, the smallest code to pass it, then refactoring, step by step.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "<feature or bug to implement>"
  kete-loom/owner: "Kete-org"
---

Implement the change below test-first.

If the user gave no change, ask for one and stop.

If the `tdd-workflow` skill is available, follow it. Otherwise:

1. Find the test runner and existing tests near the code you will change. Run the suite once; if it already fails, report that and ask before going on.
2. Break the change into small behaviours. For each one:
   - Write one test for it and run it. It must fail for the expected reason; if it passes, the test is wrong or the behaviour already exists.
   - Write the smallest code that makes it pass. Run the tests.
   - Refactor with the tests green.
3. For a bug fix, the first test reproduces the bug.
4. Never weaken, skip or delete an existing test to get green. If one blocks you, stop and ask.
5. Finish with the full suite and report:

```
## TDD: <change>
Tests added: path::name (one line each)
Code changed: path: what
Suite: <command> -> <pass/fail counts>
Not covered: ...
```

Change: $ARGUMENTS
