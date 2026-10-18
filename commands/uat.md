---
name: uat
description: Run user acceptance testing with the user on the current phase, feature or ticket, one check at a time, and save the results to a UAT file.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: writes-files
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[phase, feature, ticket or plan file]"
  kete-loom/owner: "Kete-org"
---

Run user acceptance testing on the work named below, with the user trying each step.

If the `acceptance-testing` skill is available, follow it. Otherwise:

1. Find what the work was meant to do: the plan or phase file, ticket, pull request description or spec named below, or `.planning/` if the project has one. If nothing says, ask the user for the requirements and stop.
2. If a UAT file for this work already exists with pending or failed checks, resume it.
3. Write one check per requirement: exact steps, the expected observable result, and the requirement it covers. Show the list and ask the user to confirm it.
4. If setup, config, dependencies or migrations changed, first run a cold start from a fresh clone in a temporary folder using only the written setup docs.
5. Present one check at a time; the user tries it and answers. Record pass, fail (in their words, with a reproduction), skipped or blocked in the UAT file before the next check. Never mark a check passed without their answer.
6. Hand each failure to the `systematic-debugging` skill or `/fix-bug`, and re-run the check with the user after the fix.
7. Report: result (accepted, accepted with known issues, not accepted, incomplete), counts, failures and where they went, the UAT file path, and everything still unverified.

Work to test: $ARGUMENTS
