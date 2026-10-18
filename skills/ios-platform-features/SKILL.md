---
name: ios-platform-features
description: Adopts recent Apple platform APIs in an existing app without dropping older OS versions, covering the Liquid Glass design (glassEffect, GlassEffectContainer, glass button styles, UIGlassEffect, UIDesignRequiresCompatibility), the on-device Foundation Models framework with SystemLanguageModel availability, LanguageModelSession, @Generable guided generation and the Tool protocol, #available checks with real fallbacks, and layered Icon Composer app icons. Use when an iOS, iPadOS or macOS app is moving to the iOS 26 or later SDK, adding an Apple Intelligence text feature that runs on device, gating a new API behind an availability check, or replacing an AppIcon asset catalog with an .icon file.
license: MIT
compatibility: Any Agent Skills host. Needs Xcode 26 or later with the matching SDKs; Foundation Models features need an Apple Intelligence capable device or Mac to test on. APIs change between SDK releases, so every name must be checked against developer.apple.com for the SDK in use.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "xcodebuild"
  kete-loom/owner: "Kete-org"
---

# iOS platform features

Bring an app onto Apple's newest APIs while it keeps working on every OS version it still supports. General Swift style lives in the Swift and SwiftUI skills; this skill is about new platform surfaces and gating them.

## 0. Before you start

1. Read the deployment target (target, General, Minimum Deployments, or `IPHONEOS_DEPLOYMENT_TARGET`) and the Xcode and SDK version (`xcodebuild -version`, `xcodebuild -showsdks`).
2. **Verify every API against Apple's documentation for that SDK before you write it.** Open the symbol page on developer.apple.com and read its availability line. Apple renames and deprecates these APIs between major releases (for example, the iOS 27 SDK adds `LanguageModelError`, `SystemLanguageModel.Error` and `LanguageModelSession.Error` alongside the iOS 26 `LanguageModelSession.GenerationError`). If you cannot confirm a name, say so and do not guess.
3. Build once and run the tests before changing anything. Record warnings.

## 1. Availability rules (apply to every feature below)

- Gate code with `if #available(iOS 26, *) { ... } else { ... }` and types or members with `@available(iOS 26, *)`. Use the matching macOS, visionOS or watchOS versions for those targets.
- Every gated path has a real fallback that a user on the older OS can use. Hiding a button is a fallback only if the feature is optional.
- Keep gated code in small wrappers (one view modifier, one service type), not scattered `#available` checks.
- Test both branches: a simulator on the newest OS and one on the oldest supported OS.
- Raising the deployment target is a product decision. **Stop and ask the user** before doing it to avoid writing a fallback.

## 2. Liquid Glass

Building with the iOS 26 SDK gives standard components (navigation bars, tab bars, toolbars, sheets, buttons, sliders) the new material automatically.

1. Rebuild and walk every screen on an iOS 26+ simulator. Look for custom backgrounds on bars, toolbars, split views and sheets that fight the system material, and remove them first.
2. For custom controls, prefer the system button styles: SwiftUI `.buttonStyle(.glass)` and `.buttonStyle(.glassProminent)`; UIKit `UIButton.Configuration.glass()`, `.prominentGlass()`, `.clearGlass()`, `.prominentClearGlass()`.
3. Only then use the effect directly: `.glassEffect()` (default `.regular` in a capsule), `.glassEffect(.regular.tint(.orange).interactive(), in: .rect(cornerRadius: 16))`. Apply it after the modifiers that set the view's appearance. UIKit uses `UIGlassEffect` in a `UIVisualEffectView`; AppKit uses `NSGlassEffectView`.
4. Group nearby glass views in `GlassEffectContainer(spacing:)` for performance and morphing; use `glassEffectID(_:in:)` with a `@Namespace` for morph transitions and `glassEffectUnion(id:namespace:)` to merge shapes at rest.
5. Use glass sparingly: controls and navigation, never content such as list rows or cards of text.
6. Content scrolling under a custom bar: use `safeAreaBar(edge:...)` (SwiftUI) or `UIScrollEdgeElementContainerInteraction` (UIKit) to get the scroll edge effect.
7. Wrap custom glass in one modifier that falls back on older OS versions:

