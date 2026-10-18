---
name: dart
description: Always-on rules for Dart and Flutter code, covering null safety, async, widget lifecycle, analysis, formatting and tests.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.dart"
  kete-loom/owner: "Kete-org"
---

- Run `dart analyze` (or `flutter analyze`) and fix every issue you introduce. Respect the project's `analysis_options.yaml`; never add `// ignore:` to silence a real problem.
- Format with `dart format`. Do not hand-format against it.
- Make a type nullable only when absence is a real state. Promote with a null check or a local copy; use `!` only for an invariant the analyzer cannot see, never to silence an error.
- Use `late` only when the value is always set before first read; reading it earlier throws at runtime.
- Never `as`-cast decoded JSON blindly; check shape and types (patterns or explicit checks) before use.
- Await every `Future` or mark intentional fire-and-forget with `unawaited(...)`. Unawaited errors escape every `try`.
- Catch specific types with `on`, and use `rethrow` (not `throw e`) to keep the stack trace.
- Don't add a `_` default to a switch over a sealed type or enum; it hides new cases from the exhaustiveness check.
- In Flutter, check `mounted` (or `context.mounted`) after any `await` before using `BuildContext` or calling `setState`.
- In `dispose()`, dispose every controller and `FocusNode` you create and cancel every `StreamSubscription` and `Timer`.
- Never do I/O or heavy work in `build()`; it must be fast and side-effect free.
- Use the project's state management and routing approach; do not introduce a new one.
- Give list items in reorderable or stateful lists a stable `Key`.
- Never ship secrets in an app, in source or via `--dart-define`; anything in the binary is readable.
- Add or update tests with `package:test` or `flutter_test` for changed logic; run `dart test` or `flutter test`.

For more, load the dart-patterns, dart-testing and flutter-patterns skills.
