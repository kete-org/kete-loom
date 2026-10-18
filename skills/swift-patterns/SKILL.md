---
name: swift-patterns
description: Idiomatic Swift 5.x and 6 for writing or restructuring code, covering structs and enums over classes, protocols with associated types and some/any, optional handling without force unwraps, typed and untyped throws, async/await, actors, Sendable and strict concurrency checking, plus Package.swift layout for SwiftPM. Use when writing new Swift code, choosing between a struct, class or actor, adopting async/await, migrating a module to the Swift 6 language mode, or setting up a Swift package.
license: MIT
compatibility: Any Agent Skills host. Needs a Swift 5.9+ toolchain (swift or xcodebuild) to build and check the code. Swift 6.2 features are marked as such.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "swift"
  kete-loom/owner: "Kete-org"
---

# Swift patterns

Write Swift that the compiler can check: value semantics by default, isolation stated explicitly, failure in the type system. This skill is for language-level code. SwiftUI view structure belongs to `swiftui-patterns`; tests belong to `swift-testing`.

## 0. Before you write

1. Find the toolchain and mode: `swift --version`, the `// swift-tools-version:` line in `Package.swift`, or `SWIFT_VERSION` in the Xcode build settings. Tools version 6.0+ defaults to the Swift 6 language mode unless `swiftLanguageModes: [.v5]` (or a target's `.swiftLanguageMode(.v5)`) says otherwise.
2. Check the concurrency settings: `SWIFT_STRICT_CONCURRENCY`, `SWIFT_DEFAULT_ACTOR_ISOLATION` and `SWIFT_APPROACHABLE_CONCURRENCY` in Xcode, or `swiftSettings` in `Package.swift`. Code that compiles in one setting may not in another, so match the project.
3. Read two or three neighbouring files and follow their conventions (naming, error types, logging, file layout).

## 1. Pick the type

| Need | Use |
|---|---|
| Data with no identity, copied freely | `struct` |
| A closed set of states or results | `enum` with associated values |
| Shared mutable state accessed from several tasks | `actor` |
| UI state or anything touching UIKit/AppKit | a `@MainActor` class or the main-actor default |
| Identity, inheritance, or Objective-C interop | `final class` (drop `final` only when you need subclassing) |

- Prefer `let`. Make a stored property `var` only when something mutates it.
- Model impossible states out: `enum LoadState { case idle, loading, loaded(User), failed(Error) }` beats three optionals and a Bool.
- Large value types with copy-on-write storage are fine; don't convert a struct to a class "for performance" without a measurement.

## 2. Protocols and generics

- Write protocols for capabilities your code needs (`protocol UserStore { func user(id: User.ID) async throws -> User }`), not mirrors of one concrete class.
- Use `some Protocol` for parameters and return types when one concrete type flows through. Use `any Protocol` only when you need heterogeneous storage or runtime swapping; it costs an existential box.
- Protocols with `associatedtype` work with `some`, generics and primary associated types (`some Collection<Int>`). Reach for a hand-written type eraser only when `any P<T>` cannot express it.
- Put shared behaviour in protocol extensions, but remember extension-only methods are statically dispatched: a conforming type cannot override them unless the method is also a requirement.

## 3. Optionals

- Unwrap with `guard let x else { return }` (Swift 5.7 shorthand), `if let`, `??` with a real default, or optional chaining.
- Never write `!` on a value that comes from input, the network, a dictionary lookup, `first`, a cast or a file. Force unwrap only an invariant visible on the same line, such as `URL(string: "https://example.com")!` on a string literal.
- No implicitly unwrapped optionals (`var x: T!`) outside `@IBOutlet` and two-phase init you cannot restructure.
- `try?` throws the error away. Use it only when "no value" is genuinely the same outcome as "failed".

## 4. Errors

- Throw a domain `enum` conforming to `Error` (and `LocalizedError` if users see it). Include the associated data a caller needs to react.
- Swift 6 typed throws (`func parse() throws(ParseError)`) suit closed, internal error sets and embedded code. For public APIs that will grow new failures, keep plain `throws`.
- Catch where you can do something: retry, map to a user message, or fall back. Otherwise let it propagate. An empty `catch {}` is a bug.
- Use `Result` for stored or callback-delivered outcomes; for async code, `async throws` replaces it.
- `fatalError`, `precondition` and `!` crash release builds. Reserve them for programmer errors, never for bad input.

## 5. Concurrency

1. Make functions `async` instead of taking completion handlers. Wrap a legacy callback API once with `withCheckedThrowingContinuation` and resume exactly once on every path.
2. Use structured concurrency first: `async let` for a fixed number of child tasks, `withThrowingTaskGroup` for a dynamic number. They cancel children and propagate errors.
3. Use `Task { }` only at the boundary where sync code starts async work (a button action, `viewDidLoad`). Keep the handle if the work must be cancelled. `Task.detached` is almost never right; it drops priority, task-locals and actor context.
4. Protect shared mutable state with an `actor`. Remember actor reentrancy: state can change across every `await` inside an actor method, so re-check invariants after each suspension.
5. Mark UI-facing types `@MainActor`. Don't sprinkle `DispatchQueue.main.async` in new async code.
6. Check `Task.isCancelled` or call `try Task.checkCancellation()` in long loops.
7. In Swift 6.2 with `NonisolatedNonsendingByDefault`, a `nonisolated async` function runs on the caller's actor. Mark CPU-heavy work `@concurrent` to move it off the caller.

### Sendable rules

- A type crossing an isolation boundary must be `Sendable`. Structs and enums whose stored properties are all `Sendable` get it implicitly when not public; state it explicitly on public types.
- A class is `Sendable` only if it is `final` with immutable `let` stored properties of `Sendable` types, or it is actor-isolated.
- `@unchecked Sendable` is a promise you protect the state yourself (for example with a `Mutex` from the `Synchronization` module, Swift 6 and macOS 15 / iOS 18 or later, or a lock such as `OSAllocatedUnfairLock` or `NSLock`). Write the reason in a comment next to it.
- `nonisolated(unsafe)` and `@preconcurrency import` are migration tools. Each use needs a comment saying why and when it goes away.

For migrating a module to complete checking or the Swift 6 mode, read `references/concurrency-migration.md`.

## 6. SwiftPM

- One `Package.swift` with explicit `products`, `targets` and `dependencies`. Pin remote packages with `from:` (semver) and commit `Package.resolved` for apps and executables. A library's `Package.resolved` is ignored by packages that depend on it, so its version ranges must be correct on their own.
- Keep the core logic in a library target with no UIKit/SwiftUI imports so it builds and tests on any platform with `swift build` and `swift test`.
- Put per-target flags in `swiftSettings`, for example:

```swift
.target(
    name: "Core",
    swiftSettings: [
        .enableUpcomingFeature("ExistentialAny"),
        // Swift 5 mode only; Swift 6 mode already enforces complete checking.
        .enableUpcomingFeature("StrictConcurrency"),
    ]
)
```

- Use `package` access (Swift 5.9+) for symbols shared between targets of one package, and access levels on imports (`internal import Foo`, Swift 6) to stop a dependency leaking into your public API.

## 7. Check your work

1. Build with the project's command (`swift build`, or `xcodebuild -scheme <Scheme> build`). Zero new warnings, not just zero errors.
2. If the project is still in Swift 5 mode, also build once with `swift build -Xswiftc -strict-concurrency=complete` and report new concurrency warnings rather than hiding them.
3. Run the tests (`swift test` or `xcodebuild test`).

## Never

- Never silence a concurrency diagnostic with `@unchecked Sendable`, `nonisolated(unsafe)` or `@preconcurrency` without the comment described above. If the honest fix is a redesign, **stop and ask the user**.
- Never lower the language mode or strict-concurrency level to make code compile without telling the user.
- Never block a thread waiting on async work (semaphores, `DispatchGroup.wait`) inside an async context; it can deadlock the cooperative pool.
- Never capture `self` strongly in a long-lived escaping closure stored on `self` (timers, observers, stored callbacks). Use `[weak self]` there.

## Report back

End with: the files changed, the build and test commands you ran with their result, any new `@unchecked Sendable`, `nonisolated(unsafe)` or force unwraps you added and why, and anything you left for the user to decide.
