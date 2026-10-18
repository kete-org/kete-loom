---
name: context-monitor
description: Watches how full the agent's context window is after each tool call and warns the agent itself, once at 70% and again at 85%, to save its progress in a handoff note before compaction loses the details.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/event: "post-tool"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Context monitor

Hosts show you how full the context window is, but not the agent. After each tool call, this hook works out the share in use from the session transcript and adds a short note after the tool's result:

| Context used | The agent is told to |
|---|---|
| 70% | finish the current step, keep reads small, and save progress before starting anything big |
| 85% | stop starting new work and write a session handoff note now (`session-handoff` skill) |

Each level is announced once per session. When compaction brings usage back down, the levels re-arm.

Where the numbers come from:
- **Codex:** the transcript records the window size, so the share is exact.
- **Claude Code:** the transcript records token usage but not the window. The hook assumes 200k tokens unless usage is already larger, in which case it assumes 1M. Set `KETE_LOOM_CONTEXT_WINDOW` to your model's window for exact numbers.

It reads only the end of the transcript file and keeps which level each session has reached in `~/.kete-loom/state/context-monitor.json`. It never blocks a tool call.

Available in Claude Code and Codex; other hosts' hooks don't get a transcript with token usage.

Opt-in: `--hooks` leaves it out; install it with `--hook context-monitor` or `--profile strict`.
