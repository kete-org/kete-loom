---
name: capture-lessons
description: Once per session, when the agent finishes with changes in the repository, asks it to propose up to three reusable lessons from the session for /learn, saving nothing unless you approve.
license: MIT
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/event: "stop-gate"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Capture lessons

Runs when the agent ends its turn, in a git repository with uncommitted changes. Once per session, it sends the agent back with one request: propose at most three lessons this session taught. Each lesson can be a mistake it made, a correction you gave, or something it had to work out about the project. A lesson is written as one line plus the evidence for it, or as "No lessons".

The agent saves nothing on its own. You turn the lessons you want into rules, skills or AGENTS.md entries with `/learn`. When the skill observation log exists (`kete-loom observe`), the agent logs them there instead, and `/skill-review` turns them into staged changes later.

It remembers which sessions it has asked in `~/.kete-loom/state/capture-lessons.json` (set `KETE_LOOM_STATE_DIR` to move it). It keeps them per session when the host sends a session id, otherwise once per project per day. It reads no files and never uses the network.

Available in Claude Code, Codex, Gemini CLI, Cursor and GitHub Copilot. Kete Code's and OpenCode's stop hooks can't send the agent back to work.

Opt-in: `--hooks` leaves it out; install it by name with `--hook`.
