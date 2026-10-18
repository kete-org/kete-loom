---
name: kotlin
description: Always-on rules for Kotlin code, covering null safety, sealed types, coroutines and structured concurrency, Java interop, and build and test checks.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.kt, **/*.kts"
  kete-loom/owner: "Kete-org"
---

- Never use `!!` in new code. Use `?:` with an early return or error, `requireNotNull`/`checkNotNull`, or a non-null type validated at the boundary.
- Give values from unannotated Java APIs an explicit Kotlin type at the call site so a null fails where it enters.
- Use `lateinit var` only for values a framework sets before first use, never for values that can be missing.
- Prefer `val` and read-only collection types; never put mutable collections in a `data class`, since `copy()` shares them.
- Model closed sets of states with `sealed interface` or `sealed class`, and match them with `when` as an expression with no `else`.
- Never use `GlobalScope`. Launch coroutines in a scope tied to a lifecycle and let structured concurrency cancel them.
- Never block a coroutine thread with `Thread.sleep` or blocking I/O; use `delay`, suspending APIs, or `withContext(Dispatchers.IO)`.
- Never swallow `CancellationException`. When catching `Exception` or `Throwable` (or using `runCatching`) in suspending code, rethrow it.
- Do not use `runBlocking` in production code paths; keep it to `main` and tests that cannot use `runTest`.
- Make shared mutable state safe with `Mutex`, atomics or confinement to one dispatcher; never mutate it from several coroutines unguarded.
- Use `use { }` on every `Closeable` so it is closed on all paths.
- Use the project's configured build (Gradle or Maven), formatter and linter, and run its tests before finishing.
- Test suspending code with `runTest` from kotlinx-coroutines-test, not `runBlocking` with real delays.

For more, load the kotlin-patterns and kotlin-testing skills.
