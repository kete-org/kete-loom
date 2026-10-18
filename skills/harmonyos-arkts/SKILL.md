---
name: harmonyos-arkts
description: Builds and fixes HarmonyOS NEXT apps written in ArkTS with ArkUI declarative components, choosing between the V1 state decorators (@State, @Prop, @Link, @Observed/@ObjectLink) and the V2 set (@ComponentV2, @Local, @Param, @Event, @ObservedV2/@Trace, @Monitor, @Computed) without mixing them illegally, wiring the UIAbility lifecycle and page routing, and running hvigorw and ohpm builds and clearing typical ArkTS compiler, signing and dependency errors. Use when writing or restructuring ArkUI pages and components, migrating state from V1 to V2 decorators, debugging a UI that does not refresh, or getting a HarmonyOS project in DevEco Studio or CI to build and install a HAP.
license: MIT
compatibility: Any Agent Skills host. Builds need the HarmonyOS SDK with hvigorw and ohpm (from DevEco Studio or the command-line tools); installing needs hdc and a device or emulator. Decorator availability depends on the API level in build-profile.json5.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "hvigorw, ohpm"
  kete-loom/owner: "Kete-org"
---

# HarmonyOS ArkTS and ArkUI

Write ArkTS that compiles under the strict ArkTS rules, keeps UI state observable, and builds the same way in DevEco Studio and CI.

## 0. Before you start

1. Read the project layout: `AppScope/app.json5` (bundle name, version), `build-profile.json5` (products, `compatibleSdkVersion`/`targetSdkVersion`, signing configs, modules), `oh-package.json5` (dependencies), each module's `src/main/module.json5` (abilities, permissions) and `src/main/resources/base/profile/main_pages.json` (routable pages).
2. Note the API level. State management V2 needs API 12 or later; check the official docs for anything newer before using it.
3. Find which state model the code uses: `@Component` structs are V1, `@ComponentV2` structs are V2. Follow the one already in use unless the user asks to migrate.
4. Install dependencies and build once (section 4) before editing, and record the errors that already exist.

## 1. ArkTS rules the compiler enforces

ArkTS is stricter than TypeScript. Write it this way from the start:

- No `any` or `unknown`; give everything an explicit type (`arkts-no-any-unknown`). Type `JSON.parse` results, for example as a declared class or `Record<string, Object>`.
- Object literals must match a declared class or interface (`arkts-no-untyped-obj-literals`). Declare an `interface` or `class` and annotate.
- No dynamic property access on objects by string index (`arkts-no-props-by-index`); use a `Map` or declared fields.
- No structural typing tricks, no runtime-added fields, no `delete`, limited destructuring and spread; prefer classes and explicit types.
- Import system APIs from kits: `@kit.AbilityKit`, `@kit.ArkUI`, `@kit.NetworkKit`, `@kit.PerformanceAnalysisKit` (for `hilog`).

When the compiler names a rule tag, look it up in the official ArkTS migration guide ("Adaptation Cases") and apply its fix pattern; do not silence the check.

## 2. Components and state

A component is a `struct` with a decorator and a `build()` method that describes UI. Keep `build()` free of side effects; do work in lifecycle callbacks (`aboutToAppear`, `aboutToDisappear`) or event handlers.

| Need | V1 (`@Component`) | V2 (`@ComponentV2`) |
|---|---|---|
| Local state | `@State` | `@Local` |
| Read-only input from parent | `@Prop` (copied) | `@Param` (add `@Require` if mandatory) |
| Input initialised once, then owned locally | `@State` initialised from parent | `@Param @Once` |
| Child changes parent state | `@Link` | `@Param` plus an `@Event` callback the parent handles |
| Pass down many levels | `@Provide` / `@Consume` | `@Provider()` / `@Consumer()` |
| Observe nested object fields | `@Observed` class + `@ObjectLink` | `@ObservedV2` class with `@Trace` fields |
| React to a change | `@Watch('method')` | `@Monitor('path')` |
| Derived value | getter (recomputed each build) | `@Computed get` |
| App-wide state | `AppStorage` / `@StorageLink` / `LocalStorage` | `AppStorageV2`, `PersistenceV2` |

