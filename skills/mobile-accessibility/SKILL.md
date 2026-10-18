---
name: mobile-accessibility
description: Makes native iOS and Android screens usable with VoiceOver and TalkBack by fixing labels, traits and roles, grouping and reading order, focus moves after navigation, Dynamic Type and sp font scaling, 44pt and 48dp touch targets and colour contrast, across SwiftUI, UIKit, Jetpack Compose and Android Views, then proving it with Accessibility Inspector, Accessibility Scanner and automated audits in UI tests. Use when a native mobile screen must work with a screen reader, large text or switch access, an app store or customer audit flagged accessibility issues, or accessibility checks need adding to XCUITest, Espresso or Compose tests.
license: MIT
compatibility: Any Agent Skills host. Testing needs Xcode (Accessibility Inspector, XCUITest) or Android Studio with an emulator or device (Accessibility Scanner, Espresso or Compose UI tests).
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Mobile accessibility

Fix native iOS and Android UI so people using a screen reader, large text, switch control or low vision can finish every task. For web pages use the web accessibility skill; for React Native or Flutter, apply the same rules through that framework's accessibility props.

## 0. Before you start

1. Find the UI toolkit per screen: SwiftUI, UIKit, Jetpack Compose or Android Views. Many apps mix them.
2. List the critical journeys (sign in, search, checkout, settings). Audit those first, not every screen.
3. Ask the user whether a target standard applies (WCAG 2.2 AA is the usual reference for mobile, and some contracts or laws name it). Do not claim legal compliance; report findings against the criteria.

## 1. Audit each screen in this order

For every screen, check and record each item:

1. **Every control has a name.** Icon-only buttons, images that carry meaning and custom views need a label. Decorative images are hidden from assistive tech.
2. **Role and state are announced.** A tappable row says "button", a toggle says on/off, a selected tab says selected, a heading is a heading.
3. **Grouping.** A card with title, price and rating is read as one element, not five swipes.
4. **Reading and focus order** follows the visual order. After a screen change, sheet or error, focus moves to the new content.
5. **Text scales.** At the largest accessibility text size nothing is clipped or overlapped; layouts wrap or scroll instead of truncating.
6. **Touch targets** are at least 44 x 44 pt on iOS (Human Interface Guidelines) and 48 x 48 dp on Android (Material). Expand the hit area rather than the visible icon if needed.
7. **Contrast** is at least 4.5:1 for body text and 3:1 for large text and essential icons or control borders (WCAG 1.4.3, 1.4.11). Never convey state by colour alone.
8. **Motion and transparency** respect Reduce Motion and Reduce Transparency (iOS) and Remove animations (Android).
9. **Custom gestures** (swipe to delete, long press) also have an accessible action.

## 2. Fix with the platform API

Use the native control first: a real `Button`/`Toggle` gets role, state and focus for free. Add modifiers only where a native control is not possible.

| Need | SwiftUI | UIKit | Compose | Android Views |
|---|---|---|---|---|
| Name | `.accessibilityLabel("Delete")` | `accessibilityLabel` | `Modifier.semantics { contentDescription = "Delete" }` or `Icon(contentDescription=)` | `android:contentDescription` |
| Hide decorative | `.accessibilityHidden(true)`, `Image(decorative:)` | `isAccessibilityElement = false` | `contentDescription = null` | `importantForAccessibility="no"` |
| Role/state | `.accessibilityAddTraits(.isButton)`, `.accessibilityValue` | `accessibilityTraits`, `accessibilityValue` | `Modifier.semantics { role = Role.Button; stateDescription = "On" }`, `Modifier.toggleable` | `ViewCompat.setAccessibilityDelegate`, `stateDescription` |
| Heading | `.accessibilityAddTraits(.isHeader)` | `.header` trait | `Modifier.semantics { heading() }` | `android:accessibilityHeading="true"` |
| Group | `.accessibilityElement(children: .combine)` | container view as one element with a combined label | `Modifier.semantics(mergeDescendants = true) {}` or `clickable` on the row | `android:focusable="true"` on the parent, `screenReaderFocusable` |
| Order | `.accessibilitySortPriority` | `accessibilityElements` array | `Modifier.semantics { traversalIndex = 1f; isTraversalGroup = true }` | `android:accessibilityTraversalBefore/After` |
| Move focus | `@AccessibilityFocusState` | `UIAccessibility.post(notification: .screenChanged, argument: view)` | `Modifier.semantics { paneTitle = "..." }` on the new pane; `FocusRequester` moves input focus, which TalkBack may not follow, so check on a device | `view.sendAccessibilityEvent` or `performAccessibilityAction(ACTION_ACCESSIBILITY_FOCUS)` |
| Announce | `AccessibilityNotification.Announcement("Saved").post()` | `UIAccessibility.post(notification: .announcement, argument:)` | `Modifier.semantics { liveRegion = LiveRegionMode.Polite }` | `android:accessibilityLiveRegion="polite"` |
| Custom action | `.accessibilityAction(named: "Delete") {}` | `accessibilityCustomActions` | `Modifier.semantics { customActions = listOf(...) }` | `ViewCompat.addAccessibilityAction` |
| Text scaling | `.font(.body)` text styles, `@ScaledMetric` | `UIFont.preferredFont(forTextStyle:)` + `adjustsFontForContentSizeCategory = true` | `sp` units via `MaterialTheme.typography` | `sp` for `textSize`, avoid fixed `dp` heights on text |
| Touch target | `.frame(minWidth: 44, minHeight: 44)` + `.contentShape(Rectangle())` | override `point(inside:with:)` or larger frame | `Modifier.minimumInteractiveComponentSize()` (Material 3 does this for its components) | `minWidth`/`minHeight` 48dp or `TouchDelegate` |

