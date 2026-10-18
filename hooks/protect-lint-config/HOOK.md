---
name: protect-lint-config
description: Stops the agent from editing existing linter, formatter and type-checker configs, so it fixes the code that breaks a rule instead of weakening or switching off the rule.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/event: "pre-edit"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Protect lint config

Runs before every file write or edit. It blocks changes to existing quality-gate configs:

| Tool | Files |
|---|---|
| ESLint | `.eslintrc*`, `eslint.config.*` |
| Biome, Prettier, Stylelint | `biome.json(c)`, `.prettierrc*`, `prettier.config.*`, `.stylelintrc*`, `stylelint.config.*` |
| Python | `ruff.toml`, `.ruff.toml`, `.flake8`, `.pylintrc`, `mypy.ini`, `.mypy.ini` |
| Go, Rust, Ruby, PHP | `.golangci.yml/.yaml/.toml`, `clippy.toml`, `.clippy.toml`, `rustfmt.toml`, `.rubocop.yml`, `phpstan.neon(.dist)` |

The agent is told to fix the code that breaks the rule instead. If you asked for the config change yourself, the agent says so, and you make the edit or turn this hook off.

Creating a config that doesn't exist yet is allowed, so setting up a new project still works. Settings inside `pyproject.toml` or `package.json` are not covered, because those files hold much more than lint settings.

Opt-in: `--hooks` leaves it out; install it by name with `--hook` or with `--profile strict`. Not available in Cursor, which has no documented hook before an edit.
