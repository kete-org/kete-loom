---
name: design-system
description: Creates or extends a product's design system from its context (product category, users, platform, brand and frontend stack). It recommends a visual direction with the reason for each choice and explicit density, expressiveness and motion dials, then builds primitive, semantic and component tokens for colour, type, spacing, radius, elevation, breakpoints and motion in light and dark themes. The tokens are wired into the stack (CSS variables, Tailwind, shadcn/ui, MUI, React Native, Flutter, SwiftUI, Compose), every colour pair is checked with a bundled contrast script, and the result is recorded in a DESIGN.md with per-page overrides that later UI work reads first. Use when starting the UI of a new product or page, choosing colours, fonts and spacing for an app, setting up, extending or theming design tokens, adding dark mode to a token set, or when generated screens keep drifting apart and need one source of truth.
license: MIT
compatibility: Any Agent Skills host. The bundled scripts need Node 18+ and no packages. Works with any stack that can read CSS variables or a theme object; a browser for rendered checks helps but is optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Design system

Produce one coherent, written-down set of design decisions that every screen draws from. A design system here is three things: a **direction** with reasons, **tokens** in the project's own stack, and a **DESIGN.md** that later work reads before building UI.

Neighbours: `ui-design-polish` finishes individual screens (states, alignment, detail); `css-architecture` organises the stylesheet plumbing; `web-accessibility` and `mobile-accessibility` own conformance; `ui-motion` builds animation; `brand-strategy` decides positioning before any of this. This skill decides the system they all use.

The scripts live in this skill's `scripts/` folder. Run them by their full path from the project root, for example `node <skill-dir>/scripts/contrast.js`.

## 0. Pick the mode

| Situation | Mode | Rule |
|---|---|---|
| No UI yet, or the user asked for a new look | **New** | Steps 1-7 |
| Existing app, add or change screens | **Preserve** | Extract the system that exists (step 1b), extend it, and keep its visual language. Redesign only when asked |
| A DESIGN.md exists | **Extend** | Read it first; it wins over this skill's defaults. Change it only through step 6 |

If a brand guide, design file (Figma) or existing DESIGN.md disagrees with something below, they win. **Stop and ask** before overriding brand colours, fonts or a logo.

## 1. Context brief

Write six lines before choosing anything, from the request, the repo and the user. Ask only for what you cannot find:

```
Product: <category from references/product-directions.md, or the nearest two>
Users: <who, how often, in what setting; accessibility needs such as older users, low vision, one-handed use>
Platform: <web desktop-first / web mobile-first / iOS / Android / cross-platform / desktop app>
Brand: <existing colours, fonts, logo, tone; or "none">
Goal: <the one outcome the UI must serve: convert, monitor, complete a task fast, browse, trust>
Stack: <detected, never assumed>
```

**1a. Detect the stack** from files, not guesses: `package.json` dependencies (react, next, vue, nuxt, svelte, @angular/core, tailwindcss, @mui/material, react-native, expo), `components.json` (shadcn/ui), `tailwind.config.*` or `@import "tailwindcss"` (Tailwind 3 vs 4), `pubspec.yaml` (Flutter), `Package.swift` or `*.xcodeproj` (SwiftUI/UIKit), `build.gradle*` with Compose. If nothing is detectable and it matters, ask.

**1b. Preserve mode: extract first.** Run the audit and read its output before proposing anything:

```bash
node <skill-dir>/scripts/token-audit.js src        # or the UI folder; add --json for machine output
```

It lists every raw colour, font size, spacing value, radius, shadow and z-index with counts and locations, and groups near-duplicate colours. Also read any token files it doesn't count (`tokens.css`, `theme.ts`, `tailwind.config.*`, `globals.css`, `ThemeData`, asset catalogs). The existing system is the most-used values; propose tokens that keep them.

## 2. Recommend a direction

1. Find the product's category in `references/product-directions.md` and read **only that row** and its notes (two rows for a hybrid). It gives a layout pattern, a visual direction, colour mood with a checked accent, a type pairing, default dials and what to avoid.
2. Adjust for the brief: users and accessibility needs, platform conventions (iOS Human Interface Guidelines, Material 3), the brand, and the goal.
3. Set the three dials, 1-10, and say why:

| Dial | Low | High | Moves |
|---|---|---|---|
| Density | spacious, 24-96px rhythm, large type | dense, 4-32px rhythm, 14px tables | spacing scale, type sizes, control heights |
| Expressiveness | quiet, one accent, borders over shadows | bold, asymmetric layout, larger display type, more colour | layout, type scale ratio, colour use |
| Motion | feedback only (100-200ms) | choreographed entrances and transitions | motion tokens (`ui-motion` builds them) |

