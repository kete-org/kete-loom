---
name: pr-describe
description: Draft a pull request title and description for the current branch from its commits and diff against the base branch.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[base branch or extra context]"
  kete-loom/owner: "Kete-org"
---

Write a pull request title and description for the current branch. Do not push or open the pull request unless the user asks.

1. Find the base branch: the one the user named below, otherwise the repository's default branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, falling back to `main`). Run `git fetch` first if you can, and compare against `origin/<base>` so a stale local base branch does not add unrelated commits. Uncommitted changes are not part of the pull request; mention them to the user if `git status` shows any.
2. Read `git log --oneline <base>..HEAD` and `git diff <base>...HEAD --stat`, then the diff itself for the files that matter.
3. If the repository has a pull request template (for example `.github/pull_request_template.md`), fill it in instead of the format below.
4. Write:

```
Title: <Conventional Commits style summary, under about 72 characters>

## Summary
What changed and why, in two to four sentences.

## Changes
- one bullet per meaningful change, not per file

## Testing
How it was verified: commands run, tests added, manual checks.

## Notes
Breaking changes, migrations, config or rollout steps, follow-ups. Omit if none.
```

Describe only what the diff shows. If the purpose is unclear from commits and code, ask the user rather than guessing. Link issues only when the commits or branch name reference them. Add any attribution lines the project or host requires.

Base branch or context from the user, if any: $ARGUMENTS
