# Gap analysis: UI/UX Pro Max

Reference: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) at commit `56ea9cf174ed86786187daa9de0e6247cb0747e4` (2026-10-15, MIT). Reviewed read-only in an isolated folder: source, skill files, data headers and samples read; **no script was executed and nothing was installed**. Kete Loom baseline: `a68b14a` (v0.5.0).

## What the reference is

A design-knowledge skill (`ui-ux-pro-max`) backed by CSV datasets and a Python search engine, plus six sibling skills (`design-system`, `ui-styling`, `brand`, `design`, `banner-design`, `slides`) and an installer that renders the skill for 23 agent hosts.

| Part | Evidence | Verified how |
|---|---|---|
| BM25 search over 13 CSV domains (styles, colours, products, typography, UX rules, charts, icons, landing patterns, motion, React performance, app interface) and 22 stack files | `src/ui-ux-pro-max/scripts/core.py:282-347` (BM25, k1 1.5, b 0.75), `search.py` | code read |
| Design-system generator: product category → reasoning row → multi-domain search → pattern, style, palette, type, effects, anti-patterns | `design_system.py:283-420`, `data/ui-reasoning.csv` (192 rows with JSON decision rules) | code read |
| Persisted `design-system/<slug>/MASTER.md` plus `pages/<page>.md` overrides; refuses to overwrite without `--force` | `design_system.py:986-1101` | code read |
| Design dials (variance, motion, density 1-10) changing style bias, GSAP snippet and spacing scale | `design_system.py:90-128`, SKILL.md "Design Dials" | code read |
| Palette contrast contract: every on-colour pair checked at build time | `validate_data.py:148-163, 387-416` | code read |
| Token validator: regex scan for raw hex, rgb, px and rem outside token definitions | `.claude/skills/design-system/scripts/validate-tokens.cjs:55-80` | code read |
| Token generator: JSON → CSS variables or Tailwind config | `generate-tokens.cjs` | code read |
| Three-layer token architecture (primitive, semantic, component) | `design-system/references/token-architecture.md` | doc |
| Priority-ordered rule categories (accessibility → charts) and a pre-delivery checklist | `ui-ux-pro-max/SKILL.md` table, `references/pro-rules.md:64-117` | doc |
| Query contract: retry once, then say no match was found and label the fallback | SKILL.md "If a search returns 0 results" | doc only |
| Brand guideline, logo, banner, corporate identity, slide generation | `brand`, `design`, `banner-design`, `slides` skills | doc; image generation needs external AI services |

Documentation-only or unverifiable claims: data accuracy and "verifiedAt" dates in the CSVs can't be checked without the sources; the README's "192 reasoning profiles" is a row count, not evidence of quality. Many rows are generated in bulk (palette notes like "[Accent adjusted from #F97316]" show automated adjustment).

## Kete Loom before this work

| Area | Kete Loom item | State |
|---|---|---|
| Visual direction, tokens, states, design-system audit | `ui-design-polish` (+ `references/tokens.md`, `detail-checklist.md`) | strong on screen finish; direction by "infer tone" with one example; audit by manual grep |
| Style organisation, theming plumbing | `css-architecture` | full |
| WCAG 2.2 AA (including 2.4.11, 2.5.7, 2.5.8, 3.3.7, 3.3.8) | `web-accessibility`, `accessibility-reviewer` agent | full |
| Mobile accessibility | `mobile-accessibility` | full |
| Motion and reduced motion | `ui-motion` | full |
| Flow and state audit | `ui-flow-audit` | full |
| Scored visual review (6 areas, rendered or static, reads DESIGN.md if present) | `ui-auditor` agent | full; exact contrast and token counts by hand |
| Charts and dashboards | `metrics-dashboards` | full on chart choice; accessible fallback thin |
| Landing pages | `conversion-optimization` | full |
| Mockups during design | `design-brainstorming` (`references/visual-mockups.md`) | full |
| Framework UI guidance | `react-patterns`, `nextjs-patterns`, `vue-patterns`, `svelte-patterns`, `angular-patterns`, `flutter-patterns`, `swiftui-patterns`, `jetpack-compose-patterns`, `react-native-patterns`, `react-performance` | full for the stacks Kete Loom targets |
| Brand | `brand-strategy`, `brand-voice` | strategy and voice, not visual identity |
| Slides | `slide-decks` | full |

## Matrix

Dimensions: **D** design intelligence, **I** implementation intelligence, **Q** quality intelligence.

