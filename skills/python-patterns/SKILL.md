---
name: python-patterns
description: Idiomatic modern Python 3 for writing and restructuring application code, covering type hints, dataclasses versus pydantic at trust boundaries, exception design, context managers, pyproject.toml packaging with uv, poetry or pip, ruff and mypy/pyright setup, and asyncio pitfalls. Use when writing new Python modules, modernising an older codebase, choosing how to model data or errors, or setting up a Python project's tooling.
license: MIT
compatibility: Any Agent Skills host. Targets CPython 3.10+; notes call out 3.11 and 3.12 features. Needs python and one of uv, poetry or pip.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "python"
  kete-loom/owner: "Kete-org"
---

# Python patterns

Write Python the project's tools can check: typed, explicit about errors and resources, and packaged from one `pyproject.toml`.

## 0. Read the project first

1. Find the supported Python version: `requires-python` in `pyproject.toml`, `.python-version`, CI matrix. Never use syntax newer than the lowest supported version (for example `match` needs 3.10, `except*` and `asyncio.TaskGroup` need 3.11, `type X = ...` and `def f[T]()` need 3.12).
2. Find the package manager: `uv.lock` means uv, `poetry.lock` means poetry, `requirements*.txt` or only `pyproject.toml` means pip. Use that tool; never mix them in one project.
3. Find the linters and type checker: `[tool.ruff]`, `[tool.mypy]`, `[tool.pyright]` or `pyrightconfig.json`, `.pre-commit-config.yaml`. Follow their settings over this skill.
4. If the project has none of these and the user wants a new setup, use `references/tooling.md`.

## 1. Types

- Annotate every public function's parameters and return type. Inside function bodies, let inference work.
- Use built-in generics and unions: `list[str]`, `dict[str, int]`, `str | None` (3.10+). Use `typing` only for what builtins lack (`Protocol`, `TypedDict`, `Literal`, `Final`, `TypeVar`, `overload`).
- Accept abstract, return concrete: take `Iterable[T]` or `Mapping[K, V]` from `collections.abc`, return `list[T]` or `dict[K, V]`.
- Prefer `Protocol` over inheritance for "anything with a `.read()` method".
- `Any` is an escape hatch, not a type. If you need it, leave a comment saying why. Prefer `object` when you only pass a value through.
- Put imports used only in annotations under `if TYPE_CHECKING:` when they cause import cycles, and add `from __future__ import annotations` (or quote the annotation) so the name isn't evaluated at runtime, where it doesn't exist.
- Never silence the checker with a bare `# type: ignore`; use the code, e.g. `# type: ignore[arg-type]`, plus a reason.

## 2. Modelling data

Decision rule:

