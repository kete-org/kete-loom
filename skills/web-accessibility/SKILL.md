---
name: web-accessibility
description: Builds and fixes web UI so it meets WCAG 2.2 Level AA, starting from semantic HTML and adding keyboard support, focus management, labelled forms with announced errors, sufficient colour contrast and ARIA only where native elements fall short, then checks the result with axe and a screen reader. Use when writing or changing components, forms, dialogs, menus or pages that people must be able to use with a keyboard, screen reader, zoom or voice control.
license: MIT
compatibility: Any Agent Skills host. Works on any HTML-producing stack (plain HTML, React, Vue, Svelte, Angular, server templates). Automated checks need Node and a browser.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Web accessibility (WCAG 2.2 AA)

Goal: every user can perceive, operate and understand the UI. Fix the markup first; ARIA and JavaScript come last.

## 0. Before you start

1. Find what the project already has: a component library (does it ship accessible primitives?), an a11y lint plugin (`eslint-plugin-jsx-a11y`, `eslint-plugin-vuejs-accessibility`, `@angular-eslint` template rules), axe in tests (`@axe-core/playwright`, `jest-axe`, `vitest-axe`, `cypress-axe`).
2. Reuse the project's accessible primitives (dialog, menu, tabs, combobox) instead of building new ones.
3. If the design requires something that cannot meet AA (text over a busy image with no overlay, a drag-only interaction, a hover-only reveal), **stop and tell the user** which criterion it fails and propose an alternative. Do not ship it silently.

## 1. Semantic HTML first

Decision rule: if a native element does the job, use it. It brings role, name, keyboard behaviour and focus for free.

| Need | Use | Never |
|---|---|---|
| Action | `<button type="button">` | `<div onclick>`, `<a href="#">` |
| Navigation | `<a href="/path">` | `<button>` that changes location |
| Page regions | `<header> <nav> <main> <aside> <footer>`, one `<main>` | div soup |
| Headings | `<h1>`–`<h6>` in order, no skipped levels for styling | bold `<div>` as heading |
| Lists, tables | `<ul>/<ol>`, `<table>` with `<th scope>` and `<caption>` | grid of divs for tabular data |
| Toggle | `<input type="checkbox">` or `<button aria-pressed>` | clickable span |
| Disclosure | `<details><summary>` | custom JS when native fits |
| Modal | `<dialog>` opened with `showModal()` | positioned div without focus trap |

- Set `<html lang="...">` and a unique, descriptive `<title>` per page or route.
- Images: meaningful → `alt` describing purpose; decorative → `alt=""`. Icon-only buttons need an accessible name (visible text, `aria-label`, or visually hidden text).
- Add a "Skip to main content" link as the first focusable element on pages with repeated navigation.

## 2. Keyboard and focus

1. Everything that works with a mouse works with the keyboard: Tab/Shift+Tab to move, Enter/Space to activate, Escape to close, arrow keys inside composite widgets (tabs, menus, listboxes, radio groups).
2. Tab order follows visual order. Never use positive `tabindex`. Use `tabindex="0"` only on custom interactive elements, `tabindex="-1"` for elements you focus from script.
3. Focus is always visible. Never `outline: none` without a replacement; prefer `:focus-visible` styles with at least 3:1 contrast against the background.
4. Focused elements must not be fully hidden by sticky headers, cookie banners or chat widgets (WCAG 2.4.11). Use `scroll-padding-top` for sticky headers.
5. Focus management in dynamic UI:
   - Opening a dialog moves focus into it; Tab stays inside; Escape closes; closing returns focus to the trigger.
   - After client-side route changes, move focus to the new page's `<h1>` (or main) and update `<title>`.
   - When an item is deleted, move focus to a sensible neighbour, not `<body>`.
6. No keyboard traps, no actions that fire on focus alone.

## 3. ARIA only when needed