| Capability | Dim | Reference evidence | Kete Loom equivalent | Gap | Improvement | P | Cx | Deps | Action |
|---|---|---|---|---|---|---|---|---|---|
| Direction recommended from product category, with reasons | D | `ui-reasoning.csv`, `design_system.py:_apply_reasoning` | `ui-design-polish` §1 (tone inferred, no category knowledge) | Partial | Category table (24 rows) loaded on demand; every choice tagged `[project]`/`[table]`/`[default]` | P0 | Med | none | **Implement**: `design-system` skill, `references/product-directions.md` |
| Persisted design system with page overrides, never overwritten silently | D/I | `persist_design_system`, MASTER.md + pages | none (`ui-auditor` reads a DESIGN.md if one exists) | Missing | DESIGN.md + `design/pages/<page>.md`, retrieval rule written into AGENTS.md | P0 | Low | none | **Implement** in `design-system` step 6 |
| Three-layer tokens, light and dark | I | `token-architecture.md` | `ui-design-polish/references/tokens.md` (palette → semantic, two layers) | Partial | Primitive / semantic / component with naming, density-driven scales | P1 | Low | none | **Implement**: `references/token-scales.md` |
| Token wiring per stack | I | `ui-styling` (Tailwind, shadcn), stack CSVs | `css-architecture` (CSS), framework skills (no token wiring) | Partial | CSS, Tailwind 4/3, shadcn/ui, MUI, React Native, Flutter, SwiftUI, Compose | P1 | Med | none | **Implement**: `references/stack-wiring.md` |
| Design dials | D | `_resolve_dial` | none | Missing | Density / expressiveness / motion dials that drive the scales, with stated reasons | P2 | Low | none | **Implement** in `design-system` step 2 |
| Deterministic contrast checking | Q | `validate_data.py:157`, `design_system.py:153` (internal only) | none: skills said "check with a contrast checker" | Missing | `contrast.js`: literals, `oklch()`, `hsl()`, shadcn triples, token pairs from CSS with var() chains and dark scopes; exit codes for CI | P0 | Med | none | **Implement**: `design-system/scripts/contrast.js` |
| Deterministic hard-coded value scan | Q | `validate-tokens.cjs` (hex, rgb, px, rem) | manual grep in `ui-design-polish` §6 and `ui-auditor` | Partial | `token-audit.js`: colours, font size, spacing, radius, shadow, z-index, Tailwind arbitrary values, near-duplicate colour clusters, says when it scanned nothing | P0 | Med | none | **Implement**: `design-system/scripts/token-audit.js`; **enhance** `ui-design-polish`, `ui-auditor` to use it |
| Composable design-to-code workflow | D/I/Q | SKILL.md workflow steps 1-4 | `/feature-dev` (generic) | Partial | Staged command: context → direction → system → build → checks → scored review | P1 | Low | none | **Implement**: `/design-ui` |
| Priority-ordered pre-delivery checklist | Q | `pro-rules.md:64-117` | `ui-design-polish/references/detail-checklist.md` | Partial | Order by severity; add dark theme checked on its own, scrims, sticky UI covering focus, safe areas, one icon family and no emoji icons, no layout shift from pressed states | P1 | Low | none | **Enhance** |
| Chart accessibility fallback | Q | `charts.csv` A11y Fallback column | `metrics-dashboards` ("not colour alone") | Partial | Text summary, data table or CSV, shape and dash encodings, 3:1 marks, keyboard tooltips | P2 | Low | none | **Enhance** |
| Searchable CSV knowledge base + BM25 engine | D | `core.py` | skills + `references/` loaded on demand | Different approach | Kete Loom's progressive disclosure (read one row of one reference) gives the same context efficiency without a second runtime or Python | — | High | Python | **Exclude** (would be a parallel framework) |
| Bulk datasets (192 palettes, 1,934 Google Fonts, 1,271 stack rules) | D | `data/*.csv` | curated references | Not applicable | Copying generated rows adds volume, not verified judgement; Kete Loom keeps a curated, test-checked table | — | — | — | **Exclude** |
| GSAP presets | I | `motion.csv` | `ui-motion` (CSS and Motion) | Full | — | P3 | — | GSAP | **Retain** |
| React performance rules | I | `react-performance.csv` | `react-performance` skill | Full | — | — | — | — | **Retain** |
| WCAG 2.2 outcome rules | Q | `ux-guidelines.csv` | `web-accessibility`, `accessibility-reviewer` | Full | — | — | — | — | **Retain** |
| Desktop stacks (WPF, WinUI, Avalonia, JavaFX, Uno, UWP), Three.js, Astro | I | `data/stacks/*.csv` | none | Missing, low demand | Revisit if users ask | P3 | Med | — | **Exclude for now** |
| Brand guideline, logo, banner, corporate identity generation | D | `brand`, `design`, `banner-design` | `brand-strategy`, `brand-voice` | Partial | Visual identity guide could extend `brand-strategy`; image generation needs paid external services | P3 | Med | AI image APIs | **Defer** |
| Multi-host installer templates (23 hosts) | — | `templates/platforms/*.json` | Kete Loom installer (8 hosts) | Not applicable | Different distribution model | — | — | — | **Exclude** |

## Expected benefit, impact and validation per implemented gap

| Gap | Developer benefit | Architectural impact | Validation |
|---|---|---|---|
| `design-system` skill | One place that turns a product brief into a reasoned, written system; later screens stop drifting | New skill only; reuses the existing skill format, lint, evals and installer | lint, trigger evals (8 + 8), behaviour scenarios (3), catalog build |
| DESIGN.md + page overrides | Agents read decisions instead of re-deciding them each session | A file convention in user projects; no runtime | skill steps; behaviour scenario "existing app, add a page" |
| `contrast.js` | A pass/fail number instead of an eyeballed claim, usable in CI | Zero-dependency script in the skill folder | 5 unit tests; real run on the catalog site (16 pairs) |
| `token-audit.js` | Instant inventory of raw values and near-duplicates in an existing app | Zero-dependency script | 2 unit tests; real run on the catalog site |
| `/design-ui` | A staged, approval-gated flow that composes existing skills and agents | Command only; no new orchestration engine | lint, catalog |
| `design` profile | One install for UI work | `profiles.json` entry using existing resolution | `npm run check` (profile tests) |
