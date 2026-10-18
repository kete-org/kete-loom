---
name: dart-patterns
description: Writes and refactors idiomatic Dart 3 code that keeps sound null safety intact, models data with records, pattern matching and sealed class hierarchies, handles async/await, Streams and isolates without leaks or dropped futures, and manages pub dependencies and analysis_options.yaml lint sets. Use when writing or restructuring plain Dart (CLI, server, package or the non-widget layers of a Flutter app), replacing nullable soup or enum switches with sealed types and patterns, or tightening analyzer rules for a Dart codebase.
license: MIT
compatibility: Any Agent Skills host. Needs the Dart SDK 3.0 or newer (or Flutter, which bundles it) to run dart analyze and dart test.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "dart"
  kete-loom/owner: "Kete-org"
---

# Dart patterns

Write Dart that the analyzer can prove correct: no null escapes, exhaustive switches, every future accounted for. Widget composition and Flutter state management belong to `flutter-patterns`; this skill covers the language, async model, packages and lints underneath.

## 0. Before you write

1. Read `pubspec.yaml`: the `environment: sdk:` lower bound decides which language features you may use (records, patterns, sealed and class modifiers need `>=3.0.0`; extension types need 3.3). Don't raise the SDK bound without asking the user.
2. Read `analysis_options.yaml` and follow the lint set already in force.
3. Run `dart analyze` (or `flutter analyze`) first so you know which warnings were already there.

## 1. Null safety

- Make a type nullable only when absence is a real state. Prefer a non-null default or a required parameter.
- Promote instead of asserting: `if (x == null) return;` then use `x`. Fields don't promote unless they are private and final (Dart 3.2+); copy to a local first: `final user = _user; if (user != null) ...`.
- Use `??`, `?.`, `??=` and `if (value case final v?)` for optional values.
- `!` is allowed only where an invariant the analyzer can't see is guaranteed and documented on the line above. Never use `!` to silence an error.
- `late` is a promise checked at runtime. Use it only for fields set in `initState`/constructor bodies or lazy computed values (`late final x = compute();`). An unset `late` throws `LateInitializationError`.
- Never call `.cast<T>()` or `as T` on decoded JSON without validating it; parse with patterns instead (section 2).

## 2. Records and patterns

- Return several values with a record instead of a throwaway class: `(int count, String label) summarize()` or named `({int count, String label})`.
- Destructure at the call site: `final (count, label) = summarize();`.
- Validate untyped data with a map pattern, which checks type and shape in one step:

```dart
User parseUser(Object? json) {
  if (json case {'id': int id, 'name': String name, 'email': String? email}) {
    return User(id: id, name: name, email: email);
  }
  throw FormatException('Invalid user JSON: $json');
}
```

- A map pattern fails if a key is missing, even when its value pattern is nullable (`String? email` above needs `'email'` present). For optional keys, read `json['email']` separately after the match.
- Use switch expressions for value mapping, with guards (`when`) for conditions. Prefer them to `if/else` ladders.
- Wildcard `_` matches anything; don't add a `_` case to a switch over a sealed type or enum, because it hides new cases from the exhaustiveness check.

## 3. Sealed classes and class modifiers

Model closed sets of states with `sealed`; the compiler then forces every `switch` to handle each subtype.

```dart
sealed class LoadState<T> {}
final class Loading<T> extends LoadState<T> {}
final class Loaded<T> extends LoadState<T> { Loaded(this.value); final T value; }
final class Failed<T> extends LoadState<T> { Failed(this.error); final Object error; }

String describe(LoadState<String> s) => switch (s) {
  Loading() => 'loading',
  Loaded(:final value) => 'got $value',
  Failed(:final error) => 'failed: $error',
};
```

