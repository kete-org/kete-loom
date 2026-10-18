# Token starting points

Adjust to the direction; these are defaults, not rules.

## Spacing (4px base)

| Token | px | Typical use |
|---|---|---|
| `--space-1` | 4 | icon-to-label gap |
| `--space-2` | 8 | inside compact controls, tight stacks |
| `--space-3` | 12 | control padding, list item gap |
| `--space-4` | 16 | card padding (dense), form field gap |
| `--space-6` | 24 | card padding, group gap |
| `--space-8` | 32 | section gap |
| `--space-12` | 48 | page section gap |
| `--space-16` | 64 | hero / marketing sections |

Tailwind's default spacing scale is already 0.25rem steps; use it rather than arbitrary `p-[13px]` values.

## Type scale (ratio 1.25, base 16px)

| Token | rem | px | Use |
|---|---|---|---|
| `--text-xs` | 0.75 | 12 | captions, badges (avoid for body) |
| `--text-sm` | 0.875 | 14 | secondary text, dense tables |
| `--text-base` | 1 | 16 | body |
| `--text-lg` | 1.25 | 20 | card titles |
| `--text-xl` | 1.563 | 25 | page titles |
| `--text-2xl` | 1.953 | 31 | hero / display |

Use `rem` so user font-size settings apply. For fluid headings, `clamp(1.5rem, 1rem + 2vw, 2.5rem)`; keep body text fixed.

Weights: 400 body, 500-600 labels and buttons, 600-700 headings. Two or three weights per family.

## Colour: palette to semantic layer

```css
:root {
  /* palette */
  --gray-50: #f8f8f7; --gray-100: #efeeec; --gray-200: #dddbd7; --gray-500: #79756e;
  --gray-700: #45423d; --gray-900: #1d1c1a;
  --teal-600: #0d7c74; --teal-700: #0a645e;
  --red-600: #c4321f; --amber-600: #b26b00; --green-600: #2f7d32;

  /* semantic */
  --color-bg: var(--gray-50);
  --color-surface: #fff;
  --color-text: var(--gray-900);
  --color-text-muted: var(--gray-700);
  --color-border: var(--gray-200);
  --color-accent: var(--teal-600);
  --color-accent-hover: var(--teal-700);
  --color-danger: var(--red-600);
}
@media (prefers-color-scheme: dark) {
  :root { --color-bg: var(--gray-900); --color-surface: #262522; --color-text: var(--gray-50); /* ... */ }
}
```

These hex values are illustrative; check each text/background pair with a contrast checker before use. `oklch()` makes even lightness steps easier to build when the project's browser targets support it.

Dark mode is not inverted light mode: lower the surface contrast, desaturate the accent slightly, and use lighter surfaces (not shadows) for elevation.

## Radius, shadow, z-index

- Radius: `--radius-sm` 4px (inputs, tags), `--radius-md` 8px (buttons, cards), `--radius-full` 9999px (pills, avatars). Nested radius = outer radius minus padding.
- Shadow: `--shadow-sm` for raised controls, `--shadow-lg` for popovers and dialogs only.
- Z-index: named layers (`--z-dropdown: 10; --z-sticky: 20; --z-overlay: 30; --z-modal: 40; --z-toast: 50`), never `9999`.
