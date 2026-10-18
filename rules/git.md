---
name: git
description: Always-on git hygiene rules for agents, covering small focused commits, Conventional Commits messages, keeping secrets and generated files out, safe pushing and never rewriting shared history.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

- Never commit directly to the default branch unless that is the project's workflow; branch first.
- Run `git status` and `git diff --staged` before every commit and check that only the intended changes are staged.
- Stage files by name. Avoid `git add -A` or `git add .` when unrelated or untracked files are present.
- Keep each commit small and focused on one logical change that builds and passes tests on its own.
- Follow the project's commit message convention (check recent `git log`); if it has none, use Conventional Commits, `type(scope): summary`. Write the summary in the imperative and add a body that explains why when the reason is not obvious.
- Never commit secrets, `.env` files, credentials, private keys or personal data. If one was committed, stop and tell the user; removing it from history does not un-leak it, so it must be rotated.
- Never commit build output, dependency folders, caches or editor files. Keep lockfiles the project already tracks in sync with its manifest.
- Never skip hooks with `--no-verify`. If a hook fails, fix the cause and commit again; do not amend an earlier commit to work around it.
- Never force-push a shared branch or rewrite published history. On your own branch, use `--force-with-lease`, never plain `--force`.
- Never run destructive commands (`reset --hard`, `clean -fd`, `checkout -- .`, `branch -D`, `stash drop`) without the user's consent; they discard uncommitted work.
- Do not change git config, remotes or signing settings unless asked.
- Use non-interactive commands; avoid flags that open an editor or prompt, such as `rebase -i` or `add -p`.
- Resolve merge conflicts by reading both sides; never accept one side wholesale to make the conflict go away.

For more, load the git-workflow and conventional-commits skills.
