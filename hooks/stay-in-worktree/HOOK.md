---
name: stay-in-worktree
description: When the agent works in a linked git worktree, stops it from editing files outside that worktree, such as the main checkout or another worktree reached through an absolute path or ../, so parallel branches don't leak into each other.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/event: "pre-edit"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Stay in worktree

Runs before every file write or edit, and does nothing unless the session is inside a linked git worktree (one made with `git worktree add`, which the `git-worktrees` skill uses). In a linked worktree it blocks writes outside the worktree's folder.

The usual accident is an absolute path copied from earlier output that points at the main checkout. The edit then lands on the wrong branch, and the worktree's tests still pass. The system temp folder stays writable.

It finds the worktree by reading the `.git` file, which points into `.git/worktrees/<name>` of the main repository. It runs no commands.

Opt-in: `--hooks` leaves it out; install it with `--hook stay-in-worktree` or `--profile strict`. Not available in Cursor, which has no documented hook before an edit.