Rules:

1. Never put V2 decorators inside a `@Component` struct or V1 decorators inside a `@ComponentV2` struct; it does not compile. A struct cannot be both.
2. When mixing, a V1 component can contain a V2 child when no state is passed between them; passing state across the boundary has restrictions, so read the official "mixed scenarios" page before doing it, or migrate the whole subtree.
3. `@Local` and `@State` observe assignment of the value and, for arrays, the mutating array methods (`push`, `splice`, index assignment). They do not see a field change inside an element or nested object: for that use `@ObservedV2` + `@Trace` (V2) or `@Observed` + `@ObjectLink` (V1).
4. Data flows down; events flow up. A child never mutates a `@Param`; it calls the parent's `@Event`.
5. Use `ForEach(items, (item: Item) => { ... }, (item: Item) => item.id.toString())` with a stable key generator that returns a string, and `LazyForEach` with an `IDataSource` for long lists.

UI not refreshing? Check, in order: the field is decorated; the changed thing is the observed level (object vs field); the object is a decorated class instance and not a plain literal; the `ForEach` key changes when content changes.

## 3. UIAbility lifecycle and pages

1. The entry ability (`EntryAbility.ets`) extends `UIAbility`. Callbacks run in this order: `onCreate(want, launchParam)`, `onWindowStageCreate(windowStage)`, `onForeground()`, then `onBackground()`, `onWindowStageDestroy()`, `onDestroy()`.
2. Load the first page in `onWindowStageCreate` with `windowStage.loadContent('pages/Index', (err) => { ... })` and log failures with `hilog`.
3. Release resources in `onBackground` (pause timers, sensors) and in `onWindowStageDestroy` (UI listeners).
4. Register every `@Entry` page in `main_pages.json`. For navigation, follow what the project uses; current docs recommend the `Navigation` component with `NavPathStack` over the older `router` module for new code. Check the docs for your API level.
5. Declare permissions in `module.json5` and request user-granted ones at runtime with `abilityAccessCtrl`; never assume they are granted.

## 4. Build and run

From the project root:

```sh
ohpm install                                    # dependencies from oh-package.json5
hvigorw clean --no-daemon
hvigorw assembleHap --mode module -p product=default -p buildMode=debug --no-daemon
hdc install <module>/build/default/outputs/default/<module>-default-signed.hap
```

- The HAP lands under `<module>/build/<product>/outputs/<target>/`. Use `buildMode=release` for release builds.
- Use `--no-daemon` in CI.
- Installing on a device needs a signed HAP: configure `signingConfigs` in `build-profile.json5` (DevEco Studio can generate debug signing). Never commit keystores or passwords; read them from CI secrets.
- If `hvigor/hvigor-config.json5` pulls npm packages, CI needs an npm registry configured.

For specific build errors and their fixes, read `references/build-errors.md`.

## 5. Verify

1. The build finishes with no ArkTS errors and no new warnings.
2. Install and launch on a device or emulator; open each changed page; exercise each state change and confirm the UI updates.
3. Send to background and back; rotate if supported; confirm nothing leaks or crashes (`hdc hilog` for logs).
4. Run the module's tests if the project has them (`ohosTest` source set).

## Stop and ask the user

- Migrating a whole app from V1 to V2 decorators, or from `router` to `Navigation`: confirm scope first.
- Raising `compatibleSdkVersion`, changing the bundle name, or touching signing configs.
- A third-party ohpm package has no HarmonyOS NEXT version.

## Never

- Never use `any`, `// @ts-ignore` or casts to get past ArkTS checks.
- Never mix V1 and V2 decorators in one struct.
- Never do network or file I/O inside `build()`.
- Never commit signing material.

## Report back

```
API level / state model: <API n, V1 or V2>
Changed: <files and components>, decorators used: <list>
Build: <commands run> -> <result>; installed on: <device/emulator>
Checked in docs: <APIs>; not verified: <list>
Follow-ups: <migration or signing items>
```
