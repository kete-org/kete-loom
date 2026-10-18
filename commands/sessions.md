---
name: sessions
description: List the session handoff notes in this repository with their branch, date and next step, and tidy up ones that are finished, only with the user's go-ahead.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "[list | prune]"
  kete-loom/owner: "Kete-org"
---

Handoff notes are written by the `session-handoff` skill (or `/save-session`) to `.handoff/<branch>.md`, `HANDOFF.md` or `docs/handoff/`.

**List** (default): find every note in those places. For each, show the path, last modified date, the branch it names, its one-line state, and its first next step. Mark notes whose branch no longer exists (`git branch --list`) or has been merged (`git branch --merged`).

**Prune** (`prune`): propose notes to remove: those for merged or deleted branches, and those untouched for more than 30 days. Show the list and ask before deleting anything. If a note is tracked by git, delete it with `git rm` so the user can review it before committing; never commit on their behalf.

To continue from a note, use `/resume-session`.

Request: $ARGUMENTS
