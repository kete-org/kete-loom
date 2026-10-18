---
name: kotlin-multiplatform
description: Sets up and evolves Kotlin Multiplatform (KMP) and Compose Multiplatform projects, covering the shared module and source-set layout (commonMain, androidMain, iosMain), expect/actual versus interfaces with injected platform implementations, choosing multiplatform-ready libraries, exporting a framework to Xcode, exposing suspend functions and Flows to Swift, and Gradle build setup for Android and iOS targets. Use when starting or restructuring a KMP shared module, deciding what code to share between Android and iOS, adding a platform-specific API behind expect/actual, wiring the shared framework into an Xcode project, or sharing UI with Compose Multiplatform.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK and the Gradle wrapper; building iOS targets needs macOS with Xcode.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "java"
  kete-loom/owner: "Kete-org"
---

# Kotlin Multiplatform

Share the code that is the same on every platform, keep platform code behind a small seam, and keep the iOS side pleasant to call from Swift. Single-platform Kotlin idioms belong to `kotlin-patterns`; Android-only Compose UI belongs to `jetpack-compose-patterns`; native iOS UI belongs to `swiftui-patterns`.

## 0. Before you change anything

1. Read `settings.gradle.kts`, the shared module's `build.gradle.kts` and `gradle/libs.versions.toml`: Kotlin version, targets declared in `kotlin { }`, Android plugin in use, and whether Compose Multiplatform (`org.jetbrains.compose`) is applied.
2. Find how iOS consumes the shared code: a framework built by an Xcode run-script phase (`embedAndSignAppleFrameworkForXcode`), CocoaPods (`kotlin("native.cocoapods")`), or Swift Package Manager via an XCFramework.
3. Run `./gradlew build` (or `:shared:allTests`) once and record the result. On a machine without Xcode, iOS tasks will be skipped or fail; say so in your report.

## 1. What to share

Decision rule:

1. **Share**: domain models, business rules, validation, networking (Ktor client), persistence (SQLDelight, Room KMP), serialization (`kotlinx.serialization`), repositories and ViewModel-level presentation logic.
2. **Share UI with Compose Multiplatform** only when the team accepts a non-native-looking iOS UI or has designed for it. Compose Multiplatform for iOS has been stable since 1.8.0.
3. **Keep native**: platform UI the user expects (iOS system navigation, widgets, extensions), and anything that needs deep platform APIs.

**Stop and ask the user** before moving existing native UI into Compose Multiplatform or moving a large existing module into shared code.

## 2. Module and source-set structure

```
shared/
  src/commonMain/kotlin/     # pure Kotlin, multiplatform libraries only
  src/commonTest/kotlin/     # kotlin.test tests that run on every target
  src/androidMain/kotlin/    # Android actuals, Android SDK allowed
  src/iosMain/kotlin/        # shared by iosArm64 + iosSimulatorArm64 (+ iosX64)
```

- Rely on the default hierarchy template: declaring `iosArm64()` and `iosSimulatorArm64()` gives you an `iosMain` source set automatically. Don't hand-wire `dependsOn` unless the project already does.
- `commonMain` must never import `android.*`, `java.*` or `platform.*`. If it needs one, that's a seam (section 3).
- For larger apps, split by feature (`:shared:feature-auth`, `:shared:core-network`) and export only an umbrella module to iOS, because each exported framework carries its own copy of the Kotlin runtime.
- Android: new KMP library modules use the Android-KMP library plugin (`com.android.kotlin.multiplatform.library`). Configure the Android target inside `kotlin { }` with `android { namespace = ...; compileSdk = ...; minSdk = ... }` on AGP 8.12+, or `androidLibrary { }` on older AGP (`androidLibrary` is deprecated in newer AGP). Applying `com.android.library` to a KMP module relies on AGP APIs that need an opt-in from AGP 9.0 and are planned for removal in AGP 10; migrate only when the user agrees.

## 3. expect/actual vs interfaces

Prefer, in this order:

1. **A multiplatform library** that already wraps the API (Ktor, `kotlinx-datetime`, `multiplatform-settings`, Okio).
2. **An interface in `commonMain`** implemented per platform and injected (Koin or constructor injection). Best for anything stateful or that needs mocking in tests; iOS implementations can even be written in Swift and passed in.
3. **`expect fun` / `expect val`** for small, stateless platform facts (`expect fun platformName(): String`, a UUID or clock).
4. **`expect class`** last. expect/actual classes are still Beta and need the compiler opt-in the build reports when you use them.

Every `expect` needs an `actual` in each target's source set (or an intermediate set like `iosMain`). Keep actuals thin: translate and delegate, no business logic.

## 4. Platform dependencies

- Put each dependency in the narrowest source set: `commonMain.dependencies { }` for multiplatform libraries, `androidMain.dependencies { }` / `iosMain.dependencies { }` for platform engines (for example `ktor-client-okhttp` vs `ktor-client-darwin`).
- Before adding a library to `commonMain`, check its published targets include every target you declare (look for iOS artifacts on Maven Central or klibs.io).
- Use the version catalog; don't hard-code versions in build scripts.
- Calling Apple frameworks from Kotlin goes through the `platform.*` cinterop bindings in `iosMain`; CocoaPods or custom cinterop are only for third-party native libraries.

## 5. iOS interop

- Configure the framework once:

  ```kotlin
  listOf(iosArm64(), iosSimulatorArm64()).forEach {
      it.binaries.framework { baseName = "Shared"; isStatic = true }
  }
  ```
- Kotlin `suspend` functions appear in Swift as async functions or completion handlers, and Flows arrive as plain objects that are awkward to collect. For a Swift-friendly API, use SKIE or KMP-NativeCoroutines if the project allows a plugin; otherwise expose a small callback wrapper (`fun watch(onEach: (T) -> Unit): Closeable`).
- Sealed classes and enums lose exhaustiveness in Swift without such tooling. Keep the Swift-facing API small and explicit: one facade per feature.
- Kotlin exceptions crossing into Swift crash unless declared with `@Throws`. Annotate every public suspend or throwing function exported to iOS, or return a result type.
- Keep all shared code that touches UI-observable state on the main dispatcher when called from Swift.
- After a shared-code change, rebuild the iOS app from Xcode (or `xcodebuild`) to prove the framework links.

## 6. Build setup and checks

- Use the same Kotlin version for the Kotlin, Compose compiler and serialization plugins; mismatches are the most common build failure.
- Common tests go in `commonTest` with `kotlin.test`; run `./gradlew :shared:allTests` (or the project's task) so they run on JVM/Android and iOS simulator.
- Commit `gradle/libs.versions.toml`, the Gradle wrapper and the Xcode project changes together.

## Never

- Never import a platform package from `commonMain`.
- Never put business logic in an `actual`.
- Never export every Gradle module to iOS as its own framework.
- Never let an undeclared exception cross the Kotlin/Swift boundary.

## Report back

End with: modules and source sets changed, each new expect/actual or injected interface, Gradle tasks run (and whether iOS targets actually built on this machine), and anything the iOS team must change in Xcode.
