---
name: verify
description: Verify the current changes by running the project's build, lint, type-check and tests, then report pass or fail.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[package or area to focus on]"
  kete-loom/owner: "Kete-org"
---

Verify the current changes before they are committed or merged.

If the `verification-loop` skill is available, follow it. Otherwise:

1. Find the project's checks in its CI workflow files, package scripts, Makefile or task runner. CI is the source of truth; don't invent commands.
2. Run them in order: build, format check, lint, type-check, tests. Stop at the first failure, fix it only if the fix is safe and obvious, and run that check again.
3. Report each check as pass or fail with the command you ran, then one overall verdict.

Focus from the user, if any: $ARGUMENTS
