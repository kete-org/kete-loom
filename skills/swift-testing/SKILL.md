---
name: swift-testing
description: Writes and fixes Swift unit, async and UI tests using Apple's Swift Testing framework (@Test, @Suite, #expect, #require, parameterized arguments, confirmation) alongside XCTest, with protocol-based fakes injected through initializers instead of mocking frameworks, and XCUITest basics for UI flows. Use when adding tests to a Swift package or Xcode project, testing async or actor code, replacing a live network or database dependency with a fake, converting XCTestCase classes to Swift Testing, or fixing a flaky Swift test.
license: MIT
compatibility: Any Agent Skills host. Swift Testing needs a Swift 6 toolchain or Xcode 16+; XCTest works with any Xcode. UI tests need Xcode and a simulator on macOS.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "swift"
  kete-loom/owner: "Kete-org"
---

# Swift testing

Write Swift tests that are fast, deterministic and run in parallel. Use Swift Testing for new unit and integration tests, XCTest where the project or the feature requires it (UI tests, performance tests, older toolchains).

## 0. Before you start

1. Find how tests run here: `swift test` for a package, or `xcodebuild test -scheme <Scheme> -destination '<destination>'` for an Xcode project (`xcodebuild -list` shows schemes; `xcrun simctl list devices available` shows simulators). Check CI config for the exact command.
2. Run the existing suite once and record the result. If it already fails, **stop and tell the user** before changing anything.
3. Check which framework the target already uses (`import Testing` or `import XCTest`). Both can live in one test target; don't convert existing XCTest files unless asked.

## 1. Choose the framework

| Test | Use |
|---|---|
| New unit or integration test, Swift 6 toolchain | Swift Testing |
| UI automation (`XCUIApplication`) | XCTest only |
| Performance (`measure { }`, `XCTMetric`) | XCTest only |
| Toolchain older than Swift 6 / Xcode 16 | XCTest |
| Existing XCTest file you are extending | Match the file |

## 2. Swift Testing essentials

```swift
import Testing
@testable import Core

@Suite struct PriceCalculatorTests {
    let calculator = PriceCalculator(taxRate: 0.15)   // fresh instance per test

    @Test func addsTax() {
        #expect(calculator.total(for: 100) == 115)
    }

    @Test(arguments: [0, -1, .max])
    func rejectsInvalidAmounts(_ amount: Int) {
        #expect(throws: PriceError.self) { try calculator.validate(amount) }
    }

    @Test func parsesFirstLine() throws {
        let line = try #require(calculator.lines.first)   // stops the test if nil
        #expect(line.amount > 0)
    }
}
```

- `#expect` records a failure and continues; `#require` throws and stops. Use `#require` to unwrap optionals instead of `!`.
- Each `@Test` gets a new suite instance, so `init` replaces `setUp` and `deinit` (in a class or actor suite) replaces `tearDown`.
- Prefer `@Test(arguments:)` over loops: each argument is reported and re-runnable on its own. Arguments must be `Sendable`.
- Tests run in parallel by default. Add `.serialized` to a suite only when tests share an external resource you cannot isolate, and say why.
- Use traits instead of comments: `.disabled("reason")`, `.enabled(if: ...)`, `.bug("url")`, `.tags(.networking)`, `.timeLimit(.minutes(1))`. For a known bug, wrap the failing check in `withKnownIssue { }` rather than deleting it.

For an XCTest-to-Swift-Testing mapping table and more examples, read `references/swift-testing-cheatsheet.md`.

## 3. Async and actor code

1. Mark the test `async throws` and `await` the call directly. Never sleep to wait for work.
2. For callbacks or delegate events, use `await confirmation(expectedCount: n) { confirm in ... }` in Swift Testing, or `XCTestExpectation` plus `await fulfillment(of: [exp], timeout: 2)` in async XCTest (not `wait(for:)`, which blocks).
3. For code isolated to the main actor, mark the test or suite `@MainActor`.
4. Control time: inject a clock (`any Clock<Duration>`) or a `now: () -> Date` closure instead of reading `Date()` or calling `Task.sleep` directly in production code.
5. Test cancellation explicitly when the code promises to honour it: start a `Task`, cancel it, assert the `CancellationError` or the cleanup.

## 4. Fakes through protocols

1. Find the dependency that makes the test slow or non-deterministic: network, database, file system, clock, randomness, keychain.
2. Define a small protocol for what the code under test needs, if one does not exist.
3. Inject it through the initializer with the live type as default only if the codebase already does that.
4. Write a fake in the test target: a struct or actor that returns canned values and records calls.

```swift
protocol UserStore: Sendable { func user(id: String) async throws -> User }

actor FakeUserStore: UserStore {
    var result: Result<User, Error>
    private(set) var requestedIDs: [String] = []
    init(_ result: Result<User, Error>) { self.result = result }
    func user(id: String) async throws -> User {
        requestedIDs.append(id)
        return try result.get()
    }
}
```

- Fake only boundaries. Never fake the type under test, and don't fake value types; construct real ones.
- For `URLSession`, prefer injecting a protocol over subclassing; a custom `URLProtocol` registered on a `URLSessionConfiguration` is the fallback when you must test real request building.

## 5. UI test basics (XCTest)

1. Give elements stable `accessibilityIdentifier`s in the app; query by identifier, not by label text.
2. Launch with test configuration: `app.launchArguments += ["-ui-testing"]` and `app.launchEnvironment["API_BASE_URL"] = ...`, and have the app swap in fakes when it sees them.
3. Wait with `element.waitForExistence(timeout: 5)`; never `sleep`.
4. Keep UI tests to a few critical journeys. Logic belongs in unit tests.

## 6. Run and check

1. Run the single test first: `swift test --filter PriceCalculatorTests/addsTax` or `xcodebuild test -only-testing:<Target>/<Suite>/<test>`.
2. Then the whole target. Then the full suite.
3. For a flaky test, run it repeatedly (`swift test --filter <name>` in a loop, or Xcode's run-repeatedly option) and fix the cause (shared state, real time, ordering) rather than adding retries.

## Never

- Never delete, skip or weaken an existing assertion to get green. If a test is wrong, explain why and get the user's agreement.
- Never hit the real network, real keychain or a shared simulator state in unit tests.
- Never use `sleep`, `Task.sleep` or fixed delays to wait for asynchronous results.
- Never add `.serialized` or disable parallel testing to hide a data race.

## Report back

End with: tests added or changed (names), the exact command you ran, pass/fail counts, any fakes or protocols you introduced, and anything left untested.
