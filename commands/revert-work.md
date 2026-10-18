---
name: revert-work
description: Safely undo the commits of a task, phase or the last few changes with git revert, after checking later commits that depend on them and getting confirmation; never resets or force-pushes.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "<task, phase, commit range or last N commits>"
  kete-loom/owner: "Kete-org"
---

Undo the work named below by adding revert commits. History is never rewritten: no `git reset --hard`, no `git rebase`, no `git push --force`, no deleting branches. To roll back only uncommitted edits to a saved point, use `/checkpoint restore` instead.

1. **Check the start state.** Run `git status`. If there are uncommitted changes, stop and ask the user to commit, stash or checkpoint them first. Note the current branch and whether it is shared (it exists on the remote or is the default branch).
2. **Identify the commits.** From the task, phase, ticket, range or "last N" below, find candidates with `git log --oneline`, `git log --grep=<task id or phrase>`, and the plan or state files that record which commits belong to the task. List each commit with hash, date, author and subject. If the target is ambiguous, show the candidates and ask; never guess.
3. **Check for dependents.** For the files those commits touched (`git show --stat <sha>`), list later commits that touched the same files: `git log --oneline <oldest>^..HEAD -- <files>` minus the commits being reverted. For each, say whether it builds on the reverted code (calls a function it added, edits lines it wrote). Flag merge commits in the set; reverting one needs `git revert -m 1 <sha>` and the user must confirm which parent is the mainline.
4. **Show the plan and wait.** Show the commits to revert (newest first), the dependent commits and what will happen to them, the combined change (`git diff <oldest>^ <newest> --stat`), and the exact commands. Ask the user to confirm. Do nothing until they do.
5. **Revert**, newest first: `git revert --no-edit <sha>` for each, or `git revert --no-commit <sha>...` and one commit `revert: <task>` if the user prefers a single commit. On a conflict, stop, show the conflicted files, and ask; abort with `git revert --abort` if the user wants to back out.
6. **Verify.** Run the project's checks (the `verification-loop` skill or `/verify`). If they fail, report which failure the revert caused and ask before fixing anything.
7. **Update records.** If plan or state files mark the task done, tell the user which lines are now wrong and offer to update them.

Never push; tell the user the revert commits are local.

Report:

```
## Reverted: <task>
Commits reverted: <sha subject>, ...
Revert commits: <sha>, ...
Dependent commits: <none | sha: kept, and why it still works | sha: also reverted>
Verification: <commands> -> pass/fail
Follow-up: <records to update, anything left>
```

What to undo: $ARGUMENTS
