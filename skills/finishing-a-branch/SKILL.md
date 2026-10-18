---
name: finishing-a-branch
description: Closes out completed work on a feature branch - re-runs the test suite and stops if it is red, confirms the base branch, then offers exactly four outcomes (merge locally, push and open a pull request, keep the branch for later, or discard it) and carries out the one the user picks, re-testing after a local merge and cleaning up the worktree only when the work has landed or been thrown away. Use when implementation on a branch is finished and the user needs to decide how it gets integrated, or says "wrap this branch up".
license: MIT
compatibility: Any Agent Skills host. Needs git and the project's test runner; opening a pull request needs the forge's CLI (gh, glab) or its web page.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Finishing a branch

The work is done; now it has to land somewhere, or nowhere, on the user's decision. Verify first, present the choices, do exactly the chosen one.

Neighbours: `git-workflow` for rebasing and conflicts, `conventional-commits` for messages, the `/pr` and `/pr-describe` commands for writing the pull request itself, `git-worktrees` for creating worktrees.

## 1. Verify the branch

1. `git status --short`. If there are uncommitted changes, **stop and ask**: commit them, stash them, or leave them out.
2. Run the project's full check set (build, lint, type-check, tests). Use the `verification-loop` skill or `/verify` if installed; otherwise the commands from CI config or package scripts.
3. If anything fails, **stop**. Report the failures and do not show the menu. A branch that is red is not finished.

A green run from earlier in the session does not count; run it on the tree as it is now.

## 2. Gather the facts

Capture these now, from inside the branch's working directory, because later steps change directory:

```
git branch --show-current                                  # feature branch (empty = detached HEAD)
git rev-parse --show-toplevel                              # this checkout's path
git rev-parse --path-format=absolute --git-dir
git rev-parse --path-format=absolute --git-common-dir      # differs from git-dir in a linked worktree
git worktree list
```

Find the base branch: the one named in the plan or conversation, else the default branch (`git symbolic-ref --short refs/remotes/origin/HEAD` prints `origin/main`; drop the `origin/` prefix). If there is any doubt, ask: "This branch started from `<guess>`. Is that the base?" Merging into the wrong base is costly to undo.

Summarise what the branch holds: `git log --oneline <base>..HEAD` and `git diff --stat <base>...HEAD`.

On a detached HEAD there is no branch to merge or keep by name. Offer only option 2 (push as a new branch) or option 3 (leave it), and say why.

## 3. Offer exactly four choices

Show this, filled in, and wait for the answer. Do not pick for the user, and do not add options.

```
<branch>: <N> commits ahead of <base>, checks green.

1. Merge into <base> locally
2. Push and open a pull request against <base>
3. Keep the branch as it is
4. Discard the branch and its commits

Which one?
```

## 4. Carry out the choice

### 1. Merge locally

1. Move to the main checkout (the parent of the common git dir) if you are in a linked worktree; a branch checked out in another worktree cannot be checked out here.
2. Run `git status --short` there. If the main checkout has uncommitted changes or is on a branch the user is working on, **stop and ask**; never stash or switch away from their work yourself.
3. `git switch <base>`, then `git pull --ff-only` if it has an upstream. If that fails, the base has diverged: **stop and ask**.
4. `git merge <branch>` (or the project's documented style, such as `--no-ff` or squash). On conflicts, follow `git-workflow` or abort with `git merge --abort` and ask.
5. Run the full check set again on the merged result. If it fails, stop: leave the branch and worktree in place and report. Nothing is pushed, so the merge can still be undone.
6. When green: clean up (step 5), then `git branch -d <branch>`. After a squash merge `-d` refuses because the commits are not reachable from the base; confirm with the user before using `-D`. Do not push the base unless the user asks.

### 2. Push and open a pull request

1. `git push -u origin <branch>`. From a detached HEAD: `git push -u origin HEAD:refs/heads/<new-branch>`.
2. If the push is rejected, the remote has moved. Fetch and investigate; never force-push to fix it without the user's explicit consent, and then only with `--force-with-lease`.
3. Open the pull request with the forge's CLI, for example `gh pr create --base <base> --head <branch> --title "..." --body-file <file>`, following the repo's PR template. Use `/pr` or `/pr-describe` for the description if available. If no CLI is available, give the user the URL git printed on push.
4. Report the PR URL. Keep the branch and the worktree: review fixes happen there.

### 3. Keep as is

Change nothing. Report the branch, its path and the latest commit, so the user can come back to it.

### 4. Discard

1. List exactly what will be lost:

```
This permanently deletes:
- branch <branch> and these commits not on <base>:
  <git log --oneline <base>..<branch>>
- worktree <path>, including uncommitted files: <list, or none>
- remote branch origin/<branch>: only if you also confirm that separately
Type "discard <branch>" to confirm.
```

2. Wait for that exact text. "Yes", "sure" or "get rid of it" are not confirmation; ask again.
3. Move to the main checkout, clean up the worktree (step 5), then `git branch -D <branch>`.
4. Delete the remote branch (`git push origin --delete <branch>`) only if the user confirmed that part too.

Commits removed this way can usually be recovered for a while from `git reflog`; mention that, but do not treat it as permission.

## 5. Clean up the worktree

Only after option 1 succeeded or option 4 was confirmed. For options 2 and 3, keep it.

- Not in a linked worktree: nothing to do.
- A worktree you or the user created (for example under `.worktrees/`, `worktrees/` or the agreed global folder): from the main checkout run `git worktree remove <path>` and then `git worktree prune`.
- If removal is refused because of modified or untracked files, show `git -C <path> status --short` and ask: commit them, move them, or delete them. Never add `--force` yourself.
- A worktree the host created and manages: leave it, and use the host's own exit or cleanup action if it has one.

## Never

- Show the menu, merge or push while checks are red.
- Force-push, delete a branch, delete a remote branch or remove a worktree with `--force` without explicit consent for that specific action.
- Merge into a base branch you have not confirmed.
- Remove a worktree that still backs an open pull request.

## Report back

```
## Branch finished: <branch>
Checks before: <commands> -> pass
Choice: merge locally | pull request | kept | discarded
Result: <merge commit sha and post-merge checks> | <PR URL> | <branch and path kept> | <what was deleted>
Worktree: removed | kept at <path> | none
Not done (needs you): <push base, delete remote branch, or none>
```
