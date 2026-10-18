---
name: error-handling-patterns
description: Language-agnostic rules for designing how code fails, covering when to crash versus recover, typed and wrapped errors with context, retry with exponential backoff and jitter only for idempotent work, timeouts on every remote call, and separating what the user sees from what gets logged. Use when writing or restructuring try/catch, Result or error-return code, adding retries or timeouts to a network client, or deciding what an API should return on failure.
license: MIT
compatibility: Any Agent Skills host. No tools required beyond the project's own test runner.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Error handling patterns

Every error is either handled (something useful happens) or propagated (with context). Nothing in between.

## 0. Before you change anything

1. Find the project's existing error conventions: a base error class, an error-code enum, a `Result` type, a logging helper, an HTTP error middleware. Search for them before inventing new ones.
2. Find where errors finally land: top-level handler, request middleware, job runner, CLI `main`. That is where logging and user messages belong.
3. If the project has none of this and the change needs it, **stop and ask the user** whether to introduce a convention or keep it local.

## 1. Classify the failure first

| Kind | Examples | Default action |
|---|---|---|
| Programmer bug | null where impossible, broken invariant, bad index | Fail fast. Crash or throw; do not catch. |
| Invalid input | bad request body, unknown CLI flag, malformed file | Reject at the boundary with a precise message. Do not retry. |
| Expected domain outcome | not found, insufficient funds, already exists | Return it as a value or a typed error the caller must handle. |
| Transient infrastructure | timeout, connection reset, 429, 503, deadlock | Retry with backoff if the operation is idempotent; otherwise surface. |
| Fatal environment | missing config, disk full, bad credentials at startup | Fail at startup with a clear message, not on first request. |

Decision rule: if you cannot name what the caller should do differently for an error, it is not a separate type. Do not create one error class per function.

## 2. Raise and wrap with context

- Throw or return the most specific type the project already has.
- When propagating, add what *this* layer knows (the ID, the file path, the operation) and keep the original as the cause. Idioms per language are in `references/language-idioms.md`.
- Wrap once per layer that adds information. Do not re-wrap the same error at every stack frame.
- Never build an error message from secrets, tokens, full request bodies or personal data.
- Never use exceptions for normal control flow (loop exits, "not found" in a hot path) where the language offers a value.

## 3. Catch only what you can handle

A catch block is justified only if it does one of these:

1. Recovers: retries, falls back to a value that is **correct** for the caller, or takes a compensating action.
2. Translates: converts a low-level error into the layer's own type, keeping the cause.
3. Reports at the edge: logs once and converts to a user response or exit code.
4. Cleans up and rethrows (prefer `finally`, `defer`, `using`, `with`, RAII instead).

Never:
- Leave a catch block empty, or with only a comment.
- Catch the broadest type (`Exception`, `Throwable`, bare `except:`, `catch (e)`) except at the top-level edge.
- Log and rethrow at every layer; you get the same error five times in the logs.
- Return a default (`null`, `[]`, `0`, `false`) that the caller cannot tell apart from a real result.
- Ignore a returned error value or an unawaited promise or future.

## 4. Retries

Retry only when **all** are true:

- The failure is transient (timeouts, connection errors, 408, 429, 502, 503, 504, database serialisation or deadlock errors).
- The operation is idempotent, or you send an idempotency key the server honours. A non-idempotent POST that timed out may already have succeeded.
- There is a cap on attempts (typically 3 to 5) and on total time.

How:
1. Exponential backoff with jitter: `sleep = random(0, min(cap, base * 2^attempt))`. Without jitter, clients retry in lockstep.
2. Honour a `Retry-After` header when the server sends one.
3. Retry at one layer only. Retries in the HTTP client, the SDK and the job queue multiply.
4. Log each retry at debug or warn with the attempt number; log the final failure at error.
5. For writes that must not run twice (payments, emails, stock changes), generate the idempotency key once per logical operation and reuse it on every attempt.

Prefer the retry helper the project or SDK already ships over a hand-written loop.

## 5. Timeouts and cancellation

- Every network call, queue read, lock wait and subprocess gets an explicit timeout. Library defaults are often infinite.
- Pass the caller's deadline or cancellation token down (`context.Context`, `AbortSignal`, `CancellationToken`) instead of starting fresh timers at each layer.
- The inner timeout must be shorter than the outer one, or retries never get a chance.
- On timeout, treat the outcome of a write as unknown, not failed. Reconcile or use an idempotency key.

## 6. What the user sees vs what is logged

| Audience | Gets |
|---|---|
| End user / API client | A stable error code, a short human message, a correlation or request ID. No stack traces, SQL, paths or internal hostnames. |
| Logs | The full error chain, stack trace, operation, relevant IDs, correlation ID. No secrets or personal data. |

- Log each error exactly once, at the place that handles it (usually the edge).
- Use the level that matches action needed: error means someone should look; expected domain outcomes are info or not logged.
- Map error types to status codes or exit codes in one place, not scattered through handlers.

## 7. Verify

1. Write or update a test for each new error path: the error type or code returned, the message the user sees, and that cleanup ran.
2. For retries, test with a fake that fails N times then succeeds, and one that always fails; assert the attempt count and that non-idempotent calls are not retried.
3. For timeouts, test with a fake that never responds.
4. Run the full test suite. Do not report done while it is red.

## Report format

When you finish, report:

```
Error handling changes
- <file:line> <what changed> (<kind from step 1>)
Retries: <where, policy, idempotency guarantee> | none
Timeouts: <where, value> | none
Tests: <command run> -> <pass/fail>
Open questions: <anything you stopped to ask, or none>
```
