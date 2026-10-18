# Error idioms by language

Read the section for the language you are editing. Follow the project's existing conventions when they differ.

## TypeScript / JavaScript

- Wrap with a cause: `throw new Error("loading invoice " + id, { cause: err })`.
- Subclass `Error` for types callers branch on; set `this.name`.
- In `catch (err)`, treat `err` as `unknown` (it is, under `strict` / `useUnknownInCatchVariables`): narrow with `instanceof` before reading fields. Anything can be thrown, not only `Error`.
- Every promise is awaited, returned, or explicitly handled. Lint with `@typescript-eslint/no-floating-promises`.
- Timeouts: `fetch(url, { signal: AbortSignal.timeout(5000) })`; pass an `AbortSignal` down for cancellation.
- ESLint `no-empty` flags empty catch blocks.

## Python

- Wrap with `raise LoadError(f"loading invoice {id}") from err`. Use `from None` only to hide an irrelevant cause deliberately.
- Catch specific exceptions. Bare `except:` also catches `KeyboardInterrupt` and `SystemExit`.
- Use `with` for cleanup. Use `logger.exception(...)` inside `except` to keep the traceback.
- Timeouts: `requests` has none by default; always pass `timeout=`. `httpx` defaults to 5 seconds.
- Ruff rules `BLE001` (blind except) and `S110` (try-except-pass) find swallowed errors.

## Go

- Wrap with `fmt.Errorf("loading invoice %s: %w", id, err)`; inspect with `errors.Is` and `errors.As`.
- Sentinel errors (`var ErrNotFound = errors.New("not found")`) for conditions callers check.
- Never `_ =` an error without a comment saying why it is safe.
- Pass `ctx context.Context` first; use `context.WithTimeout` and always `defer cancel()`.
- `errcheck` (also in `golangci-lint`) finds unchecked errors.

## Rust

- `Result<T, E>` for recoverable errors; `panic!` only for bugs.
- Libraries: a typed error enum (often with `thiserror`). Applications: `anyhow` with `.context("loading invoice")`.
- `?` propagates; `.unwrap()` and `.expect()` only where failure is a bug, with an `expect` message saying why.
- `#[must_use]` on functions whose result must not be ignored.

## Java / Kotlin

- Wrap with the cause constructor: `new LoadException("loading invoice " + id, e)`.
- Use try-with-resources (Java) or `use {}` (Kotlin) for cleanup.
- Do not catch `Throwable` or `Error`. In Kotlin coroutines, rethrow `CancellationException`.
- Set connect and read timeouts on every HTTP client explicitly.

## C#

- Rethrow with `throw;` not `throw ex;` (which resets the stack trace).
- Wrap with `new LoadException("...", ex)` using the inner-exception constructor.
- Use `using` / `await using` for cleanup; pass `CancellationToken` through async calls.
- Filter with `catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.ServiceUnavailable)`.
