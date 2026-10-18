# Mocking and patching in pytest

Read this when a test needs to replace a dependency and the short rules in `SKILL.md` aren't enough.

## Where to patch

```python
# app/http.py
def post(url, data): ...

# app/billing.py
from app.http import post
def charge(amount): return post("/charge", {"amount": amount})
```

- `patch("app.billing.post")` works: `charge` looks up `post` in `app.billing`.
- `patch("app.http.post")` does nothing for `charge`, because `app.billing` already holds its own reference.
- If the module does `import app.http` and calls `app.http.post(...)`, then patch `app.http.post`.

## monkeypatch vs unittest.mock

| Need | Use |
|---|---|
| Set or remove an env var | `monkeypatch.setenv` / `monkeypatch.delenv` |
| Replace a function with a simple fake | `monkeypatch.setattr("app.billing.post", fake_post)` |
| Assert how a boundary was called | `mocker.patch(...)` (pytest-mock) or `unittest.mock.patch(...)` |
| Fake an object with a real class's signature | `create_autospec(RealClass, instance=True)` |
| Fake an `async def` | `AsyncMock`, or `patch(..., autospec=True)` on the coroutine function |

Both monkeypatch and `patch` used as a context manager or decorator undo themselves. A `patch(...).start()` without `.stop()` leaks into later tests; use `mocker` (pytest-mock) or a fixture with `yield` instead.

## Asserting calls

```python
from unittest.mock import patch

def test_charge_posts_amount():
    with patch("app.billing.post", autospec=True) as post:
        post.return_value = {"ok": True}
        charge(500)
    post.assert_called_once_with("/charge", {"amount": 500})
```

- A plain `Mock` raises `AttributeError` for misspelled names starting with `assert` / `assret` / `asert` / `aseert` / `assrt`. On Python before 3.12, `post.called_once_with(...)` (no `assert_`) just creates a child mock and the test passes without checking anything; 3.12 also rejects that. Autospecced mocks reject unknown attributes on every version, so prefer `autospec=True`.
- `side_effect=Exception("boom")` to test error paths; `side_effect=[1, 2, StopIteration]` for sequences.

## Fakes over mocks

For repositories, caches and queues, an in-memory fake is clearer than a mock:

```python
class FakeUserRepo:
    def __init__(self): self.users = {}
    def get(self, uid): return self.users.get(uid)
    def save(self, user): self.users[user.id] = user
```

Inject it through the constructor or a fixture. The test then asserts on state (`repo.users`) instead of call sequences.

## HTTP

- httpx: `respx` (`respx.mock` fixture or decorator) or `httpx.MockTransport`.
- requests: `responses` (`@responses.activate`) or `requests-mock`.
- Block accidental real calls in CI: the project's choice, for example pytest-socket's `--disable-socket`.

## Common pitfalls

- Patching `datetime.datetime.now` directly fails (built-in type). Inject a clock or use `time-machine` / `freezegun`.
- `MagicMock` is truthy and returns more mocks for any attribute, so code under test can "succeed" on nonsense. Autospec, or use a fake.
- Mocks in a `session`-scoped fixture are shared by every test; keep mocks `function`-scoped.
- Over-mocking: if a test patches more than two or three things, test a smaller unit or use a fake.
