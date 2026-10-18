---
name: block-unfinished-stubs
description: When the agent says it is done, checks the lines its uncommitted changes add to code and sends it back once if they leave TODOs, "not implemented" stubs, or focused (.only) or skipped tests behind.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/event: "stop-gate"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Block unfinished stubs

Runs when the agent ends its turn, in a git repository only. It reads the lines that uncommitted changes add to code files (`git diff HEAD`, plus new untracked files) and looks for:

| Pattern | Examples |
|---|---|
| TODO markers | `TODO`, `FIXME`, `XXX` |
| Unimplemented stubs | `throw new Error("not implemented")`, `NotImplementedError`, `todo!()`, `unimplemented!()`, `NotImplementedException` |
| Focused tests, which silently skip the rest of the suite | `it.only(`, `describe.only(`, `fit(`, `fdescribe(` |
| Skipped tests | `it.skip(`, `xit(`, `@pytest.mark.skip`, `t.Skip(`, `#[ignore]`, `@Disabled` |

If any are found, the turn doesn't end. The agent gets the list (at most 10 lines) and is told to finish the work, remove what was left by accident, or tell you explicitly what is deliberately left for later and why. It is sent back only once in a row.

Only lines the agent's changes add are checked, so existing TODOs in the codebase never trigger it. Documentation files are ignored. It only reads; it never changes files.

Available in Claude Code, Codex, Gemini CLI, Cursor and GitHub Copilot. Kete Code's and OpenCode's stop hooks can't send the agent back to work.

Opt-in: `--hooks` leaves it out; install it with `--hook block-unfinished-stubs` or `--profile strict`.
