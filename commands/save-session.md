---
name: save-session
description: Save a handoff note recording the current goal, progress, decisions and next steps so a later session can resume.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "[note title or focus]"
  kete-loom/owner: "Kete-org"
---

Write a session handoff note so this work can be picked up later by you or another agent.

If the `session-handoff` skill is available, follow it. Otherwise:

1. Gather the facts: the goal, what is done, what is in progress, decisions made and why, dead ends tried, and the exact next step. Check `git status` and the recent commits if this is a repository, and note uncommitted work.
2. Use the location the project already uses for handoff notes (an existing `HANDOFF.md`, `.handoff/` or `docs/handoff/`). If there is none, write `.handoff/<branch-or-topic>.md` at the repo root, creating the folder if needed; update that file rather than adding a new one for the same line of work.
3. Use this format:

```
# Session: <title>
Updated: <YYYY-MM-DD HH:MM, timezone>  Branch: <branch>  Last commit: <short sha>
## Goal
## Done
## In progress
## Decisions
## Tried and rejected
## Next steps
1. <first concrete action, with file paths and commands>
## Open questions
```

4. Never put secrets, tokens or personal data in the note. Ask the user whether the note should be committed or kept local; do not commit it or edit `.gitignore` unless they say so.
5. Print the path of the note.

Title or focus from the user, if any: $ARGUMENTS
