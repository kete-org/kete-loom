---
name: fix-bug
description: Fix a reported bug by reproducing it as a failing regression test, finding the root cause, making the smallest fix, verifying, reviewing the diff and offering a commit.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "<bug report, issue link or failing behaviour>"
  kete-loom/owner: "Kete-org"
---

Fix the bug described below. If no bug was given, ask for the report (what happened, what was expected, how to trigger it) and stop.

1. **Understand.** Restate the bug as: input or steps, expected result, actual result. If you can't, ask the user for the missing detail. Run the existing test suite once; if it already fails, report which tests fail and ask before going on.
2. **Reproduce as a failing test.** Write a regression test that reproduces the bug exactly as reported, next to the existing tests for that code and in their style. Run it and confirm it fails for the reported reason, not a typo or import error. If the `tdd-workflow` skill is available, follow its red step. If the bug can't be captured in an automated test (timing, environment, external service), write down the manual reproduction, show it failing, and tell the user why there is no test.
3. **Find the root cause.** Trace from the failing test to where the wrong value first appears; read the code, add temporary logging, or use `git log -L` or `git bisect run <script>` when the bug is a regression (keep the new test in a script or file outside the tracked tree, since older commits don't contain it). Search the codebase for every caller of the function you will change and for the same mistake elsewhere. State the root cause in one sentence before editing. Fix the cause, not the symptom (no special-casing the reported input).
4. **Smallest fix.** Change only what the root cause requires. No refactors, renames or dependency upgrades in the same change. Never weaken, skip or delete an existing test to get green; if one conflicts with the fix, stop and ask.
5. **Verify.** Run the new test (now passing), the tests for the changed module and its callers, then the full check set. If the `verification-loop` skill is available, follow it; otherwise run the project's build, lint, type-check and test commands. If the fix touches a shared module, consider the `change-impact-analysis` skill for its consumers.
6. **Review the diff.** Delegate to the `code-reviewer` agent if it is available (or the reviewer for that language); otherwise read `git diff` yourself for correctness, error paths, and leftover debug code. Remove temporary logging.
7. **Offer a commit.** Propose a message such as `fix(<area>): <what was wrong>` with the root cause in the body and the issue reference if given. Commit only if the user agrees; never push.

Stop and ask the user if the fix changes documented or public behaviour, needs a data migration or a dependency change, or if three focused attempts haven't found the root cause.

Report:

```
## Bug fix: <summary>
Reproduction: <test path::name, or manual steps>
Root cause: <one sentence, file:line>
Fix: <files changed: what>
Verification: <commands> -> <pass/fail counts>
Review: <findings addressed, or none>
Commit: <proposed message> (committed: yes/no)
```

Bug report from the user: $ARGUMENTS
