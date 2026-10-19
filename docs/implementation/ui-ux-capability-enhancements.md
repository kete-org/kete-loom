# UI/UX capability enhancements

What was built from the UI/UX Pro Max review. Reference `56ea9cf` (MIT); ideas adapted, no text or data copied.

## New

| Item | Files | What it does |
|---|---|---|
| `design-system` skill 0.1.0 | `skills/design-system/SKILL.md` (141 lines), `references/product-directions.md`, `references/token-scales.md`, `references/stack-wiring.md`, `references/design-md-template.md`, `evals/triggers.json`, `evals/behavior.json` | Modes (new, preserve, extend); six-line context brief; stack detected from files; direction from a 24-row product-category table with density, expressiveness and motion dials and source-tagged reasons; primitive, semantic and component tokens; contrast checked by script; wiring for CSS, Tailwind 4 and 3, shadcn/ui, MUI, React Native, Flutter, SwiftUI and Compose; DESIGN.md with page overrides and a retrieval rule |
| `contrast.js` | `skills/design-system/scripts/contrast.js` | WCAG ratios for `fg/bg` pairs: hex (3/4/6/8), `rgb()`, `hsl()`, `oklch()`, bare shadcn HSL triples, `white`/`black`; translucent colours composited; token pairs from a CSS file with `var()` chains and fallbacks; `--scope` for `.dark`, `[data-theme]` or `@media` blocks; `--min`, `--json`; exit 0, 1 or 2 |
| `token-audit.js` | `skills/design-system/scripts/token-audit.js` | Raw colours, font sizes, spacing, radii, shadows and z-indexes across CSS, preprocessors, JS/TS, Vue, Svelte, Astro, HTML, PHP, Dart, Swift and Kotlin, including Tailwind arbitrary values; skips custom-property definitions, vendor and build folders; near-duplicate colour clusters; Markdown or `--json`; warns when nothing was scanned |
| `/design-ui` command 0.1.0 | `commands/design-ui.md` | Staged, approval-gated flow: context → direction → system → build → checks → scored review, using existing skills and agents |
| `design` profile | `profiles.json` | `core` plus `design-system`, `ui-design-polish`, `css-architecture`, `web-accessibility`, `mobile-accessibility`, `ui-motion`, `ui-flow-audit`, `design-brainstorming`, `browser-qa`, agents `ui-auditor` and `accessibility-reviewer`, and `/design-ui` |

## Enhanced

| Item | Version | Change |
|---|---|---|
| `ui-design-polish` | 0.1.0 → 0.2.0 | Hands system creation to `design-system`; reads DESIGN.md and page overrides first; contrast and audit through the scripts; one icon family, no emoji icons |
| `ui-design-polish/references/detail-checklist.md` | (with the skill) | Ordered by severity; dark theme checked on its own; scrims; sticky UI not covering focus or content; safe areas; pressed and loading states without layout shift |
| `ui-auditor` agent | 0.1.1 → 0.2.0 | Uses `token-audit.js` and `contrast.js` for exact evidence when installed; system work routed to `design-system` |
| `metrics-dashboards` | 0.1.0 → 0.1.1 | Charts readable without sight: text takeaway, data table or CSV, shape and dash encodings, colour-blind-safe 3:1 marks, keyboard tooltips |

## Documentation

- `README.md` and the eight translations: `design` row in the profile table; source hash updated (`bf5e69b8f944`). Catalog tables, counts and `catalog.json` regenerated (249 skills, 58 commands).
- `AGENTS.md` (loaded by `CLAUDE.md`): skill scripts are dependency-free and tested in `tests/skill-scripts.test.js`.
- This folder's analysis, architecture and validation documents.

## Dependencies

None added. Both scripts use Node built-ins only (Node 18+), like the existing skill scripts.

## Deferred

- A visual-identity section (logo usage, clear space, imagery) for `brand-strategy`. P3; the reference's version depends on image-generation services.
- Desktop UI stacks (WPF, WinUI, Avalonia, JavaFX), Three.js and Astro guidance. P3; no demand seen yet.
- A `--fail-on` threshold for `token-audit.js` in CI. Add it when a user wants raw-value budgets enforced.
- Live routing and behaviour evals for the new skill. They need `ANTHROPIC_API_KEY` or a gateway key; the offline checks pass.