Rules, in order:
1. No ARIA is better than wrong ARIA. Don't add `role="button"` to a `<button>`.
2. If you build a custom widget, follow the matching WAI-ARIA Authoring Practices pattern completely: role, states (`aria-expanded`, `aria-selected`, `aria-checked`), keyboard model, and focus handling.
3. Names: prefer visible text or `<label>`; then `aria-labelledby`; `aria-label` last. The accessible name must contain the visible label text (WCAG 2.5.3).
4. Live updates (toasts, async results, form status): an `aria-live="polite"` region (or `role="status"`) that exists in the DOM **before** the message is inserted. Use `role="alert"` only for urgent errors.
5. `aria-hidden="true"` never on focusable elements or their ancestors. Use `inert` to disable background content behind a non-native modal.

## 4. Forms and errors

- Every input has a programmatic label: `<label for>` or wrapping `<label>`. Placeholder is not a label.
- Group related controls (radios, checkboxes, address parts) in `<fieldset>` with `<legend>`.
- Use correct `type` and `autocomplete` tokens (`email`, `tel`, `given-name`, `current-password`, `one-time-code`) so browsers and password managers can fill fields.
- Mark required fields in text or with a visible symbol explained on the page, plus `required` or `aria-required="true"`.
- Errors:
  1. Show the error text next to the field, linked with `aria-describedby`; set `aria-invalid="true"`.
  2. Say what is wrong and how to fix it ("Enter a date like 31/12/2026"), not just "Invalid".
  3. On submit with errors, move focus to the first invalid field or to an error summary that links to each field.
  4. Never rely on colour alone (add an icon or text).
- Don't ask again for information the user already entered in the same flow; prefill or offer to reuse it (3.3.7).
- Login must not require a cognitive test such as solving a puzzle or transcribing characters unless there is an alternative; allow paste and password managers (3.3.8).

## 5. Visual: contrast, size, zoom, motion

- Text contrast at least 4.5:1; large text (at least 24px, or 18.66px bold) at least 3:1.
- UI component boundaries, focus indicators, icons and chart lines that carry meaning: at least 3:1 against adjacent colours.
- Pointer targets at least 24×24 CSS px, or enough spacing that a 24px circle around each does not overlap another (2.5.8). Inline links in sentences are exempt.
- Content reflows at 320 CSS px wide (400% zoom) without two-dimensional scrolling; text resizes to 200% without loss. Use relative units and avoid fixed heights on text containers.
- Respect `prefers-reduced-motion`: disable parallax, autoplay and large transitions. Anything that moves for more than 5 seconds needs pause/stop.
- Dragging (sliders, sortable lists, maps) needs a single-pointer alternative such as buttons or inputs (2.5.7).
- Check both light and dark themes, and hover, focus, disabled and error states.

## 6. Test

Run all three; automated tools catch only part of the problems.

1. **Automated**: run the project's a11y lint, then axe against rendered pages or components. Example with Playwright:
   ```ts
   import AxeBuilder from '@axe-core/playwright';
   const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
   expect(results.violations).toEqual([]);
   ```
   Lighthouse's accessibility category also runs axe rules.
2. **Keyboard pass**: unplug the mouse. Tab through the changed flow end to end. Check visible focus, order, traps, Escape, and return focus.
3. **Screen reader pass** on the changed flow: VoiceOver (macOS/iOS), NVDA (Windows, free) or TalkBack (Android). Check names, roles, states, headings list, landmarks, and that errors and status messages are announced.
4. Zoom to 200% and 400%, and check at 320px width.

If you cannot run a screen reader in this environment, say so in the report; don't claim it passed.

## Never

- Never remove focus outlines without a visible replacement.
- Never hide content from assistive tech that sighted users get, or the reverse, unless it is purely decorative.
- Never disable zoom (`user-scalable=no`, `maximum-scale=1`).
- Never add an accessibility overlay script as the fix.
- Never claim "WCAG compliant" from an automated scan alone.

## Report back

```
Changed: <files and components>
Fixed:   <WCAG criterion> — <what was wrong> → <what changed>   (one line each)
Checks:  axe <n violations before → after>, keyboard pass <done/not done>, screen reader <which one / not run>
Open:    <issues needing design or product decisions>
```
