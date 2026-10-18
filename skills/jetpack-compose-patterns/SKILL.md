---
name: jetpack-compose-patterns
description: Android Jetpack Compose UI work centred on hoisting state into stateless composables, understanding recomposition, stability and strong skipping, choosing the right side-effect API (LaunchedEffect, DisposableEffect, rememberUpdatedState, derivedStateOf, snapshotFlow), exposing ViewModel state with collectAsStateWithLifecycle, type-safe Navigation Compose routes, and lazy-list and baseline-profile performance. Use when writing or restructuring Compose screens on Android, debugging excessive recomposition or janky LazyColumn scrolling, wiring a ViewModel to a composable, or setting up Compose navigation.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK and the project's Gradle wrapper (./gradlew); device runs need the Android SDK and an emulator or device.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "java"
  kete-loom/owner: "Kete-org"
---

# Jetpack Compose patterns

Write Compose UI where state lives in one place, composables skip when their inputs didn't change, and effects run exactly when intended. Kotlin language features, coroutines and Flow belong to `kotlin-patterns`; sharing code with iOS belongs to `kotlin-multiplatform`.

## 0. Before you write

1. Read the module's `build.gradle.kts` and `gradle/libs.versions.toml`: Kotlin version, Compose BOM, whether the `org.jetbrains.kotlin.plugin.compose` compiler plugin is applied (Kotlin 2.0+), and which navigation library is used (`androidx.navigation:navigation-compose` or Navigation 3).
2. Find the project's DI (Hilt, Koin, manual) and how ViewModels are obtained (`hiltViewModel()`, `viewModel()`, `koinViewModel()`). Follow it.
3. Build once (`./gradlew :app:assembleDebug` or the project's task) and run unit tests; record the result.

## 1. State hoisting

- Split each screen into a **stateful** route composable (gets the ViewModel, collects state) and a **stateless** screen composable that takes `state` and event lambdas: `ProfileScreen(state, onNameChange, onSave)`.
- Hoist state to the lowest common owner of everything that reads or writes it. UI-only state (scroll, expanded, focus) can stay in the composable with `remember` / `rememberSaveable`.
- Use `rememberSaveable` for state that must survive configuration change and process death (text input, selected tab).
- Every reusable composable takes `modifier: Modifier = Modifier` as its first optional parameter and applies it to its root, once.
- Never pass a ViewModel or `NavController` down into leaf composables; pass state and lambdas.

## 2. Recomposition and stability

- Since Kotlin 2.0.20 strong skipping is on by default: composables with unstable parameters can still skip, but unstable parameters are compared by instance (`===`), stable ones by `equals`. So a new `List` instance with the same contents still recomposes.
- Make UI state classes immutable `data class`es with `val`s. Use `kotlinx.collections.immutable` (`ImmutableList`) or mark classes `@Immutable` / `@Stable` only when the promise is true.
- Read state as late as possible: pass a lambda (`{ scrollState.value }`) or use lambda-based modifiers (`Modifier.offset { }`, `graphicsLayer { }`) for values that change every frame, so only layout or draw re-runs.
- Use `derivedStateOf` when a frequently changing state produces a rarely changing result (`showButton = listState.firstVisibleItemIndex > 0`). Don't use it for a simple combination of two states.
- `remember(key) { expensive() }` for work inside composition; never sort, filter or format large data directly in a composable body.
- Check with Layout Inspector recomposition counts, and the Compose compiler reports (`composeCompiler { reportsDestination = ... }`) when stability is in doubt.

## 3. Side effects

| Need | API |
|---|---|
| Run suspend work when entering composition or when a key changes | `LaunchedEffect(key)` |
| Register / unregister a listener or observer | `DisposableEffect(key) { ...; onDispose { } }` |
| Use the latest lambda inside a long-running effect without restarting it | `rememberUpdatedState(onTimeout)` |
| Launch coroutines from callbacks (click handlers) | `rememberCoroutineScope()` |
| Turn Compose state into a Flow | `snapshotFlow { state.value }` |
| Publish Compose state to non-Compose code after every successful composition | `SideEffect` |

Rules: keys must be the values that should restart the effect, never `Unit` when the effect reads a changing parameter. One-off events (navigate, snackbar) come from the ViewModel as state or a `Channel`/`Flow` collected in a `LaunchedEffect`, never by calling navigation inside composition.

## 4. ViewModel and lifecycle

- The ViewModel exposes one `StateFlow<UiState>` built with `stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), initial)` or a `MutableStateFlow` it updates.
- Collect it with `collectAsStateWithLifecycle()` (from `androidx.lifecycle:lifecycle-runtime-compose`), not `collectAsState()`, so collection stops when the app is in the background.
- Business logic, network and database work live in the ViewModel and repositories, never in composables.
- Use `SavedStateHandle` for navigation arguments and small state that must survive process death.

## 5. Navigation

- Navigation Compose 2.8+: define routes as `@Serializable` objects and data classes, `composable<Profile> { entry -> entry.toRoute<Profile>() }`, and navigate with `navController.navigate(Profile(id))`. Don't build string routes by hand in new code.
- Navigation 3 (stable since late 2025) keeps the back stack as your own state. Use it only if the project already does or the user chooses it.
- Pass IDs, not objects. Load data in the destination's ViewModel via `SavedStateHandle`.
- Keep the `NavController` / back stack at the top-level `NavHost`; leaf screens receive `onNavigateToX` lambdas.
- Handle system back with `BackHandler` only where you must intercept it (unsaved changes).

## 6. Performance

- Measure in a **release** build (R8 on, not debuggable); debug Compose is much slower.
- `LazyColumn` / `LazyRow`: give items a stable `key = { it.id }` and a `contentType` when rows differ. Never nest a vertically scrolling lazy list inside a `Column` with `verticalScroll`.
- Avoid allocating in item content: hoist `Modifier` chains and formatters, `remember` them.
- Add a Baseline Profile (`androidx.baselineprofile` plugin and a Macrobenchmark module) for startup and scroll paths in production apps.
- Use Macrobenchmark `FrameTimingMetric` to prove a jank fix.

**Stop and ask the user** before switching navigation libraries, raising `minSdk`, or upgrading Kotlin or the Compose BOM as part of an unrelated change.

## Never

- Never launch coroutines, navigate or write to state directly in a composable body.
- Never use `collectAsState()` for ViewModel state on Android when lifecycle-aware collection is available.
- Never annotate a class `@Stable` or `@Immutable` that has mutable public state.
- Never use `Unit` as an effect key when the effect depends on a parameter.

## Report back

End with: composables and ViewModels changed, where each new piece of state lives, Gradle tasks run with results, and whether you checked recomposition or frame timing (and how).