```swift
extension View {
    @ViewBuilder func appGlass() -> some View {
        if #available(iOS 26, *) { self.glassEffect() }
        else { self.background(.ultraThinMaterial, in: Capsule()) }
    }
}
```

8. Check legibility with Reduce Transparency, Increase Contrast and Reduce Motion on, in light and dark mode.
9. The `UIDesignRequiresCompatibility` Info.plist key keeps the pre-Liquid Glass look only for builds made with the Xcode 26 SDKs. Apple has said builds made with the Xcode 27 SDKs ignore it, whatever the deployment target. Do not offer it as a fix on Xcode 27 or later; tell the user the redesign cannot be postponed past that SDK.

## 3. Foundation Models (on-device language model)

Read `references/foundation-models.md` before writing code; it has the session, guided generation and tool patterns.

1. Decide whether the task fits a small on-device model: summarising, extracting fields, classifying, rewriting or tagging the user's own content. It is not a source of world knowledge or facts. **Stop and ask** if the feature needs accurate facts, long documents or heavy reasoning.
2. Check `SystemLanguageModel.default.availability` every time before offering the feature, and handle each `.unavailable` reason: `.deviceNotEligible` (hide the feature), `.appleIntelligenceNotEnabled` (explain how to turn it on), `.modelNotReady` (try later; the model may be downloading).
3. Prefer guided generation (`@Generable` types with `@Guide` constraints) over parsing free text.
4. Give the model app data through a `Tool` only when it must decide what to fetch; otherwise put the data in the prompt.
5. Handle errors: context window exceeded, guardrail violation, unsupported language or locale, and concurrent requests on one session. Use the error type your SDK documents.
6. Keep the user in control: show generated text as a draft they can edit or discard, never act on it automatically.
7. If the project builds with the iOS 27 SDK or later, read Apple's "Foundation Models updates" page first (it lists the `LanguageModel` protocol for other models, `PrivateCloudComputeLanguageModel`, image input, `LanguageModelSession.DynamicProfile` and the new error types); do not assume iOS 26 signatures still apply. `PrivateCloudComputeLanguageModel` and server models are not on-device: **stop and ask** before using them, and describe the feature accordingly.

## 4. App icons with Icon Composer

1. Open Icon Composer from Xcode (Xcode, Open Developer Tool, Icon Composer). Import layers as SVG (PNG for unsupported features), up to four groups, back to front. Leave out blur, shadow, background and the mask; Icon Composer and the system add them.
2. Check the default, dark and mono (clear and tinted) appearances in the canvas.
3. Add the `.icon` file to the app target and make the App Icon name in the target's General tab match the file name without extension (usually `AppIcon`).
4. When the target has an `.icon` file, Xcode uses it instead of an `AppIcon` asset set of the same name and generates the images older OS versions show; a different icon per OS version is not supported. Check the icon on the oldest supported OS, and **ask the user** before deleting the old asset set.
5. tvOS and visionOS targets still use asset catalogs.

## 5. Verify

1. Build for every platform the app supports and fix new availability warnings.
2. Run on the newest and the oldest supported OS. Exercise each new feature and its fallback.
3. Foundation Models: test on a real eligible device, with Apple Intelligence off, and with an unsupported language.
4. Run the test suite. Add a test for each fallback path you can reach (for example, a fake model service behind a protocol).

## Never

- Never call an API without checking it on developer.apple.com for the SDK in use.
- Never ship a Foundation Models feature without a path for every unavailable reason.
- Never send the user's content to a server while describing the feature as on-device.
- Never cover text-heavy content with glass or stack glass on glass.
- Never raise the deployment target silently.

## Report back

```
SDK / deployment target: <Xcode version, SDK, min OS>
Adopted: <feature> | <files> | <availability gate> | <fallback>
Verified on: <OS versions and devices>, tests: <command and result>
APIs checked against docs: <list>; could not confirm: <list>
Open questions: <deployment target, icon fallback, design decisions>
```