Label rules:

- Say what it does, not what it looks like: "Delete message", not "trash can". Do not add "button" to a label; the role says it.
- Keep labels short and put the important word first. Put extra guidance in a hint (`accessibilityHint`) only when the action is not obvious.
- Localise labels with the rest of the strings.

## 3. Verify

1. **Manual screen reader pass** of each critical journey: VoiceOver on iOS (Settings, Accessibility, VoiceOver, or the Accessibility Shortcut), TalkBack on Android. Swipe through every element; activate every control; complete the task without looking.
2. **Largest text size**: iOS Settings, Accessibility, Display and Text Size, Larger Text; Android Settings, Display, Font size (and Display size). Use Xcode's Environment Overrides or the Compose `@Preview(fontScale = 2f)` while iterating.
3. **Inspectors**: Xcode's Accessibility Inspector (Audit tab, and inspect an element's label, traits and frame); Android's Accessibility Scanner app on a device or emulator.
4. **Automated checks in UI tests**, so regressions fail CI:
   - iOS 17+ XCUITest: `try app.performAccessibilityAudit()` on each critical screen; narrow with `for: [.contrast, .dynamicType, .hitRegion]` and filter known false positives in the issue handler (return `true` to ignore an issue), with a comment why.
   - Espresso: add `androidx.test.espresso:espresso-accessibility` and call `AccessibilityChecks.enable()` in the test setup.
   - Compose 1.8+: add `androidx.compose.ui:ui-test-junit4-accessibility`, call `composeTestRule.enableAccessibilityChecks()` on an `AndroidComposeTestRule`; checks run on actions, or call `onRoot().tryPerformAccessibilityChecks()`.
5. Rerun the tests and the manual pass after every fix.

Automated audits catch only part of the real problems (they cannot judge whether a label makes sense or a journey can be finished). A clean audit never replaces the screen reader pass.

## Stop and ask the user

- A fix would change the visual design (bigger targets, colours that pass contrast, text wrapping onto more lines). Show the before and after and let design decide how, not whether.
- A custom control (chart, canvas, game view, map) has no obvious accessible equivalent; propose a text summary or alternative view first.
- The project has no UI test target and adding one is a large change.

## Never

- Never hide a focusable, interactive element from assistive tech to silence an audit warning.
- Never cap or disable Dynamic Type or font scaling (`maximumContentSizeCategory`, fixed `dp` text) to save a layout, unless the user agrees for that specific element and the content stays readable another way.
- Never put the same label on several different controls in one screen ("Button", "Image", "More").
- Never rely on a tooltip, colour or position alone to convey meaning.

## Report back

```
Screens audited: <list>
Issues: <id> | <screen> | <criterion, e.g. name, order, target size> | <severity: blocker/major/minor> | <fix or status>
Verified with: <VoiceOver/TalkBack pass, largest text, Inspector/Scanner, UI test audits added (test names)>
Open: <items needing design decisions or not fixed>
```
