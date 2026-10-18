---
name: project-roadmap
description: Keeps a multi-session project's plan in plain Markdown under .planning/ (PROJECT.md for vision and constraints, REQUIREMENTS.md with stable IDs, ROADMAP.md of milestones and phases with success criteria, STATE.md for the current position and decisions, DEFECTS.md as a ledger of known breakage), and runs its lifecycle - starting a project or milestone from questions or by ingesting existing PRDs, ADRs and plans, adding, inserting or removing phases, proving every requirement maps to a phase, closing a milestone with a summary and archive, repairing state that drifted from git, and optional parallel workstreams. Use when the user wants a roadmap or milestones set up for a project that spans many sessions, asks to add or reorder phases, to close out a milestone, or says the planning files no longer match the code.
license: MIT
compatibility: Any Agent Skills host. Needs git. State is plain Markdown, so no other tooling is required.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Project roadmap

Run a project that outlives one session from a handful of Markdown files. The files are the memory: read them at the start of every session, update them when something changes, and never let them claim more than git shows.

## The files

All state lives in `.planning/` at the repository root. Templates for every file are in `references/templates.md`; read it before creating any of them.

| File | Holds | Changes when |
|---|---|---|
| `PROJECT.md` | Vision, users, core value, constraints, non-goals, key decisions table | Scope or a constraint changes; a decision is locked |
| `REQUIREMENTS.md` | Requirements with stable IDs (`AUTH-01`), priority, and the phase that owns each | A requirement is added, changed, deferred or met |
| `ROADMAP.md` | Milestones, each an ordered list of phases with goal, requirement IDs, success criteria and status | Phases are added, inserted, removed or finished |
| `STATE.md` | Current milestone and phase, status, last activity, open blockers, recent decisions | After every working session and every phase transition |
| `DEFECTS.md` | Known defects found but not fixed in the current scope, with ID, severity and status | A defect is found, fixed or accepted |
| `phases/<NN>-<slug>/` | Per-phase SPEC or CONTEXT, plan, verification notes | While that phase is worked |
| `milestones/<version>/` | Archived roadmap, requirements and summary of a closed milestone | A milestone closes |

## Ground rules

1. **Read before acting.** At the start of a session read `STATE.md`, then the current phase in `ROADMAP.md`, then any handoff note (see `session-handoff`). If they disagree with `git log`, repair first (section 7).
2. **IDs are forever.** Never renumber or reuse a requirement ID. A dropped requirement is marked `deferred` or `dropped` with a reason, not deleted.
3. **Status follows evidence.** A phase is `done` only when its success criteria were checked and the result is written in its phase folder. "Code merged" is not "verified".
4. **Ask before changing scope.** Adding, dropping or narrowing a requirement, or moving one out of the current milestone, needs the user's yes. Record it in the decisions table.
5. **Planning commits stay separate.** Commit `.planning/` changes on their own (`docs(planning): ...`), never mixed into a feature commit, so feature branches and pull requests can be reviewed without them. If the team does not want planning files in the repo at all, add `.planning/` to `.gitignore`, say so in `STATE.md`, and skip the planning commits; drift repair then relies on `Last commit checked` and the feature history alone.
6. **Locked decisions win.** When new input (a doc, a request) contradicts a locked decision, stop and show the conflict; don't silently pick one.

## 1. Start a project

1. Check for an existing `.planning/`. If it exists, this is not a new project: go to section 7 or 2.
2. Read the repository (README, `AGENTS.md`, top-level layout, recent `git log`) so questions are about things the code can't tell you.
3. Choose the source:
   - **From questions.** Ask one question per message, in this order: what it is and for whom, the one thing it must do well (core value), hard constraints (stack, deadline, budget, compliance), what is explicitly out, and what "first usable version" means. Stop once you can write `PROJECT.md` without guessing.
   - **From existing documents.** Follow `references/ingest-and-repair.md`: classify each PRD, ADR, plan or ticket export, extract requirements and decisions with their source, and list every conflict for the user to settle before writing anything.
4. Draft `PROJECT.md` and `REQUIREMENTS.md`. Give each requirement an ID by area (`AUTH-01`, `BILL-03`), a priority (`must`, `should`, `later`) and one testable acceptance line.
5. Draft `ROADMAP.md` with the first milestone only. Each phase delivers something a user or caller can observe, takes a few sessions at most, and lists its requirement IDs and two to five success criteria phrased as checks.
6. Run the coverage check (section 4). Show the user the three drafts and the coverage table; **stop and wait for approval**.
7. Write the files, create `STATE.md` pointing at phase 1, create an empty `DEFECTS.md`, and commit them alone.

For a large or fuzzy idea, run `design-brainstorming` first and feed its design doc in as an existing document. For a sizing or deadline question, use `estimation-and-scoping` on the drafted phases.

## 2. Start the next milestone

