# UI/UX validation report

Results of the checks run for the UI/UX Pro Max work, on macOS (Darwin 25.6), Node from the local toolchain, 2026-10-19. Everything below was run; nothing marked "not run" is claimed as passing.

## Repository gates

| Check | Command | Result |
|---|---|---|
| Lint (skills, agents, commands, rules, hooks) | `node scripts/lint-skills.js` | 249 skills, 62 agents, 58 commands, 19 rules, 20 hooks: **0 errors, 0 warnings** |
| Unit and integration tests | `npm run check` (node:test) | **111 / 111 pass** (104 before; 7 new) |
| Trigger eval files (offline validation) | `node scripts/run-evals.js` | 311 files, 3,176 prompts, 0 problems |
| Behaviour eval files (offline validation) | `node scripts/run-behavior-evals.js` | 17 files, 51 scenarios, 0 problems |
| Catalog and README regeneration | `npm run catalog` | counts 249 / 62 / 58 / 19 / 20 / 21 |
| Translations current | `scripts/lib/i18n.js` hash check | all 8 at `bf5e69b8f944`, none stale |

The first lint run failed with 3 errors: the cross-skill references `scripts/contrast.js` in `ui-design-polish` and `ui-auditor`, and `references/visual-mockups.md` in `design-system`, were read as local files. They were fixed by naming the owning skill in the path (`design-system/scripts/contrast.js`); the second run was clean.

## New tests (`tests/skill-scripts.test.js`)

| Test | Covers |
|---|---|
| contrast gives the WCAG ratio for black on white and flags #777 on white | ratio maths (21:1; 4.47:1 fails 4.5), exit 1, JSON output |
| contrast reads oklch, hsl triples and translucent colours | `oklch(0.627 0.194 149.214)` → `#00a63e` (Tailwind 4 green-600), shadcn triple, 50% black on white ≈ 3.97:1, unreadable input → null |
| contrast resolves token pairs from a CSS file and its dark scope | `var()` chains, `var(--missing, fallback)`, `.dark` and `@media (prefers-color-scheme: dark) :root` scopes |
| contrast exits 2 on an unknown token, scope or option | error paths, no pairs |
| every accent in the product-directions table passes 4.5:1 with white | all 24 accents in the shipped reference, so the data can't drift into failing colours |
| token-audit counts raw values, groups near-duplicates and skips tokens and vendor folders | colours (including Tailwind `bg-[#1F2937]`, case-folded), clusters, spacing from CSS and `p-[13px]`, z-index, `href="#top"` not counted, `--x:` definitions and `node_modules` skipped, `margin:0` ignored |
| token-audit says when it scanned nothing and rejects bad arguments | the empty-result warning, unknown option, missing folder |

These tests were written after the scripts and were not seen failing first, so they guard against regressions but did not drive the design. Manual runs during development found one real bug: the first audit counted `:root{--c:#123456}` as a raw colour, which led to stripping inline custom-property definitions (now covered by the token-audit test).

## Representative scenarios

| Scenario | What was run | Result |
|---|---|---|
| Existing product, preserve mode (Kete Loom's own catalog site, built with `npm run site`) | `token-audit.js site` | 1 file; 2 raw colours (both inside the inline SVG logo), 6 font sizes, 27 spacing values, 5 radii. Shows the site has semantic colour tokens but no spacing or type scale |
| Same site, light and dark themes | `contrast.js --css site.css` on 8 text pairs, then with `--scope '@media (prefers-color-scheme:dark) :root'` | **16 / 16 text pairs pass** (lowest 5.39:1). Focus ring 6.13:1 light, 7.94:1 dark |
| Same site, non-text contrast | `contrast.js --min 3 "--line/--bg"` | **Fails: 1.26:1 light, 1.35:1 dark.** `--line` is the only border on the search input and the select (`site/index.html:31`), so their boundaries miss WCAG 1.4.11. Reported, not fixed (out of scope) |
| Stack samples in `references/stack-wiring.md` | `contrast.js` on the 11 sample pairs (shadcn oklch, MUI and React Native light and dark, Compose) | 11 / 11 pass; no failing example is shipped |
| Brand colour that can't carry white text | `contrast.js "#fff/#7dd3fc"` | 1.66:1, exit 1; used as the "brand conflict" behaviour scenario |
| Install as a user would (`--profile design --target claude,kete`, temp home) | real install, then the installed `contrast.js` | skill, references and both scripts installed with the executable bit; installed script runs |
| SaaS dashboard, admin portal, e-commerce, mobile | covered by rows in `product-directions.md` and by behaviour scenarios | **Not run against a model** (see below) |

A slip worth recording: the first site run passed eight pairs as one zsh word, and `contrast.js` rejected it with exit 2 (`cannot read colour "--bg --muted/--bg ..."`) instead of reporting a false pass.

## Not run, and why

| Check | Why not | How to run it |
|---|---|---|
| Live routing evals for `design-system` (8 should, 8 should-not) | No `ANTHROPIC_API_KEY` or gateway key in this environment | `node scripts/run-evals.js --estimate --skill design-system`, then `--live` |
| Live behaviour evals (3 scenarios) | Same | `node scripts/run-behavior-evals.js --skill design-system --live` |
| Browser-rendered responsive and visual regression checks | No UI is generated by this change; the skill instructs rendering at 375/768/1280 in both themes and saying "not rendered" when a browser isn't available | Run `/design-ui` in a frontend project with Playwright or a browser tool |
| Component tests, type checks, production builds of generated UI | Kete Loom ships instructions and scripts, not a UI app | Part of `/design-ui` step 5 in the user's project |
| Reference repository scripts | Not executed by design (untrusted content) | — |
