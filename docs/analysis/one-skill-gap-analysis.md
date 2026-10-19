# Gap analysis: One Skill to Rule Them All

Reference: [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) at commit `3463c7c9cd2a2c2745af09c742100ad0b1465a68` (2026-10-16, skill `task-observer` 3.7.0, CC BY 4.0). Reviewed read-only in an isolated folder: every file read, no script executed. Kete Loom baseline: `2fd22f1` (v0.4.1).

## What the reference is

One skill (`SKILL.md`, 691 lines) plus eight reference files (about 7,600 lines) and five scripts (bash and Python, about 2,900 lines). It makes an agent notice, while it works, what the work teaches about its skills, record each finding as a file in a log that outlives the session, and turn the log into skill updates in a periodic review that stages copies for the user to install.

The reference's distinctive engineering idea is that **rules live in the write path, not in prose**. Archival happens inside the command that issues an id. A rule broken twice must be fixed with a barrier, never reworded. Every count is paired with an independent count, so an empty result can't be mistaken for an empty log.

Verified versus documented: several capabilities exist only as prose or copy-paste recipes. The README's "install the session-start hook" ships no hook; all four hook recipes are snippets in `references/environments.md`. The subagent no-write rule, workspace creation and the sibling check are instructions only. `migrate-log.py --convert` opens outputs with mode `w` (`scripts/migrate-log.py:566`), so it overwrites same-named files despite the docs calling the conversion re-runnable.

## Kete Loom before this work

Kete Loom had the edges of this loop, but no durable middle:

| Kete Loom item | Behaviour (traced in the source) |
|---|---|
| `/learn` (`commands/learn.md`) | One lesson, written straight into AGENTS.md or a rule file after approval. No log, no review. |
| `capture-lessons` hook (`hooks/capture-lessons/hook.js`) | Once per session, at stop, asks the agent for up to 3 lessons in the reply. Nothing is stored. |
| `/rules-review` (`commands/rules-review.md`) | Reads past session transcripts and reports violated, missing, untriggered and stale rules. Retrospective, transcript-based. |
| `/hookify` (`commands/hookify.md`) | Turns a rule into a blocking hook. |
| `skill-authoring` | Behaviour pressure-testing, held-out description tuning, baseline against the old version. |
| `load-session-context` hook | Branch, uncommitted changes, `.planning/STATE.md`, handoff note. |
| `idea-backlog`, `project-roadmap` | Plain-file state for ideas and project plans (not skill improvement). |

## Matrix

