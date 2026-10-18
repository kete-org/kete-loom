---
name: notify-on-stop
description: Shows a desktop notification when the agent finishes its turn, so you can switch away during long tasks and come back when it is your move.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/event: "stop"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Notify on stop

Runs when the agent ends its turn and shows a notification naming the project folder:

- on macOS through `osascript`;
- on Linux through `notify-send`, when it is installed.

On Windows and on machines with neither, it does nothing. It never blocks, never changes files and never uses the network.

Available in Claude Code, Codex, Gemini CLI, Kete Code, Cursor and GitHub Copilot.

Opt-in: `--hooks` leaves it out; install it by name with `--hook`.
