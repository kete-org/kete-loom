# Swift Testing cheatsheet

## XCTest to Swift Testing

| XCTest | Swift Testing |
|---|---|
| `class FooTests: XCTestCase` | `@Suite struct FooTests` (the `@Suite` attribute is optional) |
| `func testBar()` | `@Test func bar()` |
| `setUp()` / `tearDown()` | `init()` / `deinit` (class or actor suite) |
| `XCTAssertEqual(a, b)` | `#expect(a == b)` |
| `XCTAssertTrue(x)` / `XCTAssertFalse(x)` | `#expect(x)` / `#expect(!x)` |
| `XCTAssertNil(x)` | `#expect(x == nil)` |
| `let y = try XCTUnwrap(x)` | `let y = try #require(x)` |
| `XCTAssertThrowsError(try f())` | `#expect(throws: (any Error).self) { try f() }` |
| `XCTAssertThrowsError` with a specific error | `#expect(throws: MyError.notFound) { try f() }` (error must be `Equatable`) |
| `XCTAssertNoThrow(try f())` | `#expect(throws: Never.self) { try f() }` |
| `XCTFail("msg")` | `Issue.record("msg")` |
| `XCTSkip` | `.enabled(if:)` / `.disabled(_:)` trait |
| `XCTExpectFailure` | `withKnownIssue { }` |
| `XCTestExpectation` + `fulfillment(of:)` | `await confirmation { confirm in ... }` (the event must happen before the closure returns) |

Keep these in XCTest: `XCUIApplication` UI tests, `measure { }` performance tests, and anything that needs `XCTestCase` subclass hooks.

## Examples

Parameterized over two collections, paired rather than a cartesian product:

```swift
@Test(arguments: zip(["1", "42", "-7"], [1, 42, -7]))
func parsesIntegers(input: String, expected: Int) throws {
    #expect(try Parser.int(input) == expected)
}
```

Counting events:

```swift
@Test func notifiesOncePerSave() async throws {
    let store = DocumentStore()
    try await confirmation(expectedCount: 2) { saved in
        store.onSave = { _ in saved() }
        try await store.save("a")
        try await store.save("b")
    }
}
```

Tags for filtering:

```swift
extension Tag { @Tag static var integration: Self }

@Test(.tags(.integration)) func syncsWithServer() async throws { ... }
```

Run a subset: `swift test --filter <regex>` matches suite and test names. Swift Testing and XCTest tests in one package both run under `swift test`.

## Main-actor tests

```swift
@MainActor @Suite struct ProfileViewModelTests {
    @Test func loadsProfile() async throws {
        let model = ProfileViewModel(store: FakeUserStore(.success(.fixture)))
        await model.load()
        #expect(model.state == .loaded(.fixture))
    }
}
```

## Async XCTest

```swift
final class LegacyTests: XCTestCase {
    func testDelegateCalled() async {
        let exp = expectation(description: "delegate")
        let sut = Uploader(onFinish: { exp.fulfill() })
        sut.start()
        await fulfillment(of: [exp], timeout: 2)
    }
}
```
