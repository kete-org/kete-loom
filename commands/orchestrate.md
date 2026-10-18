---
name: orchestrate
description: Split a large task into independent pieces, run them in parallel subagents, then verify and merge their results.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<the task>"
  kete-loom/owner: "Kete-org"
---

Use the `parallel-agent-orchestration` skill if it is available. Otherwise:

1. **Split.** Break the task into pieces that don't edit the same files and don't depend on each other's output. If it doesn't split cleanly, say so and do it in one pass instead.
2. **Contract.** For each piece, write what it must do, which files it may touch, and exactly what it must return (for example a list of changed files and a one-line summary). Show the plan and ask before starting.
3. **Run.** Start one subagent per piece in parallel, using this host's way of delegating work. Give each its contract and nothing it doesn't need.
4. **Verify and merge.** Read every result; never trust a summary without checking the files. Resolve overlaps, then run the project's checks once over the combined change.
5. **Report** per piece: done, failed or partly done, and what remains.

Task: $ARGUMENTS
