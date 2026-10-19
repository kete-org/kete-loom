# LinkedIn skill validation

Checks run for the LinkedIn work on macOS (Darwin 25.6), 2026-10-19. Nothing below that says "not run" is claimed as passing. No real content was published, and no LinkedIn endpoint was called.

## Repository gates

| Check | Command | Result |
|---|---|---|
| Lint | `node scripts/lint-skills.js` | 250 skills, 62 agents, 59 commands, 19 rules, 20 hooks: **0 errors, 0 warnings** |
| Tests | `npm run check` | **118 / 118 pass** (111 before this work; 7 new) |
| Trigger eval files (offline) | `node scripts/run-evals.js` | 312 files, 3,193 prompts, 0 problems |
| Behaviour eval files (offline) | `node scripts/run-behavior-evals.js` | 18 files, 55 scenarios, 0 problems |
| Catalog | `npm run catalog` | 250 / 62 / 59 / 19 / 20 / 21 |
| Translations | i18n hash | 8 at `5fdefea7ddee`, none stale |
| Install as a user would | `install --profile business --target claude,kete` into a temp home | `linkedin-content` (with both scripts, executable), `ai-prose-cleanup` (with `prose-scan.js`) and `/linkedin-post` installed for both hosts |

## New tests (`tests/skill-scripts.test.js`)

| Test | Covers (spec area) |
|---|---|
| prose-scan reports tier-1 residue, placeholders, unsourced claims and invisible characters, and exits 1 | fabrication guard, source attribution, invisible-character fingerprint, curly-apostrophe handling, exit code |
| prose-scan passes plain specific prose and strips only invisible characters | no false positives on plain prose; `--strip-invisible` changes nothing else (em dash kept); bad arguments; missing file |
| prose-scan flags uniform sentence length only with enough sentences | rhythm check and its small-sample guard |
| post-check fails on placeholders and over-limit text, and warns on hook, hashtags and bait | formatting, post and comment limits, approval blocker |
| post-check reads banned words from the voice profile and accepts a clean post | voice consistency, clean pass, bad `--kind`, unreadable voice file |
| post-metrics computes rates, ranks by engagement rate and refuses to call patterns on few posts | maths checked against hand-computed values, BOM, CRLF, quoted thousands, skipped zero-impression row, grouping |
| post-metrics exits 2 on missing columns, unknown group columns and bad options | failure handling with a message naming the found columns |

These tests were written after the scripts and were not seen failing first, so they guard against regressions but didn't drive the design. Manual runs during development found two bugs before the tests existed. `Certainly!` was missed, because a `\b` after `!` can't match; it now uses a lookahead. Curly apostrophes hid "It's not just X, it's Y"; matching now uses a same-length copy with straight apostrophes.

## Spec test areas

| Area | How it's covered | Status |
|---|---|---|
| Skill registration and activation | lint, catalog, install into a temp home; trigger evals written (9 + 8) | offline pass; **live routing not run** |
| Content generation and formatting | `post-check.js` tests; behaviour scenario "missing number" | scripts pass; **generation not run against a model** |
| Brand voice consistency | banned words from the voice profile (test) | pass |
| Fact verification and attribution | tier-1 unsourced attribution (test); skill and command require sources | pass (script) |
| Workflow state transitions | status model in `references/planning.md` and the skill; only the user sets `approved` and `published` | documented; no code holds this state, so there's no unit test |
| Approval enforcement | `post-check.js` exits 1 while placeholders remain; behaviour scenarios "missing number" and "asked to auto-engage" | script pass; **scenarios not run live** |
| API auth, permissions, idempotency, rate limits, retries | documented in `social-media-publishing` 0.2.0 with scopes checked against Microsoft Learn (2026-10) | **not applicable to code here**: Kete Loom ships no LinkedIn client to test |
| Prompt-injection resistance | behaviour scenario "injection in a pasted post"; skill ground rule 3 | **not run live** |
| Regression of existing capabilities | full suite, 118 / 118 | pass |

## Not run, and why

| Check | Why | How |
|---|---|---|
| Live routing (17 prompts) and behaviour scenarios (4) | No `ANTHROPIC_API_KEY` or gateway key in this environment | `node scripts/run-evals.js --estimate --skill linkedin-content`, then `--live`; `node scripts/run-behavior-evals.js --skill linkedin-content --live` |
| Any call to LinkedIn | No client in scope, and real publishing is forbidden in tests | Use a test member or page in the user's own app, following `social-media-publishing` |
| Reference repo scripts | Not executed by design (untrusted) | — |