| Capability | Reference (evidence) | Kete Loom before | Gap | Priority | Action |
|---|---|---|---|---|---|
| Durable observation log, one file per finding, frontmatter schema | `scripts/new-observation.sh:72-103`, `SKILL.md:436-482` (verified) | none | Missing | P0 | **Implement**: `scripts/lib/observations.js`, `kete-loom observe` |
| Stable user-scope workspace, never inside an ephemeral checkout | `SKILL.md:24-58`, `references/environments.md:249-343` (documented; shard detection verified in `session-start-scan.sh:149-155`) | `~/.kete-loom/state` for hook state only | Missing | P0 | **Implement**: `~/.kete-loom/observations/` (or `KETE_LOOM_OBSERVATIONS_DIR`) |
| Monotonic ids: max(active, archive, floor) + 1, noclobber create, floor written after create | `scripts/new-observation.sh:45-97` (verified) | none | Missing | P0 | **Implement** in `create()`; `wx` open flag |
| Archival inside the write path, day-after grace | `SKILL.md:534-552`, `new-observation.sh` sweep (verified) | none | Missing | P1 | **Implement**: `sweep()` runs inside `create()` |
| Restatement check before writing | `SKILL.md:267-276` (documented only) | `/learn` step 3 (one file only) | Partial | P0 | **Implement as a barrier**: `create()` refuses a near-identical open title on the same target (exit 3) |
| Mandatory `siblings_checked` field | `SKILL.md:285-297` (documented; scan reports it) | none | Missing | P1 | **Implement**: required by the CLI; **enhance** `/learn` with a sibling check |
| Second violation → structural barrier, not rewording | `SKILL.md:308-315`, `references/signals.md` (documented) | `/hookify` exists, no trigger to use it | Partial | P0 | **Implement**: `kind: violation` + `rule:`; scan and session-start hook flag a rule broken twice; **enhance** `skill-authoring`, `/learn` |
| Frontmatter-only session-start scan with independent counts | `scripts/session-start-scan.sh:51-133` (verified) | none | Missing | P1 | **Implement**: `scan()` counts two ways, reports SCAN BROKEN; `load-session-context` adds one status line |
| "Empty result is a claim about the instrument" | `SKILL.md:424-434` (documented; guards verified in scripts) | none | Missing | P1 | **Implement** in `scan()`; **enhance** `common` rule |
| Review offer cadence (7 days, once per session, bounded slice for large backlogs) | `SKILL.md:173-194` (documented) | none | Missing | P1 | **Implement**: `reviewDue`, `/skill-review` step 2 |
| Periodic review with staging and an install gate | `references/weekly-review.md` (documented; validator helpers verified) | none | Missing | P0 | **Implement**: `/skill-review` command; staging under `observations/staged/<date>/` |
| Staged-versus-live reconciliation | `weekly-review.md` "Staged-work reconciliation gate" (documented) | none | Missing | P2 | **Implement** as `/skill-review` step 6 |
| Never edit an installed copy that an update will overwrite | (reference: harness skill-save controls are install paths, `SKILL.md:616-628`) | `kete-loom update` overwrites installed items | Reference improvement, Kete-specific | P0 | **Implement**: `/skill-review` routes installed Kete Loom items to an upstream draft plus a project rule |
| Write checkpoints (every 3rd todo, every deliverable, every failed write) | `SKILL.md:323-359` (documented) | `capture-lessons` at stop only | Partial | P2 | **Implement** as guidance in `skill-observations` §4; **enhance** `capture-lessons` to write through the CLI |
| Subagents write nothing; findings go in the report | `SKILL.md:5`, `environments.md:220-225` (documented only) | none | Missing | P2 | **Enhance** `parallel-agent-orchestration`, `subagent-driven-development`; rule in `skill-observations` |
| Acting only on an explicit, artefact-naming request | `SKILL.md:598-614` (documented) | `/learn` asks first | Partial | P2 | **Implement** in `skill-observations` §6 |
| Partial resolution via a carrier observation | `SKILL.md:663-669` (documented) | none | Missing | P3 | **Implement** as guidance (§6, `/skill-review` step 7) |
| Signals taxonomy and generalisability test | `references/signals.md` (documented) | `capture-lessons` one-liner | Partial | P1 | **Implement**: `skills/skill-observations/references/signals.md` (original wording) |
| Confidentiality typing (open-source / internal) | `SKILL.md:505-509, 523-532` | none for lessons | Missing | P2 | **Implement**: `--type`, defaulting rule in the skill |
| Load-on-demand references, each pointer naming its trigger | `SKILL.md:59-92` (documented; validator counts triggers) | `skill-authoring` "say when to read each file" | Partial | P2 | **Enhance** `skill-authoring` |
| Validator: unquoted description containing ` #` | `scripts/validate-skill-bundle.py:840-844` (verified) | not checked; 5 Kete descriptions were silently truncated by YAML parsers | Reference improvement | P1 | **Implement** in `scripts/lib/lint.js`; fixed the 5 items |
| Validator: `$<digit>` / `$ARGUMENTS` in skill bodies | `validate-skill-bundle.py:854-856` (verified) | not checked | Partial | P3 | **Exclude**: in Kete Loom it flags SQL placeholders and dollar amounts that are correct; the substitution risk only applies to skills invoked with arguments |
| Ratcheting size ceilings with per-reference load-trigger counts | `validate-skill-bundle.py:375-433, 646-756` (verified) | fixed 300-line limit per item | Partial | P3 | **Exclude for now**: Kete items are an order of magnitude smaller; revisit if references grow past ~600 lines |
| Bundle packing, zip round trip, raw central-directory checks | `validate-skill-bundle.py:1605-1730` (verified) | npm package, `npm pack` in CI | Not applicable | — | **Exclude**: Kete ships through npm and plugin manifests, not `.skill` zips |
| Legacy single-file log migration | `scripts/migrate-log.py` (verified, with the overwrite defect above) | no legacy format | Not applicable | — | **Exclude** |
| Handoff-doc and report-back modes without a filesystem | `environments.md:1635-1667` (documented) | `session-handoff` skill | Partial | P3 | **Retain**; `skill-observations` §4 covers refused writes (put the observation in the final message) |
| Starter principles seed set | `references/starter-principles.md` (documented) | rules (`common`, `testing`, `security`) | Fully supported (different design) | — | **Retain** |
| Skill families registry | `references/observation-log.md:726-791` (documented) | catalog categories, no family file | Partial | P3 | **Defer**: the sibling check uses judgement plus the catalog; a registry file is overhead until a log is large |
| Per-skill open-observation lookup at skill load | `scripts/skill-load.sh` (verified) | none | Partial | P2 | **Implement** as `kete-loom observe list --skill <name>` |
| Network posture: no network in normal operation | `SKILL.md:18-22` | observe CLI makes no network calls | Fully supported | — | **Retain** |
| Activation via description + CLAUDE.md block + hook recipes | `SKILL.md:5`, `environments.md` (recipes only) | Kete installs real hooks across 8 hosts | Reference behind Kete | — | **Retain**: the shipped `load-session-context` hook replaces the recipes |
| Release workflow: validate, pack, upload | `.github/workflows/release-bundle.yml` (verified) | `release.yml` with check, trusted publishing and provenance | Fully supported | — | **Retain** |

Nothing in Kete Loom was found duplicating the new capability: `/learn` (immediate, single lesson), `/rules-review` (retrospective transcript audit) and `idea-backlog` (product ideas) stay distinct, and the new items say so in their scope.
