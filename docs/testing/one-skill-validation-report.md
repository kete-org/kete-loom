# Validation report: the skill observation loop

Reference reviewed: `rebelytics/one-skill-to-rule-them-all` at `3463c7c9cd2a2c2745af09c742100ad0b1465a68`. Kete Loom baseline: `2fd22f1` (v0.4.1). Run on macOS, Node 22, 2026-10-19.

## Executive summary

The reference's strongest idea is a closed loop: notice friction during real work, record it durably, review it into approved skill changes. Its strongest engineering habit is to enforce the mechanical rules in code, not prose. Kete Loom had the loop's ends (`/learn`, `capture-lessons`, `/rules-review`, `/hookify`) but no durable middle.

This work adds that middle natively:
- a zero-dependency observation library and the `kete-loom observe` CLI;
- the `skill-observations` skill and the `/skill-review` command;
- status lines in two existing hooks;
- targeted enhancements to six existing items;
- a new lint check, which found and fixed five descriptions that YAML parsers were silently truncating.

Several reference capabilities were deliberately excluded, with reasons (`docs/analysis/one-skill-gap-analysis.md`).

## Commands run and results

| Check | Command | Result |
|---|---|---|
| Lint (spec, manifests, translations) | `npm run lint` | 248 skills, 62 agents, 57 commands, 19 rules, 20 hooks; 0 errors, 0 warnings |
| Unit and integration tests | `npm test` (node --test) | 104 tests, 104 pass, 0 fail |
| Trigger evals, offline structure | `node scripts/run-evals.js` | 310 files, 3,160 prompts, 0 problems |
| Behaviour evals, offline structure | `node scripts/run-behavior-evals.js` | 16 files, 48 scenarios, 0 problems |
| Full gate | `npm run check` | pass |
| Real home folder untouched by tests | `ls ~/.kete-loom` after `npm run check` | absent (tests use temporary folders only) |
| Translations | code-block identity script | 8 of 8 translations: 12 of 12 code blocks identical to the English |

## New tests

`tests/observations.test.js` (16 tests):
- id derivation from active, archive and floor, including after the log is emptied;
- day-after archival;
- refusals: restatement, blank sibling check, bad slug, a violation without a rule, no target;
- never overwriting;
- frontmatter round trips with quotes, colons, `#` and commas inside list entries;
- status edits that keep the body byte for byte and write `$&` literally;
- reopening an archived entry;
- scan double counts, broken-log detection and two-violation barrier detection;
- review cadence;
- unreadable entries;
- non-Latin restatement detection;
- id claims under concurrency;
- CLI exit codes and option validation;
- `load-session-context` and `capture-lessons` integration;
- `doctor` with `--home`.

`tests/lint.test.js` (+2):
- the unquoted ` #` description check;
- a missing description reported rather than crashing.

## Independent review

A separate review agent read the diff and reproduced 8 defects before commit. All are fixed, with a regression test each:
1. A lint regression on items with no description.
2. `#` inside quoted values was parsed as a comment.
3. List entries containing a comma broke.
4. `$&` and `$'` in a resolution were expanded as replacement patterns.
5. A reopened archived entry stayed invisible.
6. One unreadable entry crashed the hook and the scan.
7. A flag with a missing value swallowed the next flag.
8. The restatement check over-refused overlapping titles and missed non-Latin ones.

Its minor findings are fixed too:
- the hook reads escaped `rule` values;
- a BOM no longer breaks the hook;
- CRLF line endings are preserved;
- creates across processes are made safe with exclusive id claims.

## Performance

Measured on a synthetic log of 500 observations with 400-character bodies, average of 20 runs:

| Operation | Time |
|---|---|
| `create` (includes the archival sweep and restatement check, which grow with the log) | 5.1 ms |
| `scan` (frontmatter only) | 9.0 ms |
| `load-session-context` hook with the 500-entry log | 56.8 ms |
| `load-session-context` hook with no log (baseline, mostly `git`) | 49.8 ms |

The log adds about 7 ms to session start at 500 entries.

## Not run, and why

- **Live behaviour evals (baseline versus enhanced agent behaviour):** these need an API key for the judge model (`ANTHROPIC_API_KEY` or `KETE_LOOM_EVAL_*`), and none is set in this environment. The three `skill-observations` scenarios are written (`skills/skill-observations/evals/behavior.json`) and validated offline. Run them with `npm run eval:behavior -- --live --skill skill-observations`. No improvement in task completion, token use or reliability is claimed until that has run.
- **Live routing evals** for the new skill's trigger prompts: same reason.
- **Windows:** CI runs the test suite on Windows with Node 18 and 22 when this is pushed; it was not run locally.

## Remaining gaps and next steps

1. Run the live behaviour evals above, and tune the `skill-observations` description if routing misses.
2. A skill-family registry, if logs grow large enough that sibling checks need a file rather than judgement.
3. Per-reference size ceilings, if any Kete Loom reference grows beyond about 600 lines.
4. A `kete-loom observe` subcommand to extend an existing observation's body (today it is a manual edit of the body, which the skill allows).
