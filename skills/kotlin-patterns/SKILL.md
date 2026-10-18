---
name: kotlin-patterns
description: Idiomatic Kotlin for JVM and Android code, covering null safety without !!, data and sealed classes with exhaustive when, restrained extension functions, structured concurrency with coroutine scopes and dispatchers, cold Flow versus StateFlow and SharedFlow, Result and exception handling, and Gradle Kotlin DSL build scripts with version catalogs. Use when writing or restructuring Kotlin code, modelling state with sealed hierarchies, choosing a coroutine scope or dispatcher, exposing data as a Flow, or editing build.gradle.kts files.
license: MIT
compatibility: Any Agent Skills host. Needs the project's Gradle wrapper (or Maven) and a JDK to build and test.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Kotlin patterns

Write Kotlin that the compiler can check: nullability in the types, states in sealed hierarchies, concurrency tied to a scope. Follow the project's existing style first; these rules settle what it does not.

## 0. Before you write

1. Find the Kotlin version, JVM target and build tool: search `gradle/libs.versions.toml`, `build.gradle.kts` and `settings.gradle.kts`. Do not use language or library features newer than that version.
2. Check whether the code is Android (an `com.android.*` plugin is applied) or plain JVM. Android code must never block the main thread.
3. Find the existing conventions: error type (exceptions, `Result`, a sealed `Outcome`), DI framework, coroutine scopes in use, and the lint/format tool (ktlint, detekt, Spotless). Match them.

## 1. Null safety

- Model absence in the type (`String?`) only when absence is a real state. Otherwise make it non-null and validate at the boundary.
- Never use `!!` in new code. Replace it with, in order of preference:
  1. a non-null type, so the question never arises;
  2. `?: return`, `?: continue` or `?: throw IllegalStateException("why")` with a message;
  3. `requireNotNull(x) { "message" }` for arguments, `checkNotNull(x) { "message" }` for state.
- Use `?.let { }` for a short side effect, not as a general `if`. Two nested `?.let` blocks mean an early return reads better.
- `lateinit var` only for values a framework sets before first use (DI fields, test setup). Never for values that can legitimately be missing.
- Java interop: values from unannotated Java APIs are platform types (`String!`). Give them an explicit Kotlin type at the call site (`val name: String? = javaObj.name`) so a null fails where it enters, not three calls later. For strict JSR-305 annotations, the compiler flag is `-Xjsr305=strict`.

## 2. Data, value and sealed types

- `data class` for value holders with structural equality. Keep properties `val`; use `copy()` to change them. Do not put mutable collections in them.
- `@JvmInline value class` to give a primitive a meaning (`UserId(val raw: String)`) without allocation.
- `sealed interface` (or `sealed class` when subtypes share state) for closed sets of states or results:

```kotlin
sealed interface LoadState<out T> {
    data object Loading : LoadState<Nothing>
    data class Loaded<T>(val value: T) : LoadState<T>
    data class Failed(val cause: Throwable) : LoadState<Nothing>
}

fun render(state: LoadState<User>) = when (state) {
    LoadState.Loading -> showSpinner()
    is LoadState.Loaded -> show(state.value)
    is LoadState.Failed -> showError(state.cause)
}
```

- `data object` needs Kotlin 1.9 or later; on older versions use a plain `object`.
- Use `when` as an expression over a sealed type with no `else` branch, so adding a subtype is a compile error at every call site.
- `enum class` when the cases carry no per-instance data.

## 3. Functions and extensions

- Prefer expression bodies for one-expression functions, named and default arguments over overloads, and `val` over `var`.
- Write an extension function only when it reads as a natural operation on that type and is used in more than one place. Keep it `private` or `internal` unless it is part of a public API. Never add extensions on `Any`, `String` or other broad types for one call site.
- Scope functions: `apply` to configure an object, `also` for a side effect, `let` for a nullable or a transform, `run`/`with` sparingly. Do not nest them.
- Collections: return read-only `List`/`Map` types; keep `MutableList` private. Use `Sequence` only for long pipelines over large inputs.

## 4. Coroutines and structured concurrency

Rules that prevent leaks and freezes:

