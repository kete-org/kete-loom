---
name: flutter-patterns
description: Flutter app architecture from the widget tree up, covering small const widgets and composition over inheritance, choosing between Riverpod, Bloc and Provider for state, declarative routing with go_router or Navigator, FutureBuilder and StreamBuilder async UI with loading and error states, rebuild and jank performance, and Dart-to-native platform channels or Pigeon. Use when building or restructuring Flutter screens and widgets, picking or applying a state management approach, wiring navigation and deep links, chasing dropped frames, or calling iOS or Android code from a Flutter app.
license: MIT
compatibility: Any Agent Skills host. Needs the Flutter SDK (flutter analyze, flutter test); device runs need Xcode for iOS or the Android SDK.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "flutter"
  kete-loom/owner: "Kete-org"
---

# Flutter patterns

Build Flutter screens from small widgets, keep state where one decision rule puts it, and keep frames under budget. Plain Dart language features, isolates and package layout belong to `dart-patterns`; widget and golden tests belong to `dart-testing`. To review someone else's Flutter change, use the `flutter-reviewer` agent.

## 0. Before you write

1. Read `pubspec.yaml`: Flutter/Dart SDK constraints, and which of `flutter_riverpod`, `flutter_bloc`, `provider`, `go_router`, `auto_route` are already used.
2. Read `analysis_options.yaml`. Keep `flutter_lints` (or the project's stricter set) on; `use_build_context_synchronously` catches real async bugs. `prefer_const_constructors` is no longer in `flutter_lints` (removed in 5.0), so enable it explicitly if the team wants const enforced.
3. Follow the existing folder layout (feature-first `lib/features/<name>/` or layer-first). Don't reorganise unasked.
4. Run `flutter analyze` and `flutter test` once and record the result.

## 1. Widget composition

- Split a widget when a part rebuilds for different reasons, is reused, or the `build` method passes ~80 lines. Extract a **widget class**, not a helper method returning `Widget`: classes get their own element, can be `const` and rebuild independently.
- Mark constructors and instances `const` wherever possible; const subtrees are skipped on rebuild.
- `StatelessWidget` by default. Use `StatefulWidget` only for state owned by this widget: controllers, animation, focus, local form input.
- Every `TextEditingController`, `AnimationController`, `ScrollController`, `FocusNode`, `StreamSubscription` and `Timer` created in a `State` is disposed or cancelled in `dispose()`. Create them in `initState`, never in `build`.
- Pass data down through constructors; pass events up through callbacks. Don't reach into a child's state with a `GlobalKey` unless a framework API (forms, navigators) needs it.
- Keys: use `ValueKey(item.id)` on list items that can reorder, insert or delete, so state follows the item.

## 2. State management

Use what the project already uses. For a new project or a new kind of state, apply this rule:

| State | Put it in |
|---|---|
| Ephemeral UI (tab index, expanded, text field) | `State` of the widget |
| Shared app or server state, new or small-to-mid project | Riverpod (`Notifier` / `AsyncNotifier`, optionally with `riverpod_generator`) |
| Event-driven flows where the team wants explicit events and transitions | Bloc / Cubit (`flutter_bloc`) |
| Existing Provider app | Keep `provider` with `ChangeNotifier`; don't mix in a second library |

Rules that apply to all three:

- Keep business logic out of widgets: a notifier, cubit or repository owns it, and is unit-testable without a widget.
- State objects are immutable values (`copyWith`, or `freezed` if already used); never mutate a list in place and re-emit the same instance.
- Watch the narrowest thing: `ref.watch(provider.select((s) => s.count))`, `context.select`, or `BlocSelector`, so unrelated changes don't rebuild the screen.
- Use `ref.read` / `context.read` in callbacks, `watch` only in `build`.
- Model async state explicitly: loading, data, error (`AsyncValue` in Riverpod, sealed state classes in Bloc).

## 3. Navigation

- Apps with deep links, web, or nested tabs: `go_router` with a single route table, path parameters for IDs, and `redirect` for auth guards.
- Small apps with no deep links: `Navigator.push` with `MaterialPageRoute` is fine.
- Pass IDs in routes, not whole objects, so deep links and restoration work.
- Return results with `Navigator.pop(context, value)` / `context.pop(value)` and await the push.
- Handle the Android back button with `PopScope` where leaving would lose data.

## 4. Async UI

- Never start a future inside `build`. `FutureBuilder(future: fetch())` refetches on every rebuild. Create the future in `initState` (or a provider) and pass the stored future.
- Always render all three states: loading, error with a retry, and data (including empty).
- After every `await` in a `State` method, check `if (!mounted) return;` before using `context` or calling `setState`. For a `BuildContext` passed in as a parameter, check `context.mounted`.
- Capture `Navigator.of(context)` or `ScaffoldMessenger.of(context)` before the `await` when you need them after it.
- Cancel stream subscriptions in `dispose()`; prefer `StreamBuilder` or a provider so the framework does it.

## 5. Performance

Measure in **profile mode** (`flutter run --profile`) on a real device, with the DevTools performance view and "track widget rebuilds". Debug mode is not representative.

- Long or unbounded lists: `ListView.builder` / `SliverList` with `itemExtent` or `prototypeItem` when rows are fixed height. Never `Column` + `map` inside a `SingleChildScrollView` for long data.
- Avoid `shrinkWrap: true` on long lists inside other scrollables; use slivers in a `CustomScrollView`.
- Keep `build` cheap: no parsing, sorting, I/O or `DateFormat` construction in it. Move heavy CPU work to `compute()` / `Isolate.run`.
- `Opacity`, `ClipRRect`, `ShaderMask` and `BackdropFilter` over large areas are expensive; prefer `FadeTransition`, pre-clipped images or a colour with alpha.
- Wrap independently animating regions in `RepaintBoundary` only when the DevTools repaint view shows it helps.
- Size images: `cacheWidth` / `cacheHeight` on `Image` for thumbnails.

## 6. Platform channels

1. Search pub.dev for a maintained plugin (federated, with iOS and Android support) first.
2. For your own native calls, prefer **Pigeon** to generate type-safe Dart, Kotlin and Swift code over hand-written `MethodChannel` string maps.
3. With `MethodChannel`: one channel name per feature (`com.example.app/battery`), handle `PlatformException` and `MissingPluginException` in Dart, and return errors from native with an error code, never a crash.
4. Platform handlers run on the platform's main thread; move long native work to a background thread and reply when done.
5. Native code changes need a full rebuild, not a hot reload. Test on both platforms.

**Stop and ask the user** before adding a new state management or routing package, raising the SDK constraint, or changing native project settings (signing, min SDK, deployment target).

## Never

- Never call `setState` or use `context` after an `await` without a mounted check.
- Never create controllers, futures or streams inside `build`.
- Never use a helper method where a const widget class would do.
- Never ignore an analyzer warning by adding `// ignore:` without saying why.

## Report back

End with: widgets and files changed, state approach used and why, `flutter analyze` and `flutter test` results, and the platforms and mode (debug, profile, release) you ran it in.