- Subtypes of a sealed class must live in the same library (file or `part`s).
- Pick modifiers deliberately in public packages: `final` (no subclassing or implementing outside the library), `interface` (implement only), `base` (extend only), `mixin class`. Adding a modifier to a published type is a breaking change.
- Prefer immutable value types: `final` fields, `const` constructors, and `==`/`hashCode` (or a code generator such as `freezed` if the project already uses one; don't introduce one unasked).

## 4. Async and Futures

- Every `Future` is awaited, returned, or explicitly handed off with `unawaited(...)` from `dart:async` with a comment saying why. A dropped future swallows its error.
- Mark functions `async` only when they await. Return `Future<void>`, never `void`, from async functions (except overrides that require `void`).
- Run independent work concurrently: `final (a, b) = await (fetchA(), fetchB()).wait;` or `Future.wait([...])`.
- Add timeouts at I/O boundaries: `await request.timeout(const Duration(seconds: 10))`, and handle `TimeoutException`.
- In Flutter code, after any `await` inside a `State`, check `if (!mounted) return;` (or `context.mounted`) before touching `context` or calling `setState`.

## 5. Streams

- Know the kind: single-subscription streams (most I/O) allow one listener; use `asBroadcastStream()` or a `StreamController.broadcast()` only when several listeners are really needed.
- Every `listen` returns a `StreamSubscription`; store it and `cancel()` it in the owner's `dispose`/`close`. Prefer `await for` when the consumer is a single async function, because it cancels on `break` or exception automatically.
- Every `StreamController` you create is closed by its owner (`await controller.close()`), and `add` is never called after close (check `isClosed`).
- Pass `onError` to `listen` or the error goes to the zone and can crash the app.
- Use `async*` with `yield` for generated streams instead of hand-managed controllers.

## 6. Isolates

- Move CPU-heavy work (large JSON decode, image processing, crypto) off the main isolate with `await Isolate.run(() => heavy(input))` (Flutter's `compute` is equivalent).
- Messages are copied; pass plain data, not objects holding sockets, open files or closures over large state.
- For long-lived workers use `Isolate.spawn` with `SendPort`/`ReceivePort`, and close the ports when done.
- Don't use isolates for I/O-bound work; async already handles it.

## 7. Errors

- Throw `Exception` subtypes for recoverable conditions callers should handle; `Error` subtypes (`ArgumentError`, `StateError`, `UnsupportedError`) signal programmer bugs and should not be caught in normal flow.
- Catch narrowly: `on FormatException catch (e, st)`. A bare `catch (e)` is allowed only at a top-level boundary that logs and reports.
- Keep the stack trace: `rethrow`, or `Error.throwWithStackTrace(MyException(...), st)` when wrapping.
- For expected failures in domain code, a sealed `Result` type (section 3) is often clearer than exceptions. Follow what the codebase already does.

## 8. Packages (pub)

- Add dependencies with `dart pub add <pkg>` (`dev:<pkg>` for dev dependencies) so constraints are written correctly; use caret constraints (`^1.4.0`).
- Inspect before upgrading: `dart pub outdated`, `dart pub deps`. Major upgrades (`dart pub upgrade --major-versions`) need the user's agreement.
- Commit `pubspec.lock` for applications; don't commit it for regular (reusable) packages.
- `dependency_overrides` is a temporary diagnostic tool, never a permanent fix. Stop and ask before leaving one in.
- Code generation: `dart run build_runner build` (or `watch`). Commit or ignore generated `*.g.dart` files the way the project already does.

## 9. Lints and analysis

Start from the official sets (`lints` for Dart, `flutter_lints` for Flutter, added as dev dependencies) and add rules that catch real bugs. On an existing codebase add one rule at a time and run `dart analyze` after each.

```yaml
include: package:lints/recommended.yaml   # Flutter apps: package:flutter_lints/flutter.yaml
analyzer:
  language:
    strict-casts: true        # no implicit downcasts from dynamic
    strict-inference: true    # no silently inferred dynamic
    strict-raw-types: true    # no List without a type argument
  exclude:
    - "**/*.g.dart"
linter:
  rules:
    - unawaited_futures
    - discarded_futures
    - cancel_subscriptions
    - close_sinks
    - avoid_dynamic_calls
    - only_throw_errors
```

| Rule | Catches |
|---|---|
| `unawaited_futures` | a `Future` in an `async` function neither awaited nor wrapped in `unawaited(...)` |
| `discarded_futures` | a `Future`-returning call dropped inside a synchronous function |
| `cancel_subscriptions` / `close_sinks` | a `StreamSubscription` never cancelled / a `StreamController` or sink never closed |
| `avoid_dynamic_calls` | method calls on `dynamic`, which skip type checking |
| `only_throw_errors` | throwing strings or other non-`Exception`/`Error` objects |

The strict language modes can produce hundreds of errors in a large codebase; ask the user before enabling them beyond new code.

- Fix warnings rather than suppressing them. An `// ignore: rule_name` needs a reason on the same line, and `// ignore_for_file` needs the user's agreement.
- `dart fix --dry-run` then `dart fix --apply` handles many lint fixes mechanically; review the diff.
- Format with `dart format .`; don't hand-format against it.

## Never do

- Use `dynamic` to get past a type error, or `as` casts on unvalidated data.
- Add `!` or `late` to silence the analyzer.
- Leave a `StreamSubscription`, `StreamController`, `Timer` or `ReceivePort` without a cancel/close path.
- Raise the SDK constraint, add a code generator or change the lint set without asking.

## Finish

Run `dart format --output=none --set-exit-if-changed .`, `dart analyze` (or `flutter analyze`) and the test command. Report: files changed, the commands run with results, and any new warnings you could not fix with the reason.
