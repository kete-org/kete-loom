---
name: read-before-edit
description: Stops the first edit of each existing file in a session and tells the agent to read the file and search for its callers first, so changes are grounded in the real code rather than a guess.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/event: "pre-edit"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Read before edit

Runs before every file write or edit. The first time in a session the agent tries to change a file that already exists, the edit is refused with this instruction:

1. Read the whole file.
2. Search the codebase for everything that imports, calls or configures it.
3. Then make the same edit again.

The retry goes through, and so does every later edit of that file in the session. New files are never blocked.

It remembers which files it has seen in `~/.kete-loom/state/read-before-edit.json` (set `KETE_LOOM_STATE_DIR` to move it). It keeps them per session when the host sends a session id, otherwise per project per day. Entries older than two days are dropped. It reads no file contents and never uses the network.

Expect one extra round trip per file. Opt-in: `--hooks` leaves it out; install it by name with `--hook` or with `--profile strict`. Not available in Cursor, which has no documented hook before an edit.
