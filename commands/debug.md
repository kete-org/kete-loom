---
name: debug
description: Find the root cause of a bug, failing test or unexpected behaviour by evidence before proposing or making any fix.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "<symptom, error message or failing test>"
  kete-loom/owner: "Kete-org"
---

Find the root cause of the problem below before fixing anything.

If the user gave no symptom, ask for the error, the failing test or the steps that reproduce it, and stop.

If the `systematic-debugging` skill is available, follow it. Otherwise:

1. Read the full error and stack trace. Reproduce the failure reliably and write down the exact command or steps.
2. Check what changed: `git log`, `git diff`, recent dependency or config changes. For a regression, consider `git bisect run <script>`.
3. Trace the bad value back to where it first goes wrong, adding temporary logging at component boundaries if needed. Compare with similar code that works.
4. State one hypothesis and test it with the smallest possible change or experiment. If it is wrong, form a new one; do not stack fixes.
5. State the root cause in one sentence with file:line. To fix it, write a failing test first (`/fix-bug` or the `tdd-workflow` skill). If three fixes in a row fail, stop and question the design with the user.

Report: reproduction, root cause, evidence, proposed fix, and what is still unknown.

Problem from the user: $ARGUMENTS
