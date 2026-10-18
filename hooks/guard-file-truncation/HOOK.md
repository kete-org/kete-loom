---
name: guard-file-truncation
description: Stops the first whole-file write that would cut an existing file of 40 or more lines to under half its length, which usually means the agent read only part of it, and lets a deliberate rewrite through on the second try.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/event: "pre-edit"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Guard file truncation

An agent that reads 20 lines of a 300-line file, then writes "the file" back, silently deletes the other 280 lines. This hook runs before whole-file writes only. Those are Claude Code's Write, Gemini CLI's `write_file`, Kete Code's and OpenCode's `write`, and Copilot's `create`; edits that replace part of a file are never checked.

It blocks a write when the file already exists with at least 40 lines and the new content has fewer than half as many. The agent is told to read the whole file and make a targeted edit instead. If it really means to replace the file, it writes it again, and the second write of that file in the session goes through.

It reads the existing file to count its lines. It remembers which files it has warned about in `~/.kete-loom/state/guard-file-truncation.json` (set `KETE_LOOM_STATE_DIR` to move it), per session, or per project per day when the host sends no session id.

Not available in Cursor, which has no documented hook before an edit. In Codex, edits are patches, and a patch only replaces a whole file when it creates a new one.

Opt-in: `--hooks` leaves it out; install it with `--hook guard-file-truncation` or `--profile strict`.
