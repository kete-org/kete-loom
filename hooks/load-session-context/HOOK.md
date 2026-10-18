---
name: load-session-context
description: At the start of each session, tells the agent the current branch, how many uncommitted changes there are, and the latest session handoff note, so it picks up where the last session stopped.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/event: "session-start"
  kete-loom/owner: "Kete-org"
---

# Load session context

Runs when a session starts, in a git repository only. It adds a short note to the agent's context:

- the current branch and the number of uncommitted changes (from `git status`);
- the session handoff note written by the `session-handoff` skill, if there is one: `.handoff/<branch>.md`, then `HANDOFF.md`, then the newest note in `.handoff/` or `docs/handoff/`. At most 60 lines are included, and the agent is told to check it against the repository before acting on it.

It only reads; it never changes files. Not available in OpenCode, which has no way for a hook to add context at session start.
