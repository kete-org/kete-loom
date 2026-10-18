---
name: fastapi-patterns
description: FastAPI service construction with APIRouter modules, Pydantic models as the request and response contract, Depends-based injection for settings, database sessions and the current user, choosing async def versus def per endpoint, consistent error bodies, BackgroundTasks, lifespan startup, and tests through TestClient or httpx with dependency_overrides. Use when creating or extending a FastAPI app, wiring a database session or auth into routes, deciding whether an endpoint should be async, or writing tests for FastAPI endpoints.
license: MIT
compatibility: Any Agent Skills host. Needs Python and the project's FastAPI app. Assumes Pydantic v2; check the project's version first.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "python"
  kete-loom/owner: "Kete-org"
---

# FastAPI patterns

Build endpoints whose inputs and outputs are typed contracts, whose resources are opened and closed by dependencies, and which never block the event loop.

## 0. Before you change anything

1. Find the app object (`app = FastAPI(...)`) and how routers are included. Check the FastAPI and Pydantic versions in `pyproject.toml` or the lock file. Pydantic v1 and v2 APIs differ (`orm_mode` vs `from_attributes`, `.dict()` vs `.model_dump()`); match what is installed.
2. Find the database layer (SQLAlchemy sync or async, SQLModel, an async driver) and the existing session dependency. Reuse it.
3. Run the tests once (`pytest`). If they already fail, **stop and tell the user**.

## 1. Layout

```
app/
  main.py          # create FastAPI(), include routers, lifespan, exception handlers
  config.py        # Settings(BaseSettings) read from env
  deps.py          # get_db, get_current_user, get_settings
  routers/orders.py
  schemas/orders.py   # Pydantic models (API contract)
  models/orders.py    # ORM models (storage)
  services/orders.py  # business logic, no FastAPI imports
```

- One `APIRouter(prefix="/orders", tags=["orders"])` per resource, included with `app.include_router(...)`.
- Keep ORM models and Pydantic schemas separate. Service functions take plain values and a session, so they can be tested without HTTP.

## 2. Pydantic at the boundary

- Separate input and output schemas: `OrderCreate` (what the client may send), `OrderUpdate` (all optional), `OrderRead` (what you return). Never accept the ORM model or a `dict` as a request body.
- Forbid unknown fields on inputs where silent drops would hide client bugs: `model_config = ConfigDict(extra="forbid")`.
- Constrain fields: `Field(gt=0)`, `Field(max_length=200)` or `Annotated[str, StringConstraints(max_length=200)]`, `EmailStr` (needs the `email-validator` package), enums for closed sets.
- Set `response_model=OrderRead` (or a return annotation) on every route that returns data, so fields like `password_hash` or `internal_notes` can't leak. For ORM objects, `OrderRead` needs `model_config = ConfigDict(from_attributes=True)`.
- Never let the client set server-owned fields (`id`, `owner_id`, `role`, `price`); set them from the authenticated user or your database.

## 3. Dependency injection

Prefer the `Annotated` style and reuse aliases:

```python
from typing import Annotated
from fastapi import Depends

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

@router.get("/{order_id}", response_model=OrderRead)
def read_order(order_id: int, db: DB, user: CurrentUser):
    order = db.get(Order, order_id)
    if order is None or order.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
```

- Resources (sessions, clients, files) are opened in a `yield` dependency and closed in `finally`. Never create a session at module import or store one on a global.
- Decide commit policy once: either the dependency commits on success and rolls back on exception, or services commit explicitly. Follow the existing pattern.
- Settings: `@lru_cache` on `get_settings()` returning a `BaseSettings` (from `pydantic-settings` in v2), injected with `Depends`.
- Shared clients (`httpx.AsyncClient`, connection pools) are created in the `lifespan` context manager and closed when it exits; `@app.on_event` is deprecated.

## 4. async def or def

| Endpoint body does | Declare it |
|---|---|
| Only `await`s async libraries (async SQLAlchemy, `httpx.AsyncClient`, `asyncpg`) | `async def` |
| Calls blocking code (sync SQLAlchemy, `requests`, `time.sleep`, file I/O, CPU work) | `def` (FastAPI runs it in a threadpool) |
| Mostly async but one blocking call | `async def` plus `await run_in_threadpool(fn, ...)` (from `starlette.concurrency`) or `asyncio.to_thread` |

- **Never** call blocking I/O inside `async def`. It stalls every request on that worker.
- The same rule applies to dependencies: a sync `get_db` is fine; an `async def` dependency must not block.
- Heavy CPU work belongs in a worker queue, not a request.

## 5. Auth

- Implement auth as a dependency (`get_current_user`) built on `OAuth2PasswordBearer`, `HTTPBearer` or `APIKeyHeader`. Raise `HTTPException(401, headers={"WWW-Authenticate": "Bearer"})` on a bad token.
- Verify JWT signature, `exp`, and the expected algorithm (pass `algorithms=["HS256"]` or the one you use; never accept `none`). Check audience/issuer if you issue tokens for several services.
- Protect whole routers with `APIRouter(dependencies=[Depends(get_current_user)])` and add per-route role checks (`require_role("admin")`) on top. Every new route on an unprotected router needs its own dependency.
- Authorization is per object: filter by `owner_id`/tenant, and return 404 rather than 403 when revealing existence would leak data.

## 6. Error responses

- Raise `HTTPException(status_code, detail)` for expected client errors: 404 for not found, 409 for conflicts. FastAPI already returns 422 for request validation failures; don't reuse 422 for business-rule errors unless the API's error contract says so.
- Map domain exceptions once with `@app.exception_handler(OrderNotFound)` instead of try/except in every route.
- Keep one error body shape across the API. If you customise validation errors, override `RequestValidationError`'s handler and keep field locations.
- Never return stack traces or raw database errors to clients; log them server-side with a request id.

## 7. Background work

- `BackgroundTasks.add_task(fn, *args)` runs after the response is sent, in the same process. Use it only for short, loss-tolerant work (sending a notification email).
- Don't pass the request's database session to a background task; it may be closed. Open a new session inside the task.
- Anything that must survive a restart, retry, or take more than a few seconds goes to a real queue (Celery, RQ, Arq, Dramatiq).

## 8. Testing

- Sync tests: `from fastapi.testclient import TestClient`; `with TestClient(app) as client:` so lifespan runs.
- Async tests: `httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")` with `pytest-asyncio` or `anyio`. This client does **not** run lifespan; if the app needs it, wrap the app in `LifespanManager` from `asgi-lifespan` and pass `manager.app` to the transport.
- Swap dependencies, not internals: `app.dependency_overrides[get_db] = override_get_db`, `app.dependency_overrides[get_current_user] = lambda: fake_user`. Clear them in fixture teardown.
- Use a separate test database or a transaction rolled back per test. Never point tests at a shared database.
- For every route test the happy path, a validation failure (422), an unauthenticated call (401), another user's object (404/403), and that the response omits private fields.

## Rules

- Never return ORM objects without a `response_model`.
- Never block the event loop in `async def` routes or dependencies.
- Never disable auth dependencies to make a test pass; override them in the test.

## Report back

End with: routes added or changed (method and path), schemas added, dependencies touched, which endpoints are `async def` and why, the test command and result, and anything left untested.
