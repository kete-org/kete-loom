# Implementation: the skill observation loop and related enhancements

Learned from [One Skill to Rule Them All](https://github.com/rebelytics/one-skill-to-rule-them-all) (`3463c7c`, Task Observer by Eoghan Henn and contributors, CC BY 4.0). All code and wording are new; the approach is credited in the skill, the library and the README. Decisions per capability: `docs/analysis/one-skill-gap-analysis.md`.

## New

| Item | Where | What it does |
|---|---|---|
| Observation library | `scripts/lib/observations.js` | `init`, `create` (validates, sweeps resolved entries into `archive/`, refuses restatements, derives id = max(active, archive, `.id-floor`) + 1, creates with `wx`, writes the floor after), `setStatus` (edits only status fields), `scan` (frontmatter only; counts two ways; `broken`, `suspect`, `barriers`, `reviewDue`), `show`, `markReviewed`, `similar` |
| CLI | `bin/kete-loom.js` → `kete-loom observe new|scan|list|show|resolve|reviewed` | Exit codes: 0 ok, 1 scan broken, 2 invalid input, 3 restatement refused, 4 not found. `--json` on scan and list |
| `doctor` line | `bin/kete-loom.js` | Shows the log's open count, last review and any broken scan; honours `--home` |
| `skill-observations` skill | `skills/skill-observations/` (+ `references/signals.md`, trigger and behaviour evals) | When to observe, what to log (improve, violation, simplify, new-skill), the restatement, target and sibling checks, flush points, subagents report rather than write, act only on artefact-naming requests |
| `/skill-review` command | `commands/skill-review.md` | Scan, size the batch, read bodies, cluster, decide, stage under `staged/<date>/` with a diff, apply only on approval, route installed Kete Loom items to an upstream draft, reconcile earlier staged sets, record statuses, `observe reviewed` |

Schema written by `render()`:

```
id, title, status (open|actioned|declined|superseded|parked), kind (improve|new-skill|simplify|violation),
type (open-source|internal), skill [], proposes_skill [], target_file [], rule, siblings_checked (required),
area, date, session_context, parked_until (required when parked), resolved, resolution (required when resolved)
```

Body: `**Issue:**`, `**Suggested improvement:**`, `**Principle:**`.

## Enhanced

| Item | Change | Version |
|---|---|---|
| `load-session-context` hook | Adds one line when the log exists: open count, review due, rules broken twice | 0.1.1 → 0.1.2 |
| `capture-lessons` hook | When the log exists, asks the agent to log findings through `kete-loom observe new` instead of listing them in the reply | 0.1.0 → 0.1.1 |
| `/learn` | Sibling check; a rule broken again goes to `/hookify`, not a rewrite; findings not ready to apply go to the observation log | 0.1.0 → 0.1.1 |
| `skill-authoring` | Every reference pointer names its load trigger; a clear rule broken twice is replaced with a barrier | 0.2.1 → 0.2.2 |
| `common` rule | An empty result is a claim about the command until a second check confirms it | 0.1.0 → 0.1.1 |
| `parallel-agent-orchestration`, `subagent-driven-development` | Workers report findings; only the controller writes shared logs and trackers | 0.1.0 → 0.1.1 |
| Lint (`scripts/lib/lint.js`) | Error for an unquoted description containing ` #` | — |
| `ios-platform-features`, `office-documents`, `rust-testing`, `swift-testing`, `swiftui-patterns` | Descriptions quoted: YAML parsers were cutting them at `#[test]`, `#Preview`, `#REF!`, `#available`, `#expect` | patch bump each |
| `method` profile | Adds `skill-observations` and `/skill-review` | — |
| `AGENTS.md`, `README.md` | Layout and the "Learning from every session" section | — |

## Not adopted, and why

- `$1` / `$ARGUMENTS` warnings in skill bodies: correct SQL placeholders and prices would trip it in 8 items.
- Ratcheting per-reference size ceilings: Kete items are far smaller than the reference's; the 300-line limit is enough today.
- Skill-family registry file: judgement plus the catalog covers sibling checks at Kete Loom's current scale.
- Zip bundle validation and legacy log migration: Kete Loom distributes through npm and has no legacy log.
