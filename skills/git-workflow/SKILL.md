---
name: git-workflow
description: Everyday team git without an interactive editor - feature branches, choosing rebase or merge, resolving conflicts, tidying commits with fixup and autosquash, recovering lost commits through the reflog, and force-pushing with --force-with-lease so nobody's work is overwritten. Use when a branch has diverged, a rebase or merge hit conflicts, commits need squashing or rewording before review, work seems lost after a reset or bad rebase, or a rewritten branch must be pushed.
license: MIT
compatibility: Any Agent Skills host. Needs git 2.23+ (switch/restore); --force-if-includes needs 2.30+ and --update-refs needs 2.38+.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Git workflow

Keep history readable and never lose anyone's work. Every command here runs without opening an editor, so an agent can drive it.

## 0. Look before you act

1. Run `git status`, `git branch --show-current` and `git log --oneline --graph -15 --all`.
2. Run `git fetch --prune` so you compare against the real remote.
3. Find the base branch: `git symbolic-ref refs/remotes/origin/HEAD` (usually `origin/main`). If the project documents a different flow (release branches, `develop`), follow it.
4. If the working tree has uncommitted changes, **stop and ask** whether to commit them, stash them (`git stash push -u -m "<why>"`) or leave the task.
5. Before any history rewrite, create a safety ref: `git branch backup/<branch>-$(date +%Y%m%d%H%M%S)`. Delete it only after the user confirms the result.

## 1. Branching

- One branch per change, cut from an up-to-date base: `git switch -c <type>/<short-topic> --no-track origin/main`. Without `--no-track` the new branch tracks `origin/main`, so a bare `git push` or `git pull` targets main. Publish it with `git push -u origin <branch>`.
- Name branches by intent (`fix/login-timeout`, `feat/export-csv`), not by person.
- Keep branches short-lived. If a branch is more than a few days behind, integrate the base (section 2) before adding more work.
- Never commit straight to the default branch unless the project explicitly works that way.

## 2. Rebase or merge?

| Situation | Do |
|---|---|
| Your own unshared feature branch is behind main | `git rebase origin/main` |
| Branch is shared and others have pushed to it | `git merge origin/main` (never rewrite shared history) |
| Integrating a finished branch into main | Follow the repo's PR setting (squash, rebase or merge commit). Don't override it locally. |
| Long-running release branch | Merge, so the history of what shipped stays intact |
| Stacked branches (B built on A) | `git rebase --update-refs origin/main` from the top branch moves the whole stack |

To check whether a branch is shared: `git log --format='%an' origin/main..origin/<branch> | sort -u`. More than one author means merge, or ask first.

Set `git config pull.rebase true` only if the team agrees; otherwise use explicit `git fetch` plus rebase or merge.

## 3. Resolving conflicts

1. List conflicted files: `git diff --name-only --diff-filter=U`.
2. For each file, read both sides and the intent of each change (`git log --oneline -3 -- <file>` on each side). Resolve by meaning, not by picking a side wholesale.
3. During a **rebase**, "ours" is the branch you are rebasing onto and "theirs" is your commit being replayed. That is the opposite of a merge. Use `git checkout --ours|--theirs <file>` only when one side should win entirely.
4. Lockfiles and generated files: take the base version, then regenerate with the project's tool (for example reinstall dependencies) instead of hand-merging.
5. Remove every conflict marker. Check: `git diff --check` and search for `^<<<<<<<|^>>>>>>>`.
6. Build and run the tests before continuing.
7. `git add <file>` then `git rebase --continue` (or `git commit --no-edit` for a merge). Use `GIT_EDITOR=true git rebase --continue` to accept the existing message without an editor.
8. If the conflict is in code you don't understand, or both sides changed behaviour, **stop and ask** the user. To back out cleanly: `git rebase --abort` or `git merge --abort`.

Turn on `git config rerere.enabled true` for repeated conflicts while rebasing long branches.

## 4. Cleaning up history without an editor

Only on commits that are not yet on a shared branch.

- **Fix an earlier commit:** stage the fix, `git commit --fixup=<sha>`, then
  `GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash origin/main`.
  Setting the sequence editor to `true` accepts the generated todo list, so nothing interactive opens.
- **Reword the last commit:** `git commit --amend -m "<new message>"`.
- **Reword an older commit:** `git commit --allow-empty -m "amend! <exact original subject>" -m "<new full message>"`, then the autosquash command above. (`--fixup=reword:` does the same but opens an editor.)
- **Squash the whole branch into one commit:** `git reset --soft $(git merge-base HEAD origin/main)` then `git commit -m "<message>"`.
- **Split the last commit:** `git reset HEAD~1`, then stage and commit each piece by path (`git add <path>`; `git add -p` is interactive).
- **Drop a commit from the branch:** `git rebase --onto <sha>^ <sha>` (removes `<sha>`, keeps the rest).
- **Undo a commit already on a shared branch:** `git revert <sha>`. Never rewrite it.

After any rewrite, compare the result: `git diff backup/<branch>-<stamp> HEAD` should be empty when you only reshaped commits on the same base. If you also rebased onto a newer base, compare `git range-diff <old-base>..backup/<branch>-<stamp> <new-base>..HEAD` instead.

## 5. Recovering lost work

Nothing committed is gone until garbage collection. By default the reflog keeps entries for commits no longer on any branch for 30 days (`gc.reflogExpireUnreachable`), and 90 days for the rest.

1. `git reflog -30` (or `git reflog show <branch>`) to find the commit before the mistake, such as the entry before `rebase (start)` or `reset: moving to`.
2. Inspect it: `git show --stat <sha>`.
3. Restore without destroying anything: `git branch rescue/<topic> <sha>`. Only after the user agrees, move the branch: `git reset --hard <sha>`.
4. Lost stash: `git fsck --no-reflogs --unreachable | grep commit`, then `git show <sha>` to find it, and `git stash apply <sha>`.
5. Unstaged changes discarded with `git checkout -- .`, `git restore .` or `git reset --hard` are **not** recoverable by git. Say so plainly; check the editor's local history instead. Changes that had been staged survive as dangling blobs: `git fsck --lost-found` writes them to `.git/lost-found/other/` for inspection.

## 6. Pushing rewritten branches safely

1. Push: `git push --force-with-lease --force-if-includes origin <branch>`.
   - `--force-with-lease` refuses if the remote moved since your last fetch.
   - `--force-if-includes` also refuses if a background fetch updated the remote ref but you never integrated those commits.
2. If the push is rejected, **do not** retry with `--force`. Fetch, inspect `git log HEAD..origin/<branch>`, integrate the new commits, and push again.
3. Never force-push `main`, `master`, release branches or any protected branch. If one seems to need it, stop and ask.
4. Tell collaborators on the branch that it was rewritten; they should `git fetch` and `git rebase origin/<branch>` or reset onto it.

## Never

- Never run `git reset --hard`, `git clean -fd`, `git checkout -- .` or `git stash drop` on work the user hasn't confirmed is disposable.
- Never use plain `git push --force`.
- Never rewrite commits that exist on a shared or protected branch.
- Never resolve a conflict by deleting the other side's change without understanding it.
- Never bypass hooks with `--no-verify` unless the user asks.

## Report back

End with:

```
Branch: <name> (base <base>, ahead N / behind M)
Did: <rebase | merge | cleanup | recovery | push>
Conflicts: <files and how each was resolved, or none>
Safety ref: <backup branch name, or none>
Checks: <build/test command and result>
Next: <what the user or collaborators must do>
```
