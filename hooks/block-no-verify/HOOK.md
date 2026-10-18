---
name: block-no-verify
description: Stops the agent from skipping the project's git hooks with git commit --no-verify, -n, HUSKY=0, SKIP= or a swapped core.hooksPath, so pre-commit checks keep running.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/event: "pre-shell"
  kete-loom/owner: "Kete-org"
---

# Block --no-verify

Agents that hit a failing pre-commit or pre-push hook often retry with `--no-verify`. This hook refuses that, so the agent fixes what the hook reported instead.

| Blocks | Example |
|---|---|
| `--no-verify` on commit, push, merge, rebase, am, cherry-pick, revert | `git commit --no-verify -m wip` |
| `-n` on `git commit` (short for `--no-verify`) | `git commit -nm wip` |
| Turning Husky off | `HUSKY=0 git commit` |
| Skipping pre-commit hooks | `SKIP=eslint git commit` |
| Pointing git at another hooks folder | `git -c core.hooksPath=/dev/null commit` |

Commit messages that mention `--no-verify` are fine. If you really need to skip hooks, run the command yourself.
