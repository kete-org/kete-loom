---
name: swiftui-patterns
description: "SwiftUI view design built on structural identity, with property-wrapper choices (@State, @Binding, @Observable models with @Bindable, @Environment), NavigationStack and value-based navigation paths, one-way data flow, keeping body cheap to avoid excess view updates, #Preview setups with sample data, and UIKit interop through UIViewRepresentable and UIHostingController. Use when building or restructuring SwiftUI screens, deciding which property wrapper owns a piece of state, migrating from ObservableObject to @Observable, fixing views that reset or redraw too often, or embedding UIKit in SwiftUI or the reverse."
license: MIT
compatibility: Any Agent Skills host. Needs Xcode on macOS for building, previews and tests (xcodebuild). @Observable and @Bindable need iOS 17 / macOS 14 or newer.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "xcodebuild"
  kete-loom/owner: "Kete-org"
---

# SwiftUI patterns

Write SwiftUI where each piece of state has one owner, view identity is stable, and `body` is cheap. Swift language features, actors and Swift 6 concurrency belong to `swift-patterns`; XCTest and Swift Testing belong to `swift-testing`.

## 0. Before you write

1. Find the deployment target (project settings or `Package.swift` `platforms:`). It decides the APIs you may use:
   - iOS 16+: `NavigationStack`, `NavigationSplitView`, `navigationDestination`.
   - iOS 17+: `@Observable`, `@Bindable`, `@Environment(Model.self)`.
   - Below that: `ObservableObject`, `@StateObject`, `NavigationView`. Use `if #available` only for small additions.
2. See whether the project uses `ObservableObject` or `@Observable` today. Don't mix both styles in one feature.
3. Build once (`xcodebuild ... build` or the project's script) and record the result.

## 1. Which property wrapper

| The view... | Use |
|---|---|
| Owns a simple value (toggle, text, selection) | `@State private var` |
| Owns a reference-type model it creates | `@State private var model = Model()` with an `@Observable` class (iOS 17+), or `@StateObject` for `ObservableObject` |
| Edits a value owned by a parent | `@Binding` |
| Receives an `@Observable` model and needs bindings to its properties | `@Bindable var model` |
| Receives an `@Observable` model and only reads it | a plain `let` / `var` property |
| Reads app-wide values or injected models | `@Environment(\.key)` or `@Environment(Model.self)` |
| Receives an `ObservableObject` it doesn't own | `@ObservedObject` |

Rules:

- `@State` and `@StateObject` are always `private` and initialised in the view that owns them. Never pass an owned value into a child's `@State`; the child keeps its first copy and ignores later changes.
- Never create an `ObservableObject` with `@ObservedObject var model = Model()`; it is recreated on every parent update.
- Keep models `@MainActor` when they drive UI.
- Migrating to `@Observable`: drop `@Published`, replace `@StateObject` with `@State`, `@EnvironmentObject` with `@Environment(Model.self)` (and `.environmentObject(model)` with `.environment(model)` at the injection site), and use `@Bindable` where you need `$model.property`.

## 2. View identity

SwiftUI tracks views by their position in the hierarchy (structural identity) or by explicit `.id` / `ForEach` IDs. When identity changes, state is destroyed and transitions run.

- Prefer modifiers over branches: `.opacity(isHidden ? 0 : 1)` keeps identity; `if isHidden { } else { }` swaps two different views and resets their state.
- `ForEach` needs stable, unique IDs from the data (`Identifiable` with a real ID). Never use `\.self` on non-unique values or array indices on mutable arrays.
- Use `.id(value)` deliberately to reset a view (for example a form when the edited record changes), never as a "force refresh" hack.
- Avoid `AnyView` in hot paths; it hides identity and costs diffing. Use `@ViewBuilder` and `some View`.

## 3. Navigation

- Use `NavigationStack(path:)` with a `@State` path (`NavigationPath` or `[Route]` of a `Hashable` enum) when the app navigates programmatically or restores state.
- Register destinations with `.navigationDestination(for: Route.self)` once, near the stack root, not inside lazy containers.
- Push by appending a value; pop by removing from the path. Pass IDs or small values, and load the model at the destination.
- Use `NavigationSplitView` for sidebar layouts on iPad and Mac.
- Present sheets with `.sheet(item:)` bound to optional state so the content gets the right value; avoid `.sheet(isPresented:)` plus a separate selected-item variable.
- Deep links: handle `.onOpenURL` once and translate the URL into a path.

## 4. Data flow

- Data flows down as values or models; events flow up through bindings or closures.
- Side effects belong in `.task { }` (cancelled automatically when the view disappears) or `.task(id:)` for work tied to a changing value. Don't start work in `init` or in `body`.
- Long work and networking go in the model or a service, not the view. Update observable state on the main actor.
- Keep one source of truth. Never copy a model's value into local `@State` "for editing" without a clear commit/cancel step.

## 5. Performance

- `body` runs often; keep it pure and cheap. No formatting objects created per call, sorting, filtering big arrays or I/O in `body`. Compute in the model or cache.
- Split big views into small subviews so a change only re-evaluates the part that reads it. With `@Observable`, a view updates only when properties it reads change.
- Use `LazyVStack`, `LazyHStack`, `LazyVGrid` or `List` for long content, not `VStack` in a `ScrollView`.
- Profile with Instruments (the SwiftUI and Time Profiler instruments) on a device in Release. `Self._printChanges()` inside `body` (debug only, remove before committing) shows why a view updated.
- Load images at display size; use `AsyncImage` only for simple cases and cache elsewhere when lists are long.

## 6. Previews

- Give every screen a `#Preview` (Xcode 15+; `PreviewProvider` on older Xcode) with in-memory sample data: no network, no real database.
- Inject dependencies through initialisers or the environment so previews can pass fakes.
- Add previews for empty, loading, error and long-text states, plus dark mode and a large Dynamic Type size.

## 7. UIKit interop

- UIKit view inside SwiftUI: `UIViewRepresentable` (or `UIViewControllerRepresentable`). Create the view in `makeUIView`, apply state in `updateUIView` (it runs often: compare before mutating), and use a `Coordinator` for delegates and target-action.
- SwiftUI inside UIKit: `UIHostingController(rootView:)`, added as a child view controller with `addChild` and `didMove(toParent:)`. Pass a model, not a snapshot, so updates flow.
- Don't keep strong references from the coordinator back to the representable's parent; use the values passed in `updateUIView`.

**Stop and ask the user** before raising the deployment target, or before migrating a whole feature from `ObservableObject` to `@Observable` when only a small change was requested.

## Never

- Never initialise `@State` from a parent's value expecting it to stay in sync.
- Never do work in `body` or a view's `init`.
- Never use array indices as `ForEach` IDs for data that changes.
- Never leave `Self._printChanges()` in committed code.

## Report back

End with: views and models changed, which wrapper owns each new piece of state, the build and test commands with results, and the OS versions or simulators you ran on.
