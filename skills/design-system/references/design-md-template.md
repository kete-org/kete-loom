# DESIGN.md template

DESIGN.md is the source of truth that later UI work reads first. Keep it short enough to read every time (aim for under 150 lines); tables over prose. Values live in the token files; DESIGN.md says where they are and why they were chosen.

````markdown
# <Product> design system

Read this before building or changing UI. A page file in design/pages/<page>.md overrides it for that page.

## Direction
<6-8 lines: who it's for, the feeling, the one signature detail. Tag each choice [project], [table] or [default].>
Dials: density <n>, expressiveness <n>, motion <n>.

## Where the tokens live
| Layer | File | Notes |
|---|---|---|
| Primitive | src/styles/tokens.css | ramps, spacing, type sizes |
| Semantic | src/styles/tokens.css (:root and .dark) | components use only these |
| Component | src/components/ui/*.tsx (cva variants) | only where needed |

## Colour
| Token | Light | Dark | Use |
|---|---|---|---|
| --color-bg | gray-50 | gray-950 | page background |
| --color-text | gray-900 | gray-50 | body text |
| ... | | | |

Contrast (scripts/contrast.js, <date>): light <n>/<n> pass, dark <n>/<n> pass. Exceptions: <none, or which pair and why>.

## Type
| Role | Size / line height | Weight | Font |
|---|---|---|---|
| body | 1rem / 1.5 | 400 | Inter |
| ... | | | |

## Space, shape, elevation, layers
Spacing steps: <list>. Radius: <sm/md/full>. Elevation: <levels>. Z-index: <layers>. Breakpoints: <list>.

## Components
| Component | Variants | States designed | Notes |
|---|---|---|---|
| Button | primary, secondary, ghost, danger; sm, md | hover, pressed, focus-visible, disabled, loading | one primary per view |
| ... | | | |

## Rules
Do: <3-6 rules, e.g. "status colour always paired with an icon or text">
Don't: <3-6 rules, e.g. "no raw hex in components", "no new font sizes">

## Changes
| Date | Change | Why |
|---|---|---|
````

## Page override (design/pages/<page>.md)

```markdown
# <Page> overrides
Overrides DESIGN.md for this page only. Everything not listed here follows DESIGN.md.

| What | DESIGN.md | Here | Why |
|---|---|---|---|
| Density | 5 | 8 | data table with 50+ rows |
```

## Retrieval rule (copy into AGENTS.md or CLAUDE.md)

```
Before building or changing UI, read DESIGN.md, then design/pages/<page>.md if it exists (it wins for that page).
Use only its tokens; propose a DESIGN.md change instead of adding a one-off value.
```
