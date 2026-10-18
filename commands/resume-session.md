---
name: resume-session
description: Resume work from the latest session handoff note, checking it against the repository before taking the next step.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: read-only
  kete-loom/argument-hint: "[note path or slug]"
  kete-loom/owner: "Kete-org"
---

Pick up work from a saved session handoff note.

If the `session-handoff` skill is available, follow its resume steps. Otherwise:

1. Find the note: the path or slug the user gave below, otherwise the note for the current branch, or the most recently updated note, in the project's handoff location (`HANDOFF.md`, `.handoff/` or `docs/handoff/`). If there is none, say so and stop.
2. Read it, then check it against reality: current branch, last commit and `git status`. Point out anything that changed since the note was written, such as new commits, a different branch or missing uncommitted work.
3. Summarise for the user in a few lines: the goal, where things stand, and the next step from the note.
4. Ask the user to confirm before acting on the next step, unless they already asked you to continue. If the note conflicts with the repository state, ask which one to trust.

Note to resume from the user, if any: $ARGUMENTS
