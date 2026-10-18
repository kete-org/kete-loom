# Migrating a module to complete concurrency checking

Move one target at a time, leaf modules first. Each step should build cleanly before the next.

## Steps

1. **Measure.** Build once with complete checking and count the diagnostics:
   - SwiftPM: `swift build -Xswiftc -strict-concurrency=complete 2>&1 | grep -c "warning:"`
   - Xcode: set `SWIFT_STRICT_CONCURRENCY = complete` for the target, build, read the Issue navigator.
2. **Turn it on per target in Swift 5 mode** so diagnostics are warnings, not errors:
   - SwiftPM: `swiftSettings: [.enableUpcomingFeature("StrictConcurrency")]` (on 5.9 toolchains use `.enableExperimentalFeature("StrictConcurrency")`).
   - Xcode: `SWIFT_STRICT_CONCURRENCY = complete`.
3. **Fix in this order**, because each step removes many downstream warnings:
   1. Isolate UI code: add `@MainActor` to view controllers, view models and delegates that touch UIKit/AppKit.
   2. Make plain data types `Sendable` (usually just adding the conformance to structs and enums).
   3. Turn classes that guard state with a queue or lock into actors, or keep the lock and mark them `@unchecked Sendable` with a comment.
   4. Replace global and static `var`s: make them `let`, isolate them to `@MainActor`, or move them into an actor.
   5. Handle third-party modules that are not yet annotated with `@preconcurrency import Module`, and note it for removal.
4. **Switch the language mode** once the target has no concurrency warnings:
   - SwiftPM: `// swift-tools-version:6.0` (or later) and drop any `.swiftLanguageMode(.v5)` on that target.
   - Xcode: `SWIFT_VERSION = 6.0`.
5. Run the full test suite. Data-race fixes can change ordering; flaky tests after migration usually point at a real race.

## Common diagnostics and the usual fix

| Diagnostic (paraphrased) | Usual fix |
|---|---|
| Static property is not concurrency-safe because it is nonisolated global shared mutable state | Make it `let` of a `Sendable` type, or isolate it with `@MainActor` |
| Sending value of non-Sendable type risks causing data races | Make the type `Sendable`, or stop sending it across the boundary (create it inside the task) |
| Capture of non-Sendable type in a `@Sendable` closure | Capture a `Sendable` copy (a value or an ID) instead of the object |
| Call to main actor-isolated method in a synchronous nonisolated context | Mark the caller `@MainActor`, or make it `async` and `await` the call |
| Main actor-isolated property cannot be used to satisfy nonisolated protocol requirement | Isolate the conformance (`extension V: @MainActor P`, Swift 6.2) or make the member `nonisolated` if it touches no isolated state |
| Passing closure as a 'sending' parameter risks causing data races | Avoid capturing mutable non-Sendable state; copy what the closure needs first |

## Swift 6.2 options

- `.defaultIsolation(MainActor.self)` in a target's `swiftSettings` (Xcode: `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor`) makes unannotated code main-actor isolated. Good for app targets; usually wrong for libraries and networking or model packages. Mark background-safe types `nonisolated`.
- `.enableUpcomingFeature("NonisolatedNonsendingByDefault")` makes `nonisolated async` functions run on the caller's actor. Use `@concurrent` for work that must leave it.
- `.enableUpcomingFeature("InferIsolatedConformances")` lets a main-actor type's protocol conformance be inferred as main-actor isolated.
- Xcode's `SWIFT_APPROACHABLE_CONCURRENCY = YES` turns on a bundle of these upcoming features. New Xcode 26 app templates may enable it and main-actor default isolation; SwiftPM packages do not, so the same code can behave differently in an app target and a package. Check each target.
