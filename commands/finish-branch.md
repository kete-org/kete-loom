---
name: finish-branch
description: Finish the current branch - run the checks, confirm the base, then merge locally, open a pull request, keep it or discard it, with cleanup and no force-push or deletion without consent.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[base branch]"
  kete-loom/owner: "Kete-org"
---

Finish the work on the current branch.

If the `finishing-a-branch` skill is available, follow it. Otherwise:

1. If the working tree has uncommitted changes, ask what to do with them. Run the project's checks (`/verify`); if any fail, report them and stop.
2. Confirm the base branch (the one given below, else the repository's default branch), and ask if unsure. Show `git log --oneline <base>..HEAD`.
3. Offer exactly four choices and wait: merge into the base locally, push and open a pull request, keep the branch as it is, or discard it.
4. Merge: switch to the base, `git merge <branch>`, re-run the checks, then delete the branch with `git branch -d`. Pull request: `git push -u origin <branch>` and create it as `/pr` does. Keep: change nothing. Discard: list the commits and files that will be lost and require the user to type `discard <branch>` before `git branch -D`.
5. Remove the branch's worktree (`git worktree remove`, then `git worktree prune`) only after a merge or a confirmed discard; keep it for a pull request.

Never force-push, delete a remote branch or use `--force` without the user's explicit consent.

Base branch from the user, if any: $ARGUMENTS
