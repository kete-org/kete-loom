---
name: design-ui
description: Design and build a UI end to end from product context: detect the stack and existing design system, agree a direction, create or extend the tokens and DESIGN.md, build the screens from them, then check contrast, accessibility, responsiveness and visual quality, stopping for approval between stages.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<the product, page or screens to design>"
  kete-loom/owner: "Kete-org"
---

Design and build the UI below in stages. Stop after each stage, show the result, and wait for the user before starting the next. Skills and agents named here do the work; if one isn't installed, follow the same step yourself and say so.

1. **Context.** Write the six-line brief from the `design-system` skill (product, users, platform, brand, goal, stack). Detect the stack from the repo. Look for `DESIGN.md`, `design/pages/`, token or theme files and brand assets. Say which mode applies: new, preserve (an existing look you must keep) or extend (a DESIGN.md exists). Ask only for what you cannot find.
2. **Direction.** New or redesign: follow the `design-system` skill's step 2 (product category row, dials, reasons tagged `[project]`, `[table]` or `[default]`). When there's no brand and the choice matters, offer two directions with trade-offs; use the `design-brainstorming` skill's mockups if the user wants to see them. Preserve or extend: summarise the existing system instead (run `token-audit.js` in preserve mode) and confirm it.
3. **System.** Create or extend the tokens in the project's stack and write or update `DESIGN.md` (show the diff of an existing one before saving). Run the `design-system` skill's `contrast.js` on every pair in both themes; nothing ships below 4.5:1 for text or 3:1 for UI boundaries.
4. **Build.** Implement the screens from the tokens only, with the framework skill for the stack (`react-patterns`, `nextjs-patterns`, `vue-patterns`, `svelte-patterns`, `angular-patterns`, `flutter-patterns`, `swiftui-patterns`, `jetpack-compose-patterns`, `react-native-patterns`) and the project's existing components first. Use semantic HTML or native controls. Design loading, empty, error and long-content states with `ui-design-polish`; add motion only through `ui-motion`. Add component or story tests where the project has them.
5. **Check.** Run, and report each result:
   - `token-audit.js` on the changed files: no new raw values outside token files.
   - `contrast.js` for both themes.
   - The project's type check, lint, tests and build (`/verify` or the `verification-loop` skill).
   - Accessibility: the `accessibility-reviewer` agent (or the `web-accessibility` / `mobile-accessibility` skill), plus axe in tests if the project has it.
   - Rendered check at 375, 768 and 1280px (or small phone, large phone, tablet), in light and dark: with a browser tool or Playwright screenshots if available. If you can't render, say "not rendered" rather than claiming it looks right.
6. **Review.** Run the `ui-auditor` agent for a scored visual review against `DESIGN.md`. Fix what is in scope and list the rest.

Finish with: the direction (or "kept existing"), tokens and DESIGN.md changes, screens built, each check with pass, fail or "not run", and what's left. Don't commit unless the user asks.

UI: $ARGUMENTS
