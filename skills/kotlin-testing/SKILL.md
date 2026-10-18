---
name: kotlin-testing
description: Writes and repairs Kotlin tests on JUnit 5 or Kotest, with MockK for coroutine-aware mocks, kotlinx-coroutines-test for runTest, virtual time and Dispatchers.setMain, and Turbine for asserting Flow and StateFlow emissions, plus a checklist for making flaky coroutine tests deterministic. Use when adding unit tests to Kotlin or Android code, testing suspend functions or ViewModels, asserting what a Flow emits, mocking with every and coEvery, or a Kotlin test passes locally but fails or hangs intermittently in CI.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK and the project's Gradle wrapper (or Maven) to run tests.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Kotlin testing

Tests that run in milliseconds, never touch real time or the network, and fail for one reason.

## 0. Find the setup

1. Search the build files for the framework already in use: `junit-jupiter` (JUnit 5), `kotest-runner-junit5` (Kotest), `junit:junit` (JUnit 4, common in Android). Use what is there. Do not add a second framework.
2. Check for `mockk`, `kotlinx-coroutines-test` and `app.cash.turbine:turbine`. If a test needs one that is missing, stop and ask the user before adding it, then add it as a `testImplementation` dependency (through `gradle/libs.versions.toml` if the project uses a version catalog).
3. JUnit 5 on Gradle needs `tasks.test { useJUnitPlatform() }` (Kotest runs on the same platform). If tests are silently not running, check this first.
4. Find the test command: `./gradlew test`, or for Android `./gradlew :module:testDebugUnitTest`. Run one class with `--tests "com.example.FooTest"`.

## 1. Test shape

- One behaviour per test. Name it for the behaviour: JUnit 5 backtick names (`` fun `returns cached user when offline`() ``) or Kotest `test("...")`.
- Arrange, act, assert, with a blank line between. Build inputs with small factory functions with defaults, not shared mutable fixtures.
- Assert on values, not on calls, wherever you can. Use `assertEquals` (kotlin.test or JUnit) or Kotest matchers (`shouldBe`, `shouldThrow<T> { }`).
- Prefer a hand-written fake (an in-memory implementation of the interface) over a mock for repositories and data sources. Mock only what you cannot fake cheaply.

## 2. MockK

```kotlin
val api = mockk<UserApi>()
coEvery { api.fetch("42") } returns User("42", "Ama")   // suspend function
every { clock.now() } returns Instant.parse("2026-01-01T00:00:00Z")

// act ...

coVerify(exactly = 1) { api.fetch("42") }
confirmVerified(api)
```

- `every`/`verify` for regular functions, `coEvery`/`coVerify` for suspend functions. Mixing them up is the most common MockK error.
- Use strict mocks by default; `mockk(relaxed = true)` hides missing stubs. Use `relaxUnitFun = true` when you only want `Unit` functions relaxed.
- Capture arguments with `val slot = slot<Request>()` and `coEvery { api.send(capture(slot)) }`.
- `mockkObject`, `mockkStatic` and `mockkConstructor` change global state: call `unmockkAll()` in teardown, or avoid them by injecting the dependency.
- Never mock the class under test or data classes.

## 3. Coroutines: runTest

```kotlin
@Test
fun `loads user`() = runTest {
    val repo = UserRepository(api, ioDispatcher = StandardTestDispatcher(testScheduler))
    val user = repo.load("42")
    assertEquals("Ama", user.name)
}
```

- Wrap every test that calls suspend code in `runTest`. It skips `delay` with virtual time, so a 30-second timeout test finishes instantly.
- Inject dispatchers into production code. In tests, pass a `StandardTestDispatcher(testScheduler)` (or `UnconfinedTestDispatcher(testScheduler)` when you want eager execution) so all coroutines share one scheduler. A hard-coded `Dispatchers.IO` escapes virtual time and makes tests flaky.
- Code that uses `Dispatchers.Main` (ViewModels): call `Dispatchers.setMain(testDispatcher)` before each test and `Dispatchers.resetMain()` after. Put it in a JUnit 5 extension or a JUnit 4 rule the project can reuse.
- Control time with `advanceUntilIdle()`, `advanceTimeBy(ms)` and `runCurrent()`. Read virtual time with `currentTime`.
- Launch long-running collectors in `backgroundScope` so `runTest` cancels them at the end instead of waiting for them until its timeout fails the test.
- Never use `runBlocking` or `Thread.sleep` in tests of coroutine code.

## 4. Flow: Turbine

```kotlin
@Test
fun `emits loading then loaded`() = runTest {
    viewModel.state.test {
        assertEquals(UiState.Loading, awaitItem())
        assertEquals(UiState.Loaded(user), awaitItem())
        cancelAndIgnoreRemainingEvents()
    }
}
```

- `test { }` fails if events are left unconsumed. Finish with `awaitComplete()`, `awaitError()` or `cancelAndIgnoreRemainingEvents()`.
- `StateFlow` conflates and replays its current value: the first `awaitItem()` is the current state, and fast successive updates can merge. Assert the final state with `expectMostRecentItem()` when intermediate states do not matter.
- Several flows at once: `turbineScope { val a = flowA.testIn(backgroundScope); ... }`, and end each with `cancel()`, `awaitComplete()` or `awaitError()`.
- Turbine's wait timeout is wall-clock (default 3 seconds), not virtual time. A timeout usually means the code under test never emitted because its dispatcher was not advanced.
- Without Turbine, collect a finite flow with `flow.toList()` or `flow.take(n).toList()`.

## 5. Kotest specifics

- Pick one spec style per project (`FunSpec`, `StringSpec`, `BehaviorSpec`) and match it.
- Kotest test bodies are already suspend functions; you can call suspend code directly. Use `runTest` only when you need virtual time, or the project's coroutine test extension.
- Use `beforeTest`/`afterTest` for setup and `isolationMode` deliberately: the default shares one spec instance across tests.

## 6. Fixing flaky tests

Work through this list in order, and run the test 20 times after each change (`./gradlew test --tests "X" --rerun-tasks` in a loop, or a repeated-test annotation) to prove it:

1. Real dispatcher in production code (`Dispatchers.IO`/`Default` hard-coded): inject it and pass the test dispatcher.
2. Multiple `TestCoroutineScheduler`s: every test dispatcher must share `testScheduler`.
3. Missing `Dispatchers.setMain` or a missing `resetMain` leaking between tests.
4. Real time: `System.currentTimeMillis()`, `Instant.now()`, `Thread.sleep`. Inject a clock.
5. Shared state: companion objects, singletons, `mockkObject` without `unmockkAll`, test order dependence.
6. StateFlow conflation making an intermediate `awaitItem()` miss a value.
7. Real network, filesystem or database. Replace with a fake or a temp directory.

Never "fix" a flaky test by adding `delay`, retries or a longer timeout.

## Rules

- Never delete, `@Disabled` or weaken an existing test to make the suite pass without the user's agreement.
- No real network calls, no real clock, no sleeps.
- Run the single test, then the whole module's tests, before you finish.

## Report back

Tests added or fixed (class and test names), the exact command you ran, the pass/fail counts, and for a flaky test the root cause from section 6 and how many repeated runs passed.

For writing the production code itself, use the `kotlin-patterns` skill. For a test-first loop in any language, `tdd-workflow`.
