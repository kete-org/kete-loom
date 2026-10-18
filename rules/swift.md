---
name: swift
description: Always-on rules for Swift code, covering optionals, value types, error handling, Swift concurrency and actors, memory and retain cycles, and build and test checks.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.swift"
  kete-loom/owner: "Kete-org"
---

- Never use `!`, `try!` or `as!` on values that can fail at runtime; use `guard let`, `if let`, `??`, `as?` or a thrown error.
- Avoid implicitly unwrapped optionals except for values a framework sets before first use, such as outlets.
- Prefer `let` over `var`, and `struct` or `enum` for data; use `class` when you need identity or shared mutable state.
- Switch over enums exhaustively; avoid `default` on enums you own so a new case is a compile error, and use `@unknown default` for non-frozen SDK enums.
- Throw specific, meaningful errors and handle them with `do`/`catch`; never discard them with `try?` where the failure matters.
- Use `async`/`await` and structured concurrency (`async let`, task groups) over completion handlers in new code.
- Protect shared mutable state with an `actor` or `@MainActor`; never mutate it from several tasks unguarded.
- Update UI only on the main actor.
- Make types that cross concurrency domains `Sendable`, and fix concurrency warnings; use `@unchecked Sendable` or `nonisolated(unsafe)` only when you add the synchronization yourself and say why in a comment.
- Check `Task.isCancelled` or call `try Task.checkCancellation()` in long-running work.
- Capture `self` weakly (`[weak self]`) in escaping closures stored by `self` or its children, to avoid retain cycles.
- Mark delegate properties `weak`.
- Never store secrets in `UserDefaults` or plain files; use the Keychain.
- Build and test with the project's configured tooling (`swift build` and `swift test` for packages, or the Xcode scheme), and use its configured formatter or linter.

For more, load the swift-patterns and swift-testing skills.
