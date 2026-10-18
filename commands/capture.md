---
name: capture
description: Park an idea, todo or seed in the project backlog in one line without starting work on it, then carry on with the current task.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<idea, todo, or 'when X: idea'> | --list | --review"
  kete-loom/owner: "Kete-org"
---

Save what the user wrote below to the backlog. Do not start working on it.

1. If the Kete Loom `idea-backlog` skill is available, follow it: `--list` lists open entries, `--review` runs its review, and anything else is captured.
2. Otherwise, fall back to this:
   - Classify the text: a "when / once / if / after" condition makes it a seed (keep the condition as `trigger:`), a small concrete action is a todo, anything bigger is an item, the rest is a note.
   - Check `.planning/backlog/` for an existing entry on the same thing and append to it if found.
   - Otherwise write `.planning/backlog/<kind>s/YYYY-MM-DD-<slug>.md` with frontmatter `kind`, `created`, `status: open`, `source`, and `trigger` for seeds, then a one-line title and up to five lines of context.
3. Reply with one line, `Saved <kind>: <path>`, then one line on where the current task stands, and continue it.

If nothing was given below, ask what to capture. Never edit code, research the idea or open a tracker issue as part of a capture.

To capture: $ARGUMENTS
