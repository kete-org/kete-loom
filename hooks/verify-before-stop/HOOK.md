---
name: verify-before-stop
description: When the agent says it is done, runs the project's own lint and type-check commands if files changed, and sends it back to fix any failure instead of letting it finish with broken code.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/event: "stop-gate"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Verify before stop

Runs when the agent ends its turn, in a git repository only.

If the working tree has changed code files, it runs the checks the project already defines:

| Project | Checks |
|---|---|
| `package.json` | the `typecheck` / `type-check` / `check-types` script and the `lint` script, run with the package manager the lockfile belongs to |
| Python | `ruff check` on the changed `.py` files, when Ruff is configured and installed |
| Go | `go vet ./...` |

If a check fails, the turn does not end. The agent gets the failing command and the end of its output, and is told to fix the cause, not the check. It is sent back only once in a row, so a check it can't fix never traps it in a loop.

Tests are not run, because they can take far longer than a hook should. Use the `/verify` command or the `verification-loop` skill for that. Each check is limited to 75 seconds. Nothing is installed and nothing is changed.

Available in Claude Code, Codex, Gemini CLI, Cursor and GitHub Copilot. Kete Code's and OpenCode's stop hooks can't send the agent back to work.

Opt-in: `--hooks` leaves it out; install it by name with `--hook` or with `--profile strict`.
