# Ingesting existing documents and repairing drifted state

## Ingest existing PRDs, ADRs, plans and tickets

1. **List the inputs.** Ask the user which files or folders count (for example `docs/`, an exported ticket CSV, a pasted PRD). Do not hunt beyond what they name, except to note other likely planning docs you saw and ask about them.
2. **Classify each document** as one of: product requirements (PRD, brief, user stories), decision record (ADR, RFC outcome), plan (roadmap, task list, implementation plan), or reference (research, meeting notes). Note its date and author if shown.
3. **Extract**, keeping the source on every item (`docs/prd-billing.md#refunds`):
   - From requirements docs: each requirement, its acceptance criteria and priority.
   - From decision records: each accepted decision and its status. Superseded or rejected records give context only.
   - From plans: proposed phases or milestones and their order.
4. **Find conflicts** and list them before writing anything:
   - Two documents state different behaviour for the same thing.
   - A requirement contradicts an accepted decision.
   - A plan's order breaks a dependency another document states.
   - The code already does something differently from what a document says (check by searching the codebase).
   Present each conflict as: `<A says> vs <B says> - which holds?` and wait for the user's answer. Newer is not automatically right.
5. **Merge duplicates** into one requirement and keep both sources.
6. **Draft** `PROJECT.md`, `REQUIREMENTS.md` and `ROADMAP.md` from the result, mark ingested decisions as `locked` in the decisions table only if the source record was accepted, and continue with step 6 of "Start a project" in the skill.

Never rewrite or delete the original documents; the planning files link to them.

## Repair drifted state

1. Read `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md` and `DEFECTS.md`.
2. Gather evidence:
   - `git log --oneline -50` and `git log --since=<last activity date>` for work done since the last update.
   - The phase folders: which have a SPEC, a plan, a VERIFICATION file, and whether that file records passes.
   - `git status` for uncommitted work.
   - For any requirement marked `met`, search the codebase and tests for its implementation.
3. Check each of these and record a mismatch line for every failure:
   - `STATE.md` names a phase that exists in `ROADMAP.md`.
   - Every phase marked `done` has a VERIFICATION file with all criteria passing.
   - Every requirement marked `met` has code or tests you can point to.
   - Commits since the last activity date are reflected in some phase's status.
   - Phase folders match roadmap numbers (no folder for a removed phase, no started phase without a folder).
   - Every requirement ID in `ROADMAP.md` exists in `REQUIREMENTS.md`, and the reverse for the current milestone.
   - `Last commit checked` in `STATE.md` is an ancestor of `HEAD`.
4. Report:

```
Drift report
1. <file>: claims <X>; evidence shows <Y> (<sha, path or command output>)
   Proposed fix: <edit>
...
Unknown: <items you could not decide from evidence>
```

5. Apply only the fixes the user approves. Downgrade statuses freely when evidence is missing; upgrade one (to `done` or `met`) only with evidence or the user's explicit say-so, and record which.
6. Update `Last commit checked` to `HEAD` and commit the planning files alone.
