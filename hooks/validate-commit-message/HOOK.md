---
name: validate-commit-message
description: In repositories that enforce Conventional Commits with commitlint or commitizen, stops the agent from committing with a message like "updated stuff" and has it rewrite the subject as type(scope): subject first.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: read-only
  kete-loom/event: "pre-shell"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Validate commit message

Runs before every shell command, and acts only on `git commit` with a message (`-m`, `--message`, or the `-m "$(cat <<'EOF' … EOF)"` form agents use).

It enforces nothing unless the repository already does: it looks for a commitlint config, a commitizen config (`.cz.json`, `.czrc`, `[tool.commitizen]`) or a `commitlint` entry in `package.json`, between the working folder and the repository root.

When it is enforced, the first line must be `type(scope)!: subject`:
- the type comes from the config's `type-enum` when one is written out, otherwise `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style` or `test`;
- the line has at most 100 characters.

Merge, revert, `fixup!` and `squash!` messages pass. The agent is told what is wrong and to rewrite the message, so the commit hook or CI doesn't reject it later.

It reads only config files and runs no commands. Rules beyond the subject line (body length, scope lists, footers) are left to commitlint itself.

Opt-in: `--hooks` leaves it out; install it with `--hook validate-commit-message` or `--profile strict`.
