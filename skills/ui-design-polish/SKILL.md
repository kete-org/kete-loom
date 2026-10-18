---
name: ui-design-polish
description: Visual design direction and design-engineering finish for product UI - choosing a deliberate aesthetic instead of template defaults, then applying a spacing scale, a modular type scale, semantic colour tokens, hover, focus, active and disabled states, optical alignment, and real empty, loading and error states; also inventories an existing codebase's ad-hoc colours, sizes and components into a design-system audit. Use when a screen looks generic, unfinished or inconsistent, someone asks to make the UI look better or more professional, or wants the de facto design system extracted from scattered styles.
license: MIT
compatibility: Any Agent Skills host. Works with plain CSS, CSS Modules, Tailwind or CSS-in-JS. Running the app and a browser for screenshots helps but is optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# UI design polish

Make an interface look intended. Two jobs: pick a visual direction and hold it, then sweat the details that separate "works" from "finished". Most "it looks off" complaints are inconsistent spacing, too many font sizes, unmanaged colour and missing states, not a lack of decoration.

Neighbours: `css-architecture` decides how styles are organised (layers, naming, theming plumbing); `web-accessibility` owns WCAG conformance; `ui-motion` owns animation. This skill decides what things look like.

## 0. Before you start

1. Ask, or infer from the product, three things: **who uses it**, **the tone** (calm and dense for a tool, warm for consumer, editorial for content), and **constraints** (existing brand, component library, dark mode). If there is a brand guide or design file, it wins; **stop and ask** before overriding it.
2. Find the current styling approach and any token file (`tokens.css`, `theme.ts`, `tailwind.config.*` `theme.extend`, CSS custom properties on `:root`). Polish goes through tokens, not one-off values.
3. Look at the real screens. Run the app if you can and capture the screens you will change, at mobile and desktop widths, before touching anything.

## 1. Choose a direction (new UI or redesign)

Write the direction down in 4-6 lines before coding, for example:

```
Direction: quiet utility. Neutral warm greys, one accent (teal 600) used only for primary actions and focus.
Type: one sans (system stack or Inter), 4 sizes; weight carries hierarchy, not colour.
Density: compact, 4px base grid, 8/12/16/24/32 spacing.
Shape: 6px radius on controls, 10px on cards; borders over shadows.
Signature: tabular numbers and a thin top rule on section headers.
```

Rules:

- One accent colour, used sparingly. If everything is highlighted, nothing is.
- Pick one signature detail and repeat it; do not add five.
- Avoid the template look: centred hero with gradient blob, three equal cards with icons, purple-to-blue gradients, everything rounded-2xl with a drop shadow. Use them only if the brief asks.
- Restraint beats decoration. Remove before adding.

## 2. Foundations as tokens

Set these up (or tighten the existing ones). Value tables and naming in `references/tokens.md`.

- **Spacing**: a scale on a 4px or 8px base. Every margin, padding and gap uses it. Related things sit closer together than unrelated things.
- **Type**: 4-6 sizes from a ratio (1.2-1.25 for dense UI, up to 1.333 for marketing). Body 16px on the web, line-height 1.4-1.6 for body and 1.1-1.25 for headings, measure 60-75 characters.
- **Colour**: raw palette (`--gray-50`...`--gray-950`, one accent ramp, red/amber/green for status) mapped to **semantic** tokens (`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-accent`, `--color-danger`). Components only use semantic tokens. Dark mode redefines the semantic layer.
- **Radius, border, shadow, z-index**: 2-3 values each.

Check text contrast against WCAG AA (4.5:1 body, 3:1 large text and UI component boundaries) as you choose colours.

## 3. Interactive states

Every control needs all of these, designed, not browser defaults left by accident:

| State | Rule |
|---|---|
| Default | Clear affordance: a button looks pressable, a link looks like a link |
| Hover | Subtle shift (background one step on the ramp); only on `@media (hover: hover)` devices |
| Focus-visible | A visible ring (`:focus-visible`, 2px outline with offset, accent or high-contrast colour). Never `outline: none` without a replacement |
| Active / pressed | Slightly darker or inset; immediate |
| Disabled | Reduced contrast plus `cursor: not-allowed`; still readable; explain why nearby if it is not obvious |
| Loading | Keep the button's width; spinner or label change; block double submit |
| Selected / current | Distinct from hover (`aria-current`, `aria-selected` styled) |
| Invalid | Border and message in danger colour plus an icon or text, never colour alone |

## 4. Screen states

For each data-driven view, design: **loading** (skeleton matching the final layout, not a page-centre spinner, for waits over ~300ms), **empty** (what this is, why it is empty, the one action that fills it), **error** (what happened in plain words, what to do, a retry), **partial** (some items failed), and **overflow** (long names, 0 / 1 / 1,000 items, missing images). Write the copy too.

## 5. Detail pass

Go through `references/detail-checklist.md` on each changed screen. The highest-yield items:

- Align to a grid; left edges line up across sections.
- Optical alignment: icons next to text are centred on the text's x-height or cap height, not the box; play icons nudge right; round shapes overshoot squares slightly.
- Tabular numbers (`font-variant-numeric: tabular-nums`) in tables, prices and timers.
- Consistent icon set, size and stroke weight.
- No orphaned single words in headings where `text-wrap: balance` can fix it.
- Hit targets at least 24x24 CSS px (44x44 on touch-first screens).

## 6. Design-system audit (existing codebase)

When asked to extract or audit the design system:

1. Search the styles for raw values: hex/rgb/hsl colours, `px`/`rem` font sizes, spacing values, radii, shadows, z-indexes, breakpoints. Count each distinct value and where it is used.
2. Cluster near-duplicates (`#1f2937` vs `#1e293b`, `14px` vs `0.875rem` vs `13.5px`).
3. Propose the token set: the clusters that survive, with a mapping from each old value to its token.
4. Inventory components: list every button, input, card and modal variant found, with file paths, and mark duplicates.
5. Report with the format below. **Stop and ask** before a mass find-and-replace; do it per component or per page so diffs stay reviewable.

## Never

- Never introduce a new colour, size or spacing value that is not a token.
- Never remove focus styles, or rely on colour alone for meaning.
- Never restyle a brand's logo, colours or fonts without the owner's approval.
- Never ship a visual change you have not looked at in a rendered page at mobile and desktop widths, in light and dark if both exist.

## Report back

```
## UI polish: <screen or scope>
Direction: <the 4-6 line direction, or "kept existing">
Tokens added/changed: <list>
Changes: <file: what changed and why, one line each>
States covered: <loading / empty / error / hover / focus / disabled per component>
Before/after: <screenshot paths, or "not captured">
Audit (if run): <N colours -> M tokens, N font sizes -> M, duplicate components found>
Left for later: <items and why>
```
