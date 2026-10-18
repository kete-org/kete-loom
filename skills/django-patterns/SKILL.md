---
name: django-patterns
description: Django project conventions for building and changing apps, covering app layout, ORM query efficiency with select_related and prefetch_related, safe migrations, forms and model validation, auth and permission checks, per-environment settings, Celery tasks that run after commit, and production security settings. Use when adding a Django model, view, form or Celery task, fixing slow querysets, planning a schema migration, or hardening Django settings for deployment.
license: MIT
compatibility: Any Agent Skills host. Needs Python and the project's Django manage.py. Guidance targets currently supported Django releases.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "python"
  kete-loom/owner: "Kete-org"
---

# Django patterns

Write Django code that follows the project's existing shape, issues a predictable number of queries, and keeps schema changes reversible.

## 0. Before you change anything

1. Find the settings module (`DJANGO_SETTINGS_MODULE` in `manage.py`, `wsgi.py`, `asgi.py` or the env) and the Django version in `pyproject.toml` or `requirements*.txt`.
2. Find how tests run (`pytest` with `pytest-django`, or `python manage.py test`). Run them once and record the result. If they already fail, **stop and tell the user**.
3. Run `python manage.py check`. Fix nothing unrelated; just note warnings.
4. Copy the conventions already there: class-based or function views, DRF or plain views, where services and selectors live.

## 1. App structure

- One app per bounded area (`billing`, `accounts`), not per model. Avoid cyclic imports between apps; refer to other apps' models with the `"app_label.Model"` string in `ForeignKey`.
- Keep views thin: parse input, call a function, return a response. Put multi-model business logic in a plain module (`services.py`) and read-heavy query building in `selectors.py` or a custom `QuerySet`/`Manager`, if the project does that.
- Always reference the user model with `settings.AUTH_USER_MODEL` (in models) or `get_user_model()` (in code), never `django.contrib.auth.models.User` directly.
- Define `__str__` on every model. Set `Meta.ordering` only when every query needs that order (it adds an `ORDER BY` to every query). Put invariants in `Meta.constraints` (`UniqueConstraint`, `CheckConstraint`) rather than relying on form validation alone.

## 2. Query efficiency

Count queries before and after. In tests use `django_assert_num_queries` (pytest-django) or `self.assertNumQueries(n)`.

| Access pattern | Use |
|---|---|
| Forward `ForeignKey` / `OneToOne` used in a loop or template | `select_related("author")` (SQL join) |
| Reverse FK or `ManyToMany` used in a loop | `prefetch_related("tags")` (one extra query) |
| Prefetch with a filter or its own `select_related` | `Prefetch("items", queryset=Item.objects.select_related("sku"))` |
| Only need a few columns | `only(...)`, `values(...)` or `values_list(..., flat=True)` |
| Counting or existence | `.count()`, `.exists()`, never `len(qs)` or `if qs:` on a big queryset |
| Per-row totals | `annotate(Count(...), Sum(...))`, not a query per row |
| Bulk writes | `bulk_create`, `bulk_update`, `qs.update(...)`; remember these skip `save()` and signals |
| Race-free increments | `F("stock") - 1` with `update()`, or `select_for_update()` inside `transaction.atomic()` |

Rules:
- Any loop over a queryset that touches a relation is an N+1 until proven otherwise.
- DRF serializers with nested serializers need the matching `select_related`/`prefetch_related` in the view's `get_queryset`.
- Iterate huge tables with `.iterator(chunk_size=...)`; paginate anything user-facing.
- Raw SQL: use `params=[...]` with `raw()` or `cursor.execute(sql, params)`. **Never** build SQL with f-strings or `%` formatting on user input, and never pass user input to `extra()` or `RawSQL` without params.

## 3. Migrations

1. Change models, then run `python manage.py makemigrations <app>`. Read the generated file; rename it if the auto name is meaningless.
2. Show the SQL for risky steps: `python manage.py sqlmigrate <app> <number>`.
3. Run `python manage.py makemigrations --check --dry-run` to prove nothing is left ungenerated. Add it to CI if missing.
4. Apply locally with `python manage.py migrate`, then roll back with `python manage.py migrate <app> <previous_migration_name>` and re-apply to prove reversibility.

