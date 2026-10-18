---
name: loop
description: Run a bounded autonomous loop toward a goal, with a stop condition, a budget and a check after every iteration.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<goal> [max iterations]"
  kete-loom/owner: "Kete-org"
---

Use the `autonomous-loops` skill if it is available. Otherwise:

1. **Set the frame before starting**, and confirm it with the user: the goal, how success is checked (a command that passes, a number reached), the maximum iterations (default 5), and what the loop may not touch.
2. **Each iteration:** make one focused change toward the goal, run the check, and record one line: what changed, the check result, and the next step.
3. **Stop** when the check passes, the iteration limit is reached, two iterations in a row make no progress, or something needs a decision the user hasn't made (stop and ask). Never widen the scope to keep going.
4. **Report** the iterations, the final check result, and anything left unresolved.

Goal: $ARGUMENTS
