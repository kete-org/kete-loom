---
name: flask-patterns
description: Flask application structure with a create_app factory, blueprints per feature, config loaded from objects and environment variables, extensions such as Flask-SQLAlchemy and Flask-Migrate initialised with init_app, application and request context pitfalls with current_app and g, security hardening, and pytest tests through the test client. Use when starting or restructuring a Flask app, adding a blueprint or extension, debugging "working outside of application context" errors, or testing Flask views.
license: MIT
compatibility: Any Agent Skills host. Needs Python and the project's Flask app. Guidance targets Flask 2.x and 3.x with Flask-SQLAlchemy 3.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "python"
  kete-loom/owner: "Kete-org"
---

# Flask patterns

Keep a Flask app importable without side effects, configurable per environment, and testable with a fresh app per test.

## 0. Before you change anything

1. Find the app: a `create_app()` factory or a module-level `app = Flask(__name__)`. Check Flask and extension versions in `pyproject.toml` or `requirements*.txt`.
2. Find how it runs (`flask --app <module> run`, gunicorn target, `FLASK_APP`) and how tests run. Run the tests once; if they already fail, **stop and tell the user**.
3. If the app is a single module-level `app`, ask the user before converting it to a factory; it touches every import of `app`.

## 1. Application factory

```python
# myapp/__init__.py
from flask import Flask
from .extensions import db, migrate

def create_app(config_object="myapp.config.Config", test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_object)
    app.config.from_prefixed_env()          # FLASK_SECRET_KEY, FLASK_SQLALCHEMY_DATABASE_URI, ...
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    migrate.init_app(app, db)

    from .orders import bp as orders_bp
    app.register_blueprint(orders_bp, url_prefix="/orders")
    return app
```

- Extensions are created unbound in `extensions.py` (`db = SQLAlchemy()`) and bound with `init_app(app)` in the factory. This avoids circular imports and lets tests build many apps.
- Import blueprints inside the factory (or in a module that doesn't import the app) to avoid import cycles.
- No work at import time: no database connections, no reading secrets into module globals, no `app.run()` outside `if __name__ == "__main__":`.

## 2. Blueprints

- One blueprint per feature (`auth`, `orders`, `admin`), each in its own package with `routes.py`, templates in a per-blueprint subfolder of the templates folder.
- Use `url_for("orders.detail", order_id=o.id)` (blueprint-qualified endpoint names), never hard-coded paths.
- Protect a whole blueprint with `@bp.before_request` that checks login or role, then add per-view checks for object ownership.
- Register error handlers per blueprint with `@bp.errorhandler` or app-wide with `@app.errorhandler`; return JSON for API blueprints and HTML for page blueprints, consistently.

## 3. Config

- Base `Config` class with safe defaults, subclasses `DevConfig`, `TestConfig`, `ProdConfig` if the project uses them; or one class plus environment variables.
- `SECRET_KEY` and database URLs come from the environment or the `instance/` folder (which is not committed). Fail at startup in production if `SECRET_KEY` is missing.
- Read config at request time through `current_app.config["KEY"]`, not by importing a module constant, so tests can override it.
- `DEBUG`/`app.debug` must be off in production; the Werkzeug debugger allows arbitrary code execution.

## 4. Flask-SQLAlchemy and Flask-Migrate

- Use the session the extension scopes to the app context: `db.session`. It is removed at the end of each request; don't create your own `Session()` per request.
- SQLAlchemy 2 style queries: `db.session.execute(db.select(Order).filter_by(owner_id=uid)).scalars()`, `db.get_or_404(Order, id)`, `db.paginate(...)`. Follow the existing style if the project still uses `Model.query`.
- Avoid N+1 queries with `selectinload`/`joinedload` in `options(...)` when a template walks a relationship.
- Commit once per unit of work; on exception call `db.session.rollback()` before re-raising or returning an error.
- Migrations: `flask db migrate -m "add order status"`, read the generated script (autogenerate misses renames and some type changes), then `flask db upgrade`. Run `flask db downgrade` and `upgrade` again locally to prove reversibility.
- **Stop and ask the user** before a migration that drops columns or tables or rewrites a large table. Never run `flask db upgrade` against a shared or production database yourself.

## 5. Contexts: current_app, g, request, session

| Symptom | Cause | Fix |
|---|---|---|
| `RuntimeError: Working outside of application context` | Using `current_app`, `db.session` or `g` in a script, CLI, thread or test with no app pushed | `with app.app_context():` around the work, or use a `@app.cli.command()` (which pushes one) |
| `Working outside of request context` | Touching `request` or `session` outside a request | Pass values in as arguments; in tests use `app.test_request_context()` |
| Data shared between users | Storing per-request state in a module global | Store it on `g` (lives for one app context) |
| Background thread loses context | Contexts are per thread | Pass plain data and push `app.app_context()` in the thread; better, use a task queue |

- Never pass `request`, `g` or `current_app` proxies to a thread or task. Use `current_app._get_current_object()` only when you must hand the real app object over.

## 6. Security

- Forms: Flask-WTF's `CSRFProtect` (create `csrf = CSRFProtect()` in `extensions.py`, call `csrf.init_app(app)` in the factory) for any cookie-authenticated POST. Exempt only token-authenticated API endpoints, and say why.
- Cookies in production: `SESSION_COOKIE_SECURE=True`, `SESSION_COOKIE_HTTPONLY=True` (default), `SESSION_COOKIE_SAMESITE="Lax"`. The default session is signed, not encrypted: never put secrets in it.
- Templates autoescape `.html` files; never use `Markup(...)` or `|safe` on user input, and never `render_template_string` with user-controlled template text.
- Uploads: `secure_filename`, `MAX_CONTENT_LENGTH`, an allow-list of extensions, and save outside the static folder.
- Redirects: validate `next` parameters against your own host before redirecting.
- SQL: use the ORM or `text()` with bound parameters, never f-strings.
- Behind a proxy, wrap with `werkzeug.middleware.proxy_fix.ProxyFix` set to the real number of proxies, not more.

## 7. Testing

```python
# tests/conftest.py
import pytest
from myapp import create_app
from myapp.extensions import db

@pytest.fixture
def app():
    app = create_app(test_config={"TESTING": True,
                                  "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                                  "WTF_CSRF_ENABLED": False})
    with app.app_context():
        db.create_all()
    yield app                   # outside the context, so tests catch missing-context bugs
    with app.app_context():
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()
```

- A fresh app per test via the factory; never import a shared global app into tests.
- Use `client.get/post(...)`, `follow_redirects=True` where the flow redirects, and `with client.session_transaction() as s:` to set session state.
- Test CLI commands with `app.test_cli_runner()`.
- If production uses PostgreSQL, run at least the query-heavy tests against PostgreSQL; SQLite hides type and constraint differences.
- For each view: happy path, invalid form, unauthenticated, another user's object.

## Rules

- Never leave `debug=True` or a hard-coded `SECRET_KEY` in committed code.
- Never disable CSRF outside test config.
- Never add global mutable state for per-request data.

## Report back

End with: files changed, blueprints and routes added, extensions or config keys added, migrations generated (with what you checked in the script), the test command and result, and anything left untested.
