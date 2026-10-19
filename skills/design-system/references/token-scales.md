# Token scales and naming

Defaults by dial. Adjust to the direction; when the project already has values, keep them and fit these names around them.

## Naming

- Primitive: `--{kind}-{scale}`: `--gray-500`, `--blue-600`, `--space-4`, `--text-lg`, `--radius-md`, `--shadow-2`, `--duration-fast`.
- Semantic: `--color-{role}`: `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-border-strong`, `--color-accent`, `--color-on-accent`, `--color-accent-hover`, `--color-focus-ring`, `--color-danger`, `--color-on-danger`, `--color-success`, `--color-warning`, `--color-info`.
- Component: `--{component}-{property}[-{variant}]`: `--button-height-sm`, `--input-border`, `--card-padding`.
- In shadcn/ui projects use its names instead (`--background`/`--foreground`, `--primary`/`--primary-foreground`, `--muted-foreground`, `--border`, `--ring`, `--destructive`); see `stack-wiring.md`.

Every `on-*` (or `*-foreground`) token is paired with its background and checked together.

## Spacing by density dial

Base unit 4px. Pick the rhythm, then use only those steps.

| Density | Steps used (px) | Control height (sm / md / lg) | Body text |
|---|---|---|---|
| 1-3 spacious | 8, 16, 24, 32, 48, 64, 96 | 36 / 44 / 52 | 16-18px |
| 4-7 standard | 4, 8, 12, 16, 24, 32, 48, 64 | 32 / 40 / 48 | 16px |
| 8-10 dense | 4, 8, 12, 16, 20, 24, 32 | 28 / 32 / 40 | 14px in tables, 16px elsewhere |

Touch-first screens keep 44x44pt / 48x48dp targets at every density: density changes spacing around controls, not the hit area.

## Type scale by expressiveness dial

| Expressiveness | Ratio | Sizes from a 16px base (rem) |
|---|---|---|
| 1-3 | 1.125-1.2 | 0.75, 0.875, 1, 1.125, 1.25, 1.5 |
| 4-7 | 1.25 | 0.75, 0.875, 1, 1.25, 1.563, 1.953, 2.441 |
| 8-10 | 1.333-1.5 | 0.875, 1, 1.333, 1.777, 2.369, 3.157, plus a fluid display `clamp(2.5rem, 1.5rem + 4vw, 4.5rem)` |

Roles map onto sizes: `caption`, `label`, `body`, `body-lg`, `heading-sm/md/lg`, `display`. Line height 1.5 for body, 1.1-1.3 for headings; measure 60-75 characters; weights 400/500/600 (add 700 only for display). Use `font-variant-numeric: tabular-nums` for figures.

## Colour ramps

- Neutral 50-950 (11 steps) and one accent ramp; status hues (red, amber, green, blue) need about three steps each (subtle background, border or icon, text).
- Build ramps in `oklch()` where the targets support it: even lightness steps make contrast predictable. Otherwise use HSL or hex and check every pair with `scripts/contrast.js`.
- Typical light mapping: `bg` 50, `surface` white, `border` 200, `border-strong` 400-500, `text-muted` 600, `text` 900, `accent` 600, `accent-hover` 700.
- Typical dark mapping: `bg` 950, `surface` 900, `surface-raised` 800, `border` 800, `border-strong` 600, `text-muted` 400, `text` 50, `accent` 400 (as text) or 500 with dark `on-accent` (as fill). Check both.

## Radius, elevation, layers

- Radius: 3 values (`sm` 4px controls and tags, `md` 8px buttons and cards, `full` pills and avatars). Expressiveness 8+ may add `lg` 16px. Nested radius = outer radius minus padding.
- Elevation: 3 levels (`raised` cards on hover, `overlay` menus and popovers, `modal` dialogs). In dark themes express elevation with a lighter surface, not a stronger shadow.
- Z-index layers: `dropdown` 10, `sticky` 20, `overlay` 30, `modal` 40, `toast` 50. Never 9999.

## Breakpoints

Mobile-first. Defaults that match Tailwind: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. Prefer container queries for components that live in different-width slots. Test at 375px (small phone) as the floor; no horizontal scroll at 320px CSS width (WCAG 1.4.10 reflow).

## Motion

Durations `instant` 100ms, `fast` 150-200ms, `normal` 250-300ms, `slow` 400-500ms; exits about 20% faster than entrances; one standard easing and one emphasised easing. The motion dial decides how many of these are used. `ui-motion` owns the build and the reduced-motion rules.
