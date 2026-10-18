---
name: checkpoint
description: Save a restorable snapshot of the working tree after running the project's checks, without committing or changing anything, or list and restore earlier ones.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[name | list | restore <name>]"
  kete-loom/owner: "Kete-org"
---

Checkpoints are snapshots stored under `refs/checkpoints/` with `git stash create`, which records the tracked changes without touching the branch, the index or any file.

**Save** (no argument, or a name):
1. Run the project's checks the way the `verification-loop` skill does (or `/verify`), and report pass or fail. Save the checkpoint either way, but say in its name when checks failed.
2. Run `git stash create "checkpoint: <name>"`. If it prints nothing, there are no tracked changes; record `HEAD` instead.
3. Store it: `git update-ref refs/checkpoints/<name> <sha>` (default name: the date and time, like `2026-10-18-1430`).
4. List untracked files (`git status --porcelain`): a stash snapshot does not include them. Tell the user which files are not covered.

**List** (`list`): `git for-each-ref --sort=-creatordate --format='%(refname:short) %(creatordate:relative) %(subject)' refs/checkpoints/`.

**Restore** (`restore <name>`): first show `git diff --stat` for what is uncommitted now and ask before going further, because restoring on top of uncommitted work can conflict. Then `git stash apply refs/checkpoints/<name>`. Never use `git reset --hard` or `git checkout .` to restore.

Request: $ARGUMENTS
