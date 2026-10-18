---
name: commit
description: Write a Conventional Commits message for the staged changes, show it, and commit only after the user confirms.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[type, scope or extra context]"
  kete-loom/owner: "Kete-org"
---

Commit the staged changes with a Conventional Commits message.

If the `conventional-commits` skill is available, follow it for the message format. Otherwise use `type(scope): summary`, where type is one of feat, fix, docs, style, refactor, perf, test, build, ci, chore or revert, the summary is imperative and under about 72 characters, and a breaking change is marked with `!` before the colon, a `BREAKING CHANGE:` footer, or both.

1. Run `git diff --cached`. If nothing is staged, show `git status` and ask the user what to stage. Do not stage files yourself unless the user asks.
2. If the staged diff contains secrets, credentials, `.env` files or large build artifacts, stop and warn the user.
3. If the staged changes do two unrelated things, suggest splitting them and ask before continuing.
4. Match the repository's existing style from `git log --oneline -20` (scopes in use, casing). Add a body that explains why when the change is not obvious, and any attribution trailers the project or host requires.
5. Show the full message and wait for the user to confirm or edit it. Never commit before that.
6. Commit with `git commit -F <file>` or an equivalent that keeps the body intact. Never use `--no-verify`, never amend, and never push. If a hook fails, the commit did not happen: show the output, fix the cause (ask first if the fix goes beyond formatting), re-stage, and commit again.
7. Print the resulting `git log -1 --stat`.

Extra context from the user, if any: $ARGUMENTS