| Data | Use |
|---|---|
| Internal value object, trusted input | `@dataclass(frozen=True, slots=True)` (`slots` needs 3.10) |
| Untrusted input: HTTP bodies, config files, queue messages, LLM output | pydantic `BaseModel` (or the project's existing validator) |
| A dict shape you can't change (JSON passed through) | `TypedDict` |
| Fixed set of choices | `enum.Enum` / `StrEnum` (3.11) or `Literal[...]` |

- Validate once at the boundary, then pass typed objects inward. Don't re-validate in every layer, and don't let raw `dict[str, Any]` travel through the core.
- Mutable defaults: never `def f(items=[])` or `items: list = []` on a dataclass. Use `None` and create inside, or `field(default_factory=list)`.
- Pydantic v1 and v2 APIs differ (`.dict()` vs `.model_dump()`, `@validator` vs `@field_validator`). Check the installed major version before writing model code.

## 3. Errors

- Raise specific exceptions. Define one base exception per package (`class BillingError(Exception)`) and subclass it for cases callers handle differently.
- Catch the narrowest type you can handle, as close as possible to where you can do something useful. Never `except:` or `except Exception: pass`.
- When translating an error, chain it: `raise ConfigError(f"bad port {raw!r}") from exc`.
- Log *or* raise, not both at every layer. Log once, at the edge (request handler, CLI main, worker loop).
- Use `logger.exception(...)` inside `except` to keep the traceback. Use `logging.getLogger(__name__)`, never `print` for diagnostics in library code.
- Don't use exceptions for ordinary control flow across many layers; return `None` or a result type when absence is normal.
- `assert` is stripped under `python -O`. Never use it to validate input.

## 4. Resources and context managers

- Anything that must be closed (files, sockets, DB connections, locks, temp dirs, HTTP clients) goes in `with` / `async with`.
- Write small context managers with `contextlib.contextmanager` (or `asynccontextmanager`); put cleanup in `finally`.
- Use `contextlib.ExitStack` when the number of resources is dynamic.
- Always pass `encoding="utf-8"` to `open()` for text files; the default depends on the platform.
- Use `pathlib.Path` for paths, not string concatenation.

## 5. asyncio

1. Never call blocking code in a coroutine (`time.sleep`, `requests`, sync DB drivers, heavy CPU). Use the async library or `await asyncio.to_thread(fn, ...)`.
2. Every coroutine must be awaited. A call without `await` returns a coroutine object and does nothing.
3. Keep a reference to tasks from `asyncio.create_task`; the loop only holds weak references, so an unreferenced task can be garbage-collected mid-run. On 3.11+ prefer `async with asyncio.TaskGroup() as tg:` which awaits and cancels children for you.
4. Put timeouts on network calls: `asyncio.timeout(s)` (3.11+) or `asyncio.wait_for(...)`.
5. Don't swallow `asyncio.CancelledError`. If you catch it to clean up, re-raise it.
6. `asyncio.gather(...)` without `return_exceptions=True` cancels nothing when one fails; the others keep running. Use `TaskGroup` when siblings should stop together.
7. Bound concurrency with `asyncio.Semaphore` instead of launching thousands of tasks.
8. Call `asyncio.run(main())` once at the program entry point; never from inside a running loop.

## 6. Idioms worth enforcing

- Comprehensions for simple transforms; a plain loop once there is more than one condition or a side effect.
- `enumerate`, `zip(..., strict=True)` (3.10), `itertools`, `functools.cache` before hand-rolled versions.
- f-strings for formatting, but `logger.info("user %s", user_id)` style in logging calls (lazy formatting).
- `__all__` or a leading underscore to mark what is public.
- No module-level side effects beyond constants: no network calls, no DB connections at import time. Put entry points under `if __name__ == "__main__":` or a `[project.scripts]` entry.
- Never build SQL, shell commands or file paths from user input with string formatting. Use parameterised queries, `subprocess.run([...])` with a list and no `shell=True`, and validated paths.

## 7. Packaging and environments

- One `pyproject.toml` holds metadata, dependencies and tool config. No new `setup.py` unless a C build needs it.
- Always work in a virtual environment. Never `pip install` into the system or global interpreter, and never with `sudo`.
- Add dependencies with the project's tool so the lockfile updates: `uv add httpx`, `uv add --dev pytest`; `poetry add httpx`, `poetry add --group dev pytest`; pip projects edit `pyproject.toml` (or `requirements.in`) then reinstall.
- Commit the lockfile for applications. Libraries declare ranges in `[project.dependencies]` and don't pin exact versions.
- Run tools through the environment: `uv run pytest`, `poetry run mypy .`, or an activated `.venv`.

Commands and config snippets for each tool: `references/tooling.md`.

## 8. Before you finish

1. Run the formatter and linter the project uses (usually `ruff format` and `ruff check`).
2. Run the type checker (`mypy` or `pyright`) on the files you touched. Fix new errors; don't add ignores to hide them.
3. Run the tests. For writing tests, use the `python-testing` skill.
4. Stop and ask the user before: raising `requires-python`, switching package manager, upgrading a major dependency (pydantic 1 to 2, SQLAlchemy 1 to 2), or turning on strict type checking for the whole project.

## Report back

State: files changed, the lint, type-check and test commands you ran with their results, and any new dependency added (name and why).