1. Confirm the current milestone is closed (section 6). If not, ask whether to close it first.
2. Carry over: `later` requirements, open `DEFECTS.md` entries marked for the next milestone, and anything the summary listed as deferred.
3. Ask what the milestone is for in one sentence, then add new requirements with new IDs (continue numbering, never restart).
4. Draft the phases, number them continuing from the last milestone, run the coverage check, get approval, write and commit.

## 3. Change phases

Phases are numbered `01`, `02`, ... within the whole project. Phase folders are `phases/<NN>-<slug>/`.

- **Add** a phase at the end of the current milestone: next number, goal, requirement IDs, success criteria, status `planned`.
- **Insert** urgent work between two existing phases without renumbering: use a decimal (`03.1`) and say in its goal why it was inserted. Never renumber a phase that has started or has a folder.
- **Remove** a phase only if it has not started. Move its requirements to another phase or mark them `deferred` with the user's agreement; a removed phase must not orphan a `must` requirement.
- **Reorder** only unstarted phases, and check each phase's "depends on" line still points backward.

After any change, rerun the coverage check, update `STATE.md` if the current or next phase moved, and commit.

## 4. Coverage check

Build this table from `REQUIREMENTS.md` and `ROADMAP.md` and show it whenever either changes:

```
| ID      | Priority | Phase | Status   |
|---------|----------|-------|----------|
| AUTH-01 | must     | 02    | planned  |
| AUTH-02 | must     | -     | UNMAPPED |
```

Fail the check, and fix it before moving on, when a `must` or `should` requirement in the current milestone has no phase, a phase lists an ID that doesn't exist, two phases claim the same ID without saying which part each owns, or a phase has no success criteria.

## 5. Work a phase

Each phase moves `planned` → `specified` → `planned-in-detail` → `in-progress` → `verifying` → `done`. Update `STATE.md` at each step.

1. **Specify.** Run `spec-clarification` for the phase; it writes `phases/<NN>-<slug>/SPEC.md` with locked decisions.
2. **Plan.** Use `implementation-plans` (or the `planner` agent) to write the plan into the phase folder, then have the `plan-checker` agent check it against the SPEC and requirement IDs before any code runs.
3. **Build.** Execute with `subagent-driven-development` (each task via `task-implementer`, gated by `spec-reviewer`) or inline with `implementation-plans`.
4. **Verify.** Check every success criterion and write the result to `phases/<NN>-<slug>/VERIFICATION.md`. Use the `acceptance-testing` skill if it is installed; otherwise walk each criterion with the user and record pass or fail with evidence.
5. **Close the phase.** Mark the requirements met in `REQUIREMENTS.md`, set the phase `done`, move `STATE.md` to the next phase, log defects found but not fixed in `DEFECTS.md`, and commit the planning files alone.

Hard gates: never mark a phase `done` with a failed or unchecked criterion, never start the next phase's build while the current one is `verifying` with failures, and never close a phase with a `critical` defect open against it unless the user accepts it in writing in the decisions table.

## 6. Close a milestone

1. Every phase is `done`, or the user has agreed to move the rest to the next milestone.
2. Run the coverage check. Every `must` requirement is `met`, or moved with a recorded decision.
3. Review `DEFECTS.md`: each open entry is fixed, accepted, or carried forward.
4. Write `milestones/<version>/SUMMARY.md`: what shipped (by requirement ID), what was deferred and why, decisions made, defects carried, and lessons in at most five bullets.
5. Copy the milestone's section of `ROADMAP.md` and the met requirements into `milestones/<version>/`, then trim them from the live files to one line each pointing at the archive.
6. Tag only if the user asks (`git tag <version>`); never push.
7. Update `STATE.md` to "between milestones" and commit the planning files alone.

## 7. Repair drifted state

Run this when `STATE.md` or `ROADMAP.md` disagrees with the code, or when the user says the files are stale. Follow the steps in `references/ingest-and-repair.md`: compare each claimed status with `git log`, phase folders and tests, list every mismatch, propose one fix per mismatch, and apply only what the user approves. Never mark work done that you could not find in git; never delete history to make the files agree.

## 8. Parallel workstreams (optional)

Use only when two or more people or agents work separate tracks of one milestone at the same time.

- Each track gets `.planning/workstreams/<name>/STATE.md` and its own phases; `ROADMAP.md` stays the one shared list and marks each phase with its track.
- Tracks must not share a requirement ID. If two tracks need the same change, make it its own phase that both depend on.
- Each track works on its own branch or worktree; merge planning updates through the shared `ROADMAP.md` one track at a time.
- When a track finishes, fold its state into the top-level `STATE.md` and remove its folder.

## Report format

After any operation, tell the user:

```
Milestone: <version> - <name>     Phase: <NN> <name> (<status>)
Changed: <files and what changed>
Coverage: <n> mapped, <n> unmapped, <n> deferred
Open: <blockers and critical defects, or "none">
Next: <one action>
```

## Never

- Never edit application code as part of a planning operation.
- Never mark a requirement met or a phase done without the evidence written down.
- Never renumber started phases or reuse requirement IDs.
- Never mix `.planning/` changes into a feature commit, and never push.