Safe-change rules for tables with live traffic:
- Adding a non-null column: add it nullable (or with a database default), backfill in a separate data migration, then make it non-null in a later migration.
- Removing or renaming a column: first ship code that no longer reads it, then drop it in the next release. `RenameField` breaks old code still running during a rolling deploy.
- Data migrations use `RunPython(forwards, backwards)` with `apps.get_model("app", "Model")`, never a direct import of the model class. Supply a `backwards` function or `RunPython.noop` deliberately.
- On PostgreSQL, add indexes to big tables with `AddIndexConcurrently` in a migration with `atomic = False`.
- **Stop and ask the user** before writing a migration that drops a column or table, rewrites a large table, or squashes migrations other branches may depend on.
- Never edit a migration that has already been applied anywhere shared; add a new one.

## 4. Forms and validation

- Validate user input with a `Form`/`ModelForm` (or DRF serializer). Use `form.cleaned_data`, never `request.POST[...]` directly.
- Field-level checks go in `clean_<field>()`, cross-field checks in `clean()`. Invariants that must hold everywhere belong on the model (`clean()` plus database constraints), because `save()` does not call `full_clean()`.
- Always list `fields` explicitly on a `ModelForm`; never `fields = "__all__"` or `exclude` for forms users submit, or a new model field becomes writable.
- Keep CSRF on. `@csrf_exempt` is only for endpoints authenticated another way (signed webhooks), with a comment saying why.

## 5. Auth and permissions

- Every view that is not public needs an explicit check: `@login_required`, `LoginRequiredMixin`, `@permission_required`, `PermissionRequiredMixin`, or DRF `permission_classes`.
- Authentication is not authorization. Scope object lookups to the user: `get_object_or_404(Invoice, pk=pk, owner=request.user)`, or filter `get_queryset()` by owner/tenant. Never fetch by `pk` alone and trust it.
- Check DRF's `DEFAULT_PERMISSION_CLASSES`; if it is `AllowAny`, every view must set its own.
- Use `user.has_perm("app.change_model")` for permissions; don't compare group names in code.

## 6. Settings per environment

- One settings package (`settings/base.py`, `dev.py`, `prod.py`) or one module reading environment variables (`django-environ`, `os.environ`). Follow whichever exists.
- Secrets (`SECRET_KEY`, database password, API keys) come from the environment, never from committed files. Fail at startup if a required secret is missing in production.
- `DEBUG = False` in production, with `ALLOWED_HOSTS` set explicitly.

## 7. Celery tasks

- Pass IDs to tasks, not model instances or querysets; reload inside the task.
- Enqueue after the transaction commits: `transaction.on_commit(lambda: send_receipt.delay(order.id))` (Celery 5.4+ also offers `send_receipt.delay_on_commit(order.id)`). Enqueuing inside `atomic()` lets the worker read data that isn't committed yet, or that is rolled back.
- Make tasks idempotent; brokers can deliver twice. Use `autoretry_for`, `retry_backoff` and `max_retries` for transient errors only.
- Set time limits (`soft_time_limit`, `time_limit`) on anything that calls the network.
- In tests, call the task function directly, or enable eager mode only in test settings. With the usual `config_from_object("django.conf:settings", namespace="CELERY")` the key is `CELERY_TASK_ALWAYS_EAGER`; check the project's namespace before naming it.

## 8. Production security settings

Run `python manage.py check --deploy --settings=<prod settings>` and resolve each warning or document why it doesn't apply. The usual set:

```python
DEBUG = False
SECURE_SSL_REDIRECT = True          # unless the proxy already redirects
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # only behind a proxy that sets it
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000      # start small (e.g. 3600) and raise once HTTPS is confirmed
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
CSRF_TRUSTED_ORIGINS = ["https://app.example.com"]
```

- Never render user content with `mark_safe`, `|safe` or `format_html` misuse; let templates autoescape.
- Uploaded files: validate type and size, and never serve `MEDIA_ROOT` from the same origin with executable content types.

## Rules

- Never disable a security middleware, CSRF, or a permission check to make a test pass.
- Never run `migrate` against a shared or production database yourself; hand the user the command.
- Never commit secrets or a `DEBUG = True` production settings file.

## Report back

End with: files changed, migrations created (with the `sqlmigrate` summary for risky ones), query counts before and after for any queryset you optimised, the test command and its result, and any `check --deploy` warning left open.
