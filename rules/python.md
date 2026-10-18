---
name: python
description: Always-on rules for Python 3 files, covering environments, type hints, exceptions, resource handling, untrusted input and the project's own tooling.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.py, **/*.pyi"
  kete-loom/owner: "Kete-org"
---

- Use the project's environment and dependency tool (its lockfile or `pyproject.toml` shows which). Never install packages into the system Python.
- Use the project's configured formatter, linter, type checker and test runner, and run them after a change.
- Where the project uses type hints, add them to new and changed function signatures. Never use `# type: ignore` without a specific error code and a reason.
- Never use a mutable default argument (`def f(x=[])`); default to `None` and create the value inside.
- Never use a bare `except:` or `except Exception: pass`. Catch the narrowest exception, and use `raise ... from err` when wrapping.
- Open files, locks, connections and sockets with `with` so they always close.
- Pass `encoding="utf-8"` when opening text files.
- Resolve any path built from user input and check it stays inside the allowed directory before using it.
- Never pass user input to `eval`, `exec`, `pickle.loads`, `yaml.load` without `SafeLoader`, or `subprocess` with `shell=True`. Pass `subprocess` an argument list.
- Use parameterized queries; never format SQL with f-strings or `%`.
- Use `secrets`, not `random`, for tokens and passwords.
- Use timezone-aware datetimes (`datetime.now(timezone.utc)`); never compare naive and aware values.
- Use `logging` in library code, not `print`.
- Set a timeout on every network call; `requests` and `urllib` wait forever by default.
- Never call blocking I/O inside `async def`; use an async library or `asyncio.to_thread`.
- Compare to `None` with `is` / `is not`.

For more, load the python-patterns and python-testing skills.
