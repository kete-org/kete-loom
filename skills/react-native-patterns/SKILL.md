---
name: react-native-patterns
description: React Native and Expo app guidance for picking a navigation library, keeping global state small, writing or wrapping native modules for the New Architecture, fixing slow lists and needless re-renders, handling iOS versus Android differences, and shipping over-the-air updates with EAS Update without breaking installed binaries. Use when building or restructuring screens in a React Native or Expo project, debugging jank in a FlatList or FlashList, adding a native dependency or config plugin, or planning a store release or OTA update.
license: MIT
compatibility: Any Agent Skills host. Needs Node and the project's package manager; device builds need Xcode (iOS) or Android Studio and a JDK (Android). Expo projects use the expo and eas CLIs.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "node, npx"
  kete-loom/owner: "Kete-org"
---

# React Native patterns

Build React Native screens that stay at 60 fps, behave on both platforms, and survive the release process. Plain React component design and web-only concerns belong to `react-patterns`; TypeScript typing belongs to `typescript-patterns`.

## 0. Before you change anything

1. Read `package.json` and find the `react-native` and (if present) `expo` versions. Read `app.json` / `app.config.(js|ts)` for Expo projects.
2. Decide the project type, because it changes every native step:
   - **Expo with Continuous Native Generation (CNG)**: no committed `ios/` or `android/` folders, native config comes from `app.config` and config plugins. Never hand-edit generated native folders; they are overwritten by `npx expo prebuild`.
   - **Bare / committed native folders**: native changes are made in `ios/` and `android/` directly and reviewed like any other code.
3. Find the navigation library (`expo-router`, `@react-navigation/*`) and state libraries already in use. Follow them; don't introduce a second one.
4. Run the project's type check and tests once and record the result.

## 1. Navigation

- Expo projects with `expo-router`: routes are files under `app/`. Use `_layout.tsx` for stacks and tabs, `[id].tsx` for params, and typed routes if the project enables them.
- React Navigation projects: declare param lists per navigator in TypeScript and pass only IDs and small serialisable values as params. Fetch the object on the destination screen.
- Never pass functions, class instances or large objects through params. They break deep links, state persistence and state restoration.
- Deep links: define them once (Expo `scheme` or React Navigation `linking` config) and test a cold start from a link on both platforms.

## 2. State

Decision rule, smallest first:

1. Local `useState` / `useReducer` for state used by one screen.
2. Server data: a query cache (TanStack Query, RTK Query, SWR or whatever the project uses), not a global store.
3. Truly global client state (session, theme, feature flags): the project's existing store (Zustand, Redux Toolkit, Jotai, Context).
4. Persisted values: `expo-secure-store` or the Keychain/Keystore for secrets and tokens; AsyncStorage or MMKV only for non-sensitive data.

Never store tokens or personal data in AsyncStorage: it is unencrypted.

## 3. Lists and re-renders

Lists are the first place to look for jank.

- Use `FlatList`, `SectionList` or `FlashList` for anything that can grow. Never `.map()` a long array inside a `ScrollView`.
- Give every list a stable `keyExtractor` from the data's ID, never the index.
- Memoise `renderItem` with `useCallback` and the row component with `React.memo`; pass primitive props so memo can skip.
- For fixed-height rows provide `getItemLayout` (FlatList). Tune `initialNumToRender`, `windowSize` and `maxToRenderPerBatch` only after measuring.
- Don't create new objects, arrays or inline style objects per render in hot rows; hoist them or use `StyleSheet.create`.
- Selectors: subscribe to the smallest slice of a store (`useStore(s => s.count)`), not the whole store.
- Animations: run them on the UI thread with Reanimated worklets or `useNativeDriver: true`, never by setting state every frame.

Measure before and after: React DevTools Profiler for renders, the platform profiler (Xcode Instruments, Android Studio profiler) for frames, and always test in a **release** build. Dev builds are much slower and mislead.

## 4. Native modules

The New Architecture (TurboModules, Fabric) is the default since React Native 0.76, and from 0.82 it can no longer be turned off.

1. Before writing a module, search for a maintained library or Expo SDK module that already does it, and check it supports the New Architecture.
2. Expo projects: write new native code as an Expo Module (`npx create-expo-module`) and any native config change as a config plugin, so `prebuild` reproduces it.
3. Bare projects: write a TurboModule with a typed JS spec and Codegen.
4. Keep the JS/native boundary coarse: one call that does the work, not many chatty calls per frame.
5. Every native dependency change needs a new binary. **Stop and tell the user** that an OTA update cannot ship it.

## 5. Platform differences

Check each of these on both platforms before calling a screen done:

- Safe areas and notches: `react-native-safe-area-context`, not hard-coded padding.
- Keyboard: `KeyboardAvoidingView` behaviour differs (`padding` on iOS is usual; Android often relies on `windowSoftInputMode`). Test forms with the keyboard open.
- Android hardware back button and predictive back; iOS swipe-back gesture.
- Permissions: iOS needs usage-description strings (`NSCameraUsageDescription` and friends, via `ios.infoPlist` in Expo); Android needs manifest permissions plus a runtime request.
- Shadows (`shadow*` on iOS vs `elevation` on Android), fonts and text line height.
- Use `Platform.select` or `.ios.tsx` / `.android.tsx` files for real divergence, not scattered `Platform.OS` checks.

## 6. OTA updates and releases

An OTA update (EAS Update or similar) only replaces the JavaScript bundle and assets.

- Set `runtimeVersion` deliberately. With the `appVersion` policy you must bump the app `version` whenever native code changes; the `fingerprint` policy derives it from native inputs. A wrong runtime version ships JS that calls native code the binary doesn't have, which crashes on launch.
- Ship native changes (new native dependency, SDK upgrade, permission, config plugin) only through a store build.
- Publish to a staging channel, test on a real installed build, then promote to production.
- Keep a rollback path: know the command to republish or roll back the previous update before you publish.
- Release builds: bump the store version and build number (`ios.buildNumber`, `android.versionCode`), keep signing credentials out of git, and test the release build, not the dev client.

**Stop and ask the user** before publishing an update to a production channel or submitting to a store.

## Never

- Never hand-edit `ios/` or `android/` in a CNG project.
- Never ship native changes over the air.
- Never leave `console.log` in hot render paths of a release build, or secrets in the JS bundle (anything in the bundle is readable).
- Never judge performance from a debug build.

## Report back

End with: what changed, which platforms you ran it on (simulator, device, release or debug), commands run and results, and whether the change needs a new binary or can go out as an OTA update.
