---
name: python-testing
description: Writes and repairs pytest suites for Python code using fixtures and conftest.py, parametrize, monkeypatch and unittest.mock, tmp_path, pytest-asyncio for coroutines, coverage with pytest-cov, and a procedure for diagnosing flaky or order-dependent tests. Use when adding tests to a Python project, converting unittest-style tests to pytest, mocking an external call in a Python test, or chasing a pytest test that passes locally but fails in CI.
license: MIT
compatibility: Any Agent Skills host. Needs python and pytest; async tests need pytest-asyncio (or anyio's pytest plugin), coverage needs pytest-cov.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "python"
  kete-loom/owner: "Kete-org"
---

# Python testing with pytest

Tests that are fast, deterministic and fail for one clear reason.

## 0. Find the setup

1. Find the test command: `[tool.pytest.ini_options]` in `pyproject.toml`, `pytest.ini`, `tox.ini`, `noxfile.py`, `Makefile`, CI config. Run through the env manager (`uv run pytest`, `poetry run pytest`, or an activated venv).
2. Read the nearest `conftest.py` files. Reuse existing fixtures before writing new ones.
3. Run the suite once and record the result. If it already fails, **stop and tell the user** which tests fail before you change anything.
4. Note plugins in use (`pytest-asyncio`, `anyio`, `pytest-mock`, `pytest-django`, `pytest-xdist`, `hypothesis`). Follow their conventions; don't add a new plugin without asking.

## 1. Writing a test

- File `tests/test_<module>.py`, function `test_<behaviour>_<condition>`, e.g. `test_total_rejects_negative_quantity`.
- One behaviour per test. Arrange, act, assert. Plain `assert`; pytest rewrites it to show values.
- Test through the public API. Don't assert on private helpers or call counts unless the call is the behaviour.
- Errors: `with pytest.raises(ValueError, match="negative"):`. Keep the `with` block to the single call that should raise.
- Floats: `assert x == pytest.approx(0.3)`.
- Warnings: `with pytest.warns(DeprecationWarning):`.

## 2. Fixtures

- A fixture provides one thing. Name it for what it gives (`user`, `db_session`), not what it does.
- Cleanup goes after `yield` in the fixture:

  ```python
  @pytest.fixture
  def client():
      c = make_client()
      yield c
      c.close()
  ```

- Scope: default `function`. Widen to `module` or `session` only for expensive, read-only resources; a shared mutable fixture causes order-dependent failures.
- Share fixtures through `conftest.py` in the closest directory that needs them, not one giant root file.
- Factories: when tests need several variants, return a function (`make_user(role="admin")`) rather than writing ten fixtures.
- Avoid `autouse=True` except for true global guards (blocking network, resetting a singleton).

## 3. Parametrize

```python
@pytest.mark.parametrize(
    ("raw", "expected"),
    [("1h", 3600), ("90s", 90), ("0m", 0)],
    ids=["hours", "seconds", "zero"],
)
def test_parse_duration(raw, expected):
    assert parse_duration(raw) == expected
```

- Use it for the same behaviour over many inputs; use separate tests when the assertions differ.
- Give `ids` when values are long or unreadable.
- Mark one known case with `pytest.param(..., marks=pytest.mark.xfail(reason="#123"))` rather than deleting it.

## 4. Patching and mocking

Decision rule: patch only boundaries you don't own or can't run fast (network, clock, randomness, subprocess, third-party SDKs). Never mock the unit under test.

- Environment and attributes: `monkeypatch.setenv("API_URL", "http://test")`, `monkeypatch.setattr(module, "fetch", fake)`, `monkeypatch.delenv(..., raising=False)`. Undone automatically.
- **Patch where the name is looked up, not where it is defined.** If `app/billing.py` does `from app.http import post`, patch `app.billing.post`.
- Use `unittest.mock.create_autospec(Real)` or `patch(..., autospec=True)` so the mock fails on wrong signatures.
- Coroutines: `AsyncMock` (used automatically by `patch` when the target is `async def`).
- Prefer a small fake class or an in-memory implementation over a deep chain of `MagicMock().a.b.return_value`.
- HTTP: use the project's existing tool (`respx` for httpx, `responses` for requests) instead of patching internals.
- Time: inject a clock, or use the project's freezer (`time-machine`, `freezegun`). Never `sleep` in a test to wait for time to pass.

More mocking patterns and pitfalls: `references/mocking.md`.

## 5. Files and output

- `tmp_path` gives a fresh `pathlib.Path` per test; `tmp_path_factory` for session scope. Never write into the repo or `/tmp` directly.
- `capsys` / `capfd` for stdout and stderr, `caplog` for log records (`caplog.set_level(logging.INFO)` first).
- `monkeypatch.chdir(tmp_path)` when code uses relative paths.

## 6. Async code

- pytest-asyncio: mark tests `@pytest.mark.asyncio`, or set `asyncio_mode = "auto"` in `[tool.pytest.ini_options]` so every `async def` test runs. The default mode is `strict`; in strict mode async fixtures need `@pytest_asyncio.fixture`. An unmarked `async def` test never runs: older pytest skips it with a warning, pytest 8.4+ fails it.
- If the project uses anyio (common with FastAPI/Starlette/httpx), use `@pytest.mark.anyio` and its `anyio_backend` fixture instead. Don't install both styles in one suite.
- Await everything. A test that calls a coroutine without `await` passes without running it; pytest emits a "coroutine was never awaited" warning. Treat that warning as a failure.
- Bound waits with `asyncio.timeout(...)` / `asyncio.wait_for(...)` so a hung test fails rather than blocks CI.
- Check the installed pytest-asyncio version's docs for event-loop scope options before changing loop scope; the API changed across releases.

## 7. Coverage

- `pytest --cov=<package> --cov-report=term-missing` (pytest-cov). Use `--cov-branch` to see untaken branches.
- Read the missing lines; add tests for behaviour that matters (error paths, boundaries), not to hit a number.
- Respect `fail_under` in `[tool.coverage.report]` if set. Never lower it without asking.

## 8. Flaky tests

Work through in order, and stop at the first cause you can prove:

1. Reproduce: rerun the single test many times (`pytest path::test -x --count 50` with pytest-repeat if installed, or a shell loop).
2. Order dependence: run it alone, then with the full file, then with pytest-randomly's seed from the failing run (`--randomly-seed=<seed>`), or disable shuffling with `-p no:randomly` to compare. Passing alone but failing in the suite means shared state: a module-level cache, a wide-scope mutable fixture, an unreset singleton, leaked env vars.
3. Parallelism: compare with and without `-n auto` (pytest-xdist). Shared files, ports or DB rows break under xdist; use `tmp_path` and per-worker names (`worker_id` fixture).
4. Time and randomness: dates near midnight or month end, timezones, unseeded `random`, set or dict ordering assumptions.
5. Async and threads: missing `await`, sleeps used as synchronisation, tasks still running after the test ends.
6. Real network or external services.

Fix the cause. Never "fix" flakiness by adding retries, `sleep`, or `@pytest.mark.skip` without the user agreeing; if you must quarantine, use `xfail(strict=False, reason=...)` with an issue link.

## Rules

- Never delete, skip or weaken an existing test to get green. Explain to the user if you think a test is wrong.
- No real network, no real clock dependence, no shared state between tests.
- Run the single new test first, then its file, then the whole suite.
- After three focused attempts at a failing test, stop and report what you tried.

For test-first workflow (red, green, refactor), use the `tdd-workflow` skill. For browser-level tests, use `e2e-testing-playwright`.

## Report back

Tests added or changed (names), the exact command run, pass/fail counts, coverage change if measured, and for flaky tests the proven root cause.
