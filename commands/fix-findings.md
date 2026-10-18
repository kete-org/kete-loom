---
name: fix-findings
description: Work through review or audit findings one at a time, confirming each is real, fixing it with a regression test, verifying and committing per fix. Supports --max <n> and --dry-run.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "<findings list or report file> [--max <n>] [--dry-run]"
  kete-loom/owner: "Kete-org"
---

Fix the findings given below, one at a time. For comments on your own pull request that need replies in the thread, use the `responding-to-code-review` skill instead.

**Input.** The findings are pasted below or in a report file path given below (output of `/review`, `/security-scan`, a reviewer agent, an audit, a linter export). If there are none, ask for them and stop. Options: `--max <n>` fixes at most n findings this run (default: all confirmed ones); `--dry-run` classifies and plans but changes nothing.

1. **Check the start state.** Run `git status`. If there are uncommitted changes that aren't yours, ask before going on. Run the project's checks once (the `verification-loop` skill or `/verify`); if they already fail, report which and ask whether to continue.
2. **Parse and order.** Give each finding a number, its file:line, severity and one-line claim. Order by severity, then by file so related fixes stay together. Merge duplicates.
3. **Classify each one** by reading the code it points at, its callers and any guard upstream:
   - `fix`: real, and the fix is clear and local.
   - `needs decision`: real, but fixing it changes public behaviour, an API, a schema or data, needs a dependency, or has more than one reasonable fix.
   - `false positive`: the code is already correct; say what handles it (file:line).
   - `unclear`: you can't reproduce or locate it.
   Show the table. With `--dry-run`, stop here and add the planned fix for each `fix` item.
4. **Fix the `fix` items in order, up to `--max`.** For each:
   1. Write a test that fails because of the finding (follow the `tdd-workflow` red step if available). If it can't be tested automatically (config, docs, a log message), say why.
   2. Make the smallest change that removes the root cause. No unrelated refactors.
   3. Run the new test, the tests for that module, then the full checks.
   4. If it passes, commit only that fix's files: `fix(<area>): <finding>` with the finding number or source in the body. If it fails and two focused attempts don't fix it, undo your change for that item (`git restore -- <files>` on files only you touched, and delete files you created for it), mark it `failed`, and move on.
   Never weaken, skip or delete an existing test to get green.
5. **Stop and ask** at the first `needs decision` item that blocks others, if a fix would touch more than the finding requires, or if a security finding has signs of active exploitation or exposed secrets (secrets need rotating, not just removing).

Never push. Never commit unrelated changes. Never fix a `false positive` to make it go away.

Report:

```
## Findings: <source>
Fixed: <n>   Needs decision: <n>   False positive: <n>   Unclear: <n>   Failed: <n>   Not reached (--max): <n>
| # | Finding | Status | Test | Commit |
|---|---|---|---|---|
Decisions needed:
- #<n>: <question and the options>
Checks: <commands> -> pass/fail
```

Findings and options: $ARGUMENTS
