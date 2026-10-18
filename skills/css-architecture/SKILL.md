---
name: css-architecture
description: Organises stylesheets so they stay maintainable as a codebase grows, using design tokens in CSS custom properties, cascade layers to control specificity, grid and flexbox for layout, container queries for component-level responsiveness, one consistent naming or utility-first convention, and token-driven theming including dark mode. Use when setting up or refactoring a project's CSS, introducing a design system or theme, fighting specificity wars and !important, or deciding between BEM, CSS Modules and Tailwind.
license: MIT
compatibility: Any Agent Skills host. Plain CSS, Sass, CSS Modules, Tailwind or CSS-in-JS. Cascade layers and container queries need evergreen browsers; check the project's browser targets.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# CSS architecture

Make the cascade predictable: tokens for values, layers for order, components that style only themselves.

## 0. Before you start

1. Identify the current approach: global CSS, Sass partials, CSS Modules, Tailwind (`tailwind.config.*` or `@import "tailwindcss"`), CSS-in-JS, or a mix. Check `browserslist` or the framework's targets.
2. Keep the approach the project already uses. Changing methodology (for example BEM to Tailwind) is a project decision: **stop and ask the user** before starting one.
3. Look for an existing token file or theme before adding values.

## 1. Design tokens

Three tiers, all as custom properties on `:root`:

```css
:root {
  /* primitives: raw palette and scale, never used directly in components */
  --blue-600: oklch(52% 0.18 255);
  --space-4: 1rem;
  /* semantic: what the value is for; components use these */
  --color-bg: white;
  --color-text: #1a1a1a;
  --color-accent: var(--blue-600);
  --space-gap: var(--space-4);
  --radius-control: 0.375rem;
}
```

- Components reference semantic tokens only, so theming changes one place.
- Scales, not one-offs: spacing, type sizes, radii, shadows, z-index each have a short named scale. A new raw value in a component is a review flag.
- Use `rem` for type and spacing so user font size settings apply; `clamp()` for fluid type (`font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem)`).
- If the design team exports tokens (Figma, Tokens Studio, Style Dictionary), generate the CSS from that source instead of hand-editing.
- In Tailwind v4, define tokens with `@theme { --color-accent: ...; }`; in v3, in `theme.extend` in `tailwind.config.js`. Check which version the project runs.

## 2. Cascade layers

Declare the order once, at the top of the entry stylesheet:

```css
@layer reset, vendor, tokens, base, layout, components, utilities, overrides;
@import url("vendor.css") layer(vendor);
```

- Later layers win regardless of selector specificity, so utilities beat components without `!important`.
- Unlayered styles beat all layers, so put third-party CSS in a layer named early in the order statement. A layer not named there is appended last and beats everything before it.
- `@import` must come before every other rule except `@layer` order statements, or the browser ignores it.
- `!important` inside a layer reverses the order (earlier layers' important rules win). Avoid `!important` except in `utilities` that must always apply, such as `.visually-hidden`.

## 3. Selectors and naming

Pick one convention per project and apply it everywhere:

| Approach | Use when | Rules |
|---|---|---|
| BEM (`.card`, `.card__title`, `.card--featured`) | global CSS or Sass | one class per selector, no element or ID selectors in components, max one level of nesting |
| CSS Modules / scoped styles (Vue `scoped`, Svelte, Angular) | component frameworks | class names local by default; share through tokens, not `:global` |
| Utility-first (Tailwind) | team already uses it | extract a component (not `@apply` soup) when a class list repeats; keep tokens in the theme |

General rules:
- Keep specificity flat: one class. Avoid IDs and `#id .x .y div` chains.
- Use `:where()` to zero out specificity in base and reset styles; `:is()` keeps the highest.
- Native nesting is fine for states and children, but no deeper than two levels.
- Style states with attributes the markup already has: `[aria-expanded="true"]`, `[aria-current="page"]`, `:disabled`, `[data-state="open"]`.
- Components never set their own outer margin or position on the page; the parent layout does.

## 4. Layout

Decision rule: two dimensions (rows and columns) → grid. One dimension (a row of items) → flexbox.

- Responsive grid without media queries: `grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));`
- Spacing between children: `gap`, not margins on children.
- Use logical properties (`margin-inline`, `padding-block`, `inset-inline-start`) so RTL layouts work.
- Avoid fixed heights on content; use `min-height` and let text wrap.
- `subgrid` for aligning nested card contents across a row, where browser targets allow.

## 5. Container queries vs media queries

- Media queries for page-level layout (sidebar collapses, navigation changes) and user preferences (`prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`).
- Container queries for components that live in slots of different widths:

```css
.card-list { container-type: inline-size; container-name: cards; }
@container cards (min-width: 40rem) {
  .card { grid-template-columns: 12rem 1fr; }
}
```

- An element cannot query its own size: set `container-type` on a wrapper and style the children. `inline-size` containment also stops the container sizing to its content's width, so don't put it on shrink-to-fit elements.
- Container query units (`cqi`) for type that scales with the container.

## 6. Theming and dark mode

1. Themes only redefine semantic tokens; components don't change.
2. Respect the OS by default and allow an explicit override:

```css
:root { color-scheme: light dark; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --color-bg: #121212; --color-text: #e8e8e8; }
}
:root[data-theme="dark"] { --color-bg: #121212; --color-text: #e8e8e8; }
```

3. `light-dark(var(--a), var(--b))` is a shorter option where browser targets support it.
4. Set the theme attribute before first paint (inline script in `<head>` reading the saved choice) to avoid a flash of the wrong theme.
5. Check text and UI contrast in every theme (4.5:1 for text, 3:1 for UI parts). Dark mode is not inverted colours: lower elevation surfaces are darker, avoid pure black behind large text blocks.

## 7. Refactoring existing CSS

1. Find unused and duplicate rules (Coverage panel in Chrome DevTools, search for class usage in the codebase). Remove only what search proves unused; dynamic class names (`"btn-" + size`) need a manual check.
2. Replace repeated raw values with tokens, one token group per change.
3. Introduce layers by wrapping existing files in the layer that matches their role, then delete the `!important` and specificity hacks they made unnecessary.
4. After each step, compare key pages visually (screenshot diff or manual check in both themes and at mobile and desktop widths).

## Never

- Never add `!important` to win a specificity fight; fix the layer or selector.
- Never hard-code colours or spacing inside components when a token exists.
- Never style by DOM structure (`.sidebar > div > ul li a`).
- Never remove `:focus-visible` styles or set `outline: none` without a replacement.
- Never mix two naming methodologies in new code.

## Report back

```
Approach:  <methodology and tooling found/kept>
Changes:   <file> — <tokens/layers/layout/theme change>   (one line each)
Removed:   <rules or !important count removed>
Checked:   <pages, widths and themes compared>
Decisions needed: <anything that changes the methodology or design>
```
