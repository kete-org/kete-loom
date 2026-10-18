# Python tooling reference

Read this when setting up a new project or adding tooling to one that has none. If the project already configures a tool, keep its settings.

## Package managers

| Task | uv | poetry | pip + venv |
|---|---|---|---|
| Create env | `uv venv` (or implicit on `uv sync`) | `poetry install` | `python -m venv .venv` then activate |
| Install from lock | `uv sync` | `poetry install` | `pip install -e ".[dev]"` or `pip install -r requirements.txt` |
| Install exactly the lock, fail if stale (CI) | `uv sync --locked` | `poetry check --lock && poetry install` | `pip install -r requirements.txt` (pinned via pip-tools) |
| Add runtime dep | `uv add httpx` | `poetry add httpx` | edit `[project.dependencies]`, reinstall |
| Add dev dep | `uv add --dev pytest` | `poetry add --group dev pytest` | edit `[dependency-groups]` (install with `pip install --group dev` on a pip that supports it) or `[project.optional-dependencies].dev` / a requirements file |
| Update lock | `uv lock` / `uv lock --upgrade-package httpx` | `poetry lock` / `poetry update httpx` | `pip-compile` (pip-tools) |
| Run a tool | `uv run pytest` | `poetry run pytest` | activate `.venv`, then `pytest` |

uv notes:
- `uv sync` is exact by default: it removes packages not in the lockfile.
- `--locked` errors if `uv.lock` is out of date; `--frozen` uses the lockfile without checking it.
- Dev dependencies live in `[dependency-groups]` and the `dev` group is synced by default; skip it with `--no-dev`.

## Minimal pyproject.toml

```toml
[project]
name = "acme-billing"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["httpx>=0.27"]

[project.scripts]
acme-billing = "acme_billing.cli:main"

[dependency-groups]
dev = ["pytest", "ruff", "mypy"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

Use a `src/` layout (`src/acme_billing/__init__.py`) so tests import the installed package, not the working directory.

## ruff

```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "B", "UP", "SIM", "S", "RUF"]
```

- `ruff check .` lints, `ruff check --fix .` applies safe fixes, `ruff format .` formats (replaces black). `ruff format` does not sort imports; with `I` selected, `ruff check --fix` does that (replaces isort).
- `B` (bugbear) catches mutable defaults and loop-variable capture; `S` (bandit) catches `shell=True`, `eval` and hard-coded secrets; `UP` rewrites old syntax for `target-version`.
- Rule selectors live under `[tool.ruff.lint]`, not top-level `[tool.ruff]`.

## mypy

```toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_unreachable = true

[[tool.mypy.overrides]]
module = ["legacy.*"]
ignore_errors = true
```

- Turn on `strict` for new code; on an existing codebase enable it per package with `overrides` instead of all at once.
- Missing stubs: install `types-<pkg>` (for example `types-requests`), or set `ignore_missing_imports = true` in an override for that one module.
- `mypy --install-types` can fetch missing stub packages, but review what it adds.

## pyright

```toml
[tool.pyright]
pythonVersion = "3.11"
typeCheckingMode = "strict"
venvPath = "."
venv = ".venv"
```

- `typeCheckingMode` is `off`, `basic`, `standard` or `strict`.
- If pyright can't resolve imports, it is almost always looking at the wrong interpreter: set `venvPath`/`venv` or run it inside the environment.

## pre-commit

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: <pin a release tag>
    hooks:
      - id: ruff-check  # older ruff-pre-commit releases call it `ruff` (kept as a legacy alias)
        args: [--fix]
      - id: ruff-format
```

Pin `rev` to a real tag; check the ruff-pre-commit releases page for the current one.