4. Write the direction in 6-8 lines, tagging each decision with its source: `[project]` (found in the repo or brand), `[table]` (the product-directions row), `[default]` (this skill's general default). Never present a default as if it came from evidence.
5. When there's no brand and the choice matters, offer **two directions** with a trade-off table (usability, aesthetics, accessibility risk, build effort, performance) and a recommendation. Mockups: `design-brainstorming` (its `design-brainstorming/references/visual-mockups.md`).

## 3. Build the tokens

Three layers (scales and naming in `references/token-scales.md`):

- **Primitive**: raw values with no meaning. Neutral ramp 50-950, one accent ramp, status hues, the spacing scale, type sizes, radii, shadows, durations.
- **Semantic**: purpose names that components use: `bg`, `surface`, `surface-raised`, `text`, `text-muted`, `border`, `border-strong`, `accent`, `on-accent`, `accent-hover`, `focus-ring`, `danger`, `on-danger`, `success`, `warning`, `info`, plus type roles (`display`, `heading`, `body`, `label`, `caption`, `code`). **Dark mode redefines this layer only.**
- **Component**: only where a component needs a value that differs from the semantic layer (`button-height-sm`, `input-border`, `card-padding`). Don't create one per component by reflex.

Also define: breakpoints (or container-query widths), control heights per density, z-index layers, and states (hover, pressed, focus-visible, disabled, selected, invalid) as semantic tokens rather than ad-hoc darkening.

Fonts: two families at most (one is often enough), loaded with `font-display: swap` or the platform's equivalent, with a system fallback stack. Respect Dynamic Type and Android font scaling on mobile; use `rem` on the web.

## 4. Check every colour pair

Contrast is checked by running the script, not by eye. List the pairs for **each theme** and run:

```bash
node <skill-dir>/scripts/contrast.js --css src/styles/tokens.css \
  "--color-text/--color-bg" "--color-text-muted/--color-bg" "--color-text/--color-surface" \
  "--color-on-accent/--color-accent" "--color-accent/--color-bg" "--color-on-danger/--color-danger"
node <skill-dir>/scripts/contrast.js --css src/styles/tokens.css --scope .dark "--color-text/--color-bg" ...
node <skill-dir>/scripts/contrast.js --min 3 --css src/styles/tokens.css "--color-border-strong/--color-bg" "--color-focus-ring/--color-bg"
```

- Text and links need 4.5:1 (3:1 for 24px+ or 18.7px+ bold). Input borders, focus rings, icons that carry meaning and chart marks need 3:1 against what is next to them (WCAG 1.4.11).
- It accepts hex, `rgb()`, `hsl()`, `oklch()`, bare shadcn triples and token names; `--scope` selects the dark block (`.dark`, `[data-theme="dark"]` or `@media (prefers-color-scheme: dark) :root`). Exit 1 means a pair is too low.
- Fix a failing pair by moving lightness along the ramp, not by changing the hue the brand chose. Decorative-only `border` may be lower than 3:1 if `border-strong` carries the boundaries that matter; say so in DESIGN.md.
- Dark theme: lighter accent step for text and links, surfaces get lighter as they rise (not shadows), no pure `#000` behind long text.

## 5. Wire it into the stack

Follow the section for the detected stack in `references/stack-wiring.md` (CSS variables, Tailwind 4 `@theme`, Tailwind 3 config, shadcn/ui, MUI, React Native, Flutter, SwiftUI, Jetpack Compose). Put tokens where the stack expects them, reuse the project's theme provider, and don't add a token library or framework the project doesn't already have.

## 6. Record it in DESIGN.md

Write `DESIGN.md` at the repo root (or where the project keeps docs) from `references/design-md-template.md`: direction, dials, token tables with their file locations, contrast results, component rules, do's and don'ts. Page-specific deviations go in `design/pages/<page>.md` and override DESIGN.md for that page only.

- If DESIGN.md exists, read it and show the diff of your changes; **never overwrite it** without the user's approval.
- Add one line to `AGENTS.md` or `CLAUDE.md` if present: "Read DESIGN.md (and design/pages/<page>.md) before building or changing UI."
- Retrieval rule for later work: read DESIGN.md, then the page override if one exists; the override wins for that page; otherwise DESIGN.md wins.

## 7. Prove it

1. Build one representative screen (or the screen the user asked for) using only tokens. The fastest proof is a kitchen-sink page: type roles, buttons in every state, inputs with error, a card, a table row, an alert, in both themes.
2. Re-run `scripts/token-audit.js` on the changed files: no new raw values outside the token files.
3. Re-run `scripts/contrast.js` for both themes; all pairs pass.
4. Look at the rendered result at 375, 768 and 1280px wide (or small phone, large phone and tablet) in light and dark. If you cannot render, say so; don't claim the visual check passed.
5. Hand off finishing to `ui-design-polish`, conformance to `web-accessibility` or `mobile-accessibility`, and a scored review to the `ui-auditor` agent.

## Never

- Never invent brand colours or fonts for a company that has them; ask.
- Never ship a token pair that fails the contrast script, or a theme you have only checked in light mode.
- Never add a raw colour, size or spacing value to a component; add or reuse a token.
- Never overwrite an existing DESIGN.md, token file or theme without reading it and getting approval.
- Never restyle an existing app wholesale in Preserve mode.
- Never present a table default as a researched recommendation, or a generic answer as a match for a specific product.
- Never send private product details or customer data to an external design or font service to get a recommendation.

## Report back

```
## Design system: <product or scope>
Mode: <new | preserve | extend>   Stack: <detected stack and where tokens live>
Direction: <6-8 lines, each tagged [project] / [table] / [default]>
Dials: density <n>, expressiveness <n>, motion <n> - <why>
Tokens: <files added or changed; counts per layer>
Contrast: <n/n pairs pass light, n/n dark; any deliberate exceptions>
Token audit: <raw values before -> after, or "not run">
DESIGN.md: <path, created | updated (diff shown) | unchanged>
Rendered check: <widths and themes viewed, or "not rendered: why">
Next: <ui-design-polish / web-accessibility / ui-auditor hand-offs>
```