1. Every coroutine has an owner scope with a lifecycle: `viewModelScope`, `lifecycleScope`, a scope injected into a class that cancels it on shutdown, or `coroutineScope { }` inside a suspend function.
2. Never use `GlobalScope` in production code. Never create `CoroutineScope(Job())` in a class without a matching `cancel()`.
3. Suspend functions are main-safe: the function that blocks switches dispatcher itself with `withContext(Dispatchers.IO)` (blocking I/O) or `withContext(Dispatchers.Default)` (CPU work). Callers never have to know.
4. Inject dispatchers (constructor parameter with a default) so tests can replace them.
5. Never call `runBlocking` on the main thread or inside a coroutine. It is for `main()` and bridging blocking APIs at the edge.
6. Never swallow `CancellationException`. If you catch `Exception` or `Throwable` in suspend code, rethrow cancellation:

```kotlin
try { repo.sync() }
catch (e: CancellationException) { throw e }
catch (e: IOException) { log.warn("sync failed", e) }
```

7. Use `coroutineScope` when one child failing should cancel siblings, and `supervisorScope` when children are independent. Parallel work: `coroutineScope { val a = async { f() }; val b = async { g() }; a.await() to b.await() }`.
8. Long loops must be cancellable: call `ensureActive()` or a suspending function each iteration.

## 5. Flow

- A `Flow` is cold: it runs once per collector. Expose `Flow` from repositories, `StateFlow` for UI state, `SharedFlow` for events.
- Keep mutable flows private: `private val _state = MutableStateFlow(UiState())` and `val state: StateFlow<UiState> = _state.asStateFlow()`. Update with `_state.update { it.copy(...) }`, never read-modify-write.
- Convert cold to hot with `stateIn(scope, SharingStarted.WhileSubscribed(5_000), initial)` so the upstream stops when nobody listens.
- Move upstream work off the main thread with `flowOn(Dispatchers.IO)`. Never call `emit` from inside `withContext` or `launch` within `flow { }`: it throws `IllegalStateException` (Flow invariant is violated). Use `flowOn`, or `channelFlow` when you need concurrent emitters. A `withContext` that returns a value you then emit outside it is fine.
- Collect on Android with `repeatOnLifecycle(Lifecycle.State.STARTED)` (or `collectAsStateWithLifecycle()` in Compose) so collection stops in the background.
- `collect` suspends until the flow ends. Two `collect` calls in a row in one coroutine means the second never runs for an infinite flow: launch each in its own coroutine.
- Pick the operator on purpose: `map`, `filter`, `combine`, `flatMapLatest` (cancel previous), `debounce`, `distinctUntilChanged`. Handle errors with `catch { }` upstream of `collect`.

## 6. Error handling

- Exceptions for programming errors and truly unexpected failures; `require`/`check`/`error()` for preconditions.
- For expected domain failures, return a sealed result type the caller must handle. Use the project's existing type if there is one.
- `runCatching` also catches `CancellationException`; do not use it around suspend calls unless you rethrow cancellation.
- Never catch and ignore. Log with context or convert to a domain error.

## 7. Gradle Kotlin DSL

- Keep versions in `gradle/libs.versions.toml` and reference them as `libs.foo`, `alias(libs.plugins.foo)`. Do not hard-code versions in module scripts.
- Set the JDK with `kotlin { jvmToolchain(17) }` (use the project's version) rather than `sourceCompatibility` alone.
- Compiler options go in `kotlin { compilerOptions { ... } }`, for example `freeCompilerArgs.add("-Xjsr305=strict")` or `allWarningsAsErrors.set(true)`.
- Shared build logic goes in convention plugins (`build-logic/` or `buildSrc/`), not copy-pasted blocks.
- Prefer KSP (`com.google.devtools.ksp`, `ksp(...)`) over kapt for processors that support it.
- Keep the Kotlin Gradle plugin, KSP, Compose compiler and Android Gradle Plugin versions compatible; check the official compatibility tables before bumping one.
- Run builds through the wrapper: `./gradlew build`.

## 8. Check your work

1. Build and test: `./gradlew build` (or the module task, e.g. `./gradlew :app:testDebugUnitTest`).
2. Run the project's linter if configured (`./gradlew ktlintCheck`, `./gradlew detekt`, `./gradlew spotlessCheck`).
3. Search your diff for `!!`, `GlobalScope`, `runBlocking` and `catch (e: Exception)` and justify or remove each.

## Stop and ask the user

- Before changing a public API signature other modules or apps call.
- Before bumping the Kotlin, AGP or Gradle version to use a feature.
- When the project mixes error styles and you would have to pick one for a new module.

## Report back

List the files changed, the build and lint commands you ran with their result, and any `!!`, `runBlocking` or broad catch you kept, with the reason.

For tests, use the `kotlin-testing` skill. For a review of existing changes, the `kotlin-reviewer` agent. For compile or Gradle failures, the `kotlin-build-resolver` agent.
