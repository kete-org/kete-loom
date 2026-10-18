---
name: subagent-driven-development
description: Carries out a written implementation plan one task at a time, handing each task to a fresh implementer subagent with the full task text and context pasted in, answering its questions before work begins, and requiring a self-review and report. Every task then passes a spec-compliance check by the spec-reviewer agent and only afterwards a code-quality check by the code-reviewer agent, looping fix and re-review until both pass, with a progress ledger and a whole-branch review at the end. Falls back to inline execution on hosts without subagents. Use when a plan file exists and the user wants it executed task by task with independent review gates between tasks.
license: MIT
compatibility: Best on hosts with subagents; has an inline fallback. Needs git and the project's test runner.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Subagent-driven development

You are the controller. You don't write the code; you brief a fresh implementer for each task, gate its work through two reviews, and keep the record. Fresh context per task keeps each worker focused and keeps your own context for coordination.

Input: a plan with self-contained tasks, normally written with `implementation-plans` (or by the `planner` agent). No plan yet: write one first. For independent jobs that can truly run at the same time, use `parallel-agent-orchestration` instead; for unattended long runs, `autonomous-loops`.

## 0. Set up

1. Read the whole plan and its source design or spec once. Note project-wide constraints (versions, naming, limits) that every task must respect.
2. Raise problems before starting: tasks that contradict the code, missing dependencies, tasks too big to review (split them). **Stop and ask the user** about anything that would change scope.
3. Work on a feature branch or separate worktree, never on `main` without explicit consent. Record the base commit SHA.
4. Run the test suite once. If it's red, report and ask before going on.
5. Create a ledger (a short Markdown file outside the tracked tree, or in your notes):

```
| # | Task | Status | Commit | Spec review | Quality review | Notes |
|---|------|--------|--------|-------------|----------------|-------|
| 1 | ...  | todo   |        |             |                |       |
```

## 1. Per task: brief the implementer

Start a **fresh** subagent for the task (a general-purpose subagent with edit and shell tools). Build the brief from `references/implementer-brief.md`:

- Paste the **full task text** from the plan. Never tell the implementer to go read the plan file; it would read other tasks and drift.
- Add the context it can't infer: where the task fits, the interfaces earlier tasks produced (names and signatures), the global constraints, the working directory and branch, the test command.
- Tell it to ask questions before starting, to follow the task's test-first steps, to commit, to self-review its diff, and to report in the fixed format with a status.

If it comes back with questions, answer them (from the plan, the design or the code; ask the user only when none of those decide it) and send it on. Don't let it start on assumptions.

## 2. Handle the report

| Status | Action |
|---|---|
| `DONE` | Go to the reviews. |
| `DONE_WITH_CONCERNS` | Read the concerns. Correctness or scope worries: resolve them before review. Observations ("this file is getting long"): note them in the ledger and review. |
| `NEEDS_CONTEXT` | Supply the missing context and resume the same implementer, or re-brief a fresh one. |
| `BLOCKED` | Decide: more context, split the task, or a more capable model. If the plan itself is wrong, **stop and ask the user**. Never re-send the same brief unchanged. |

## 3. Review gate 1: spec compliance

Run the `spec-reviewer` agent with the task text, the implementer's report, and the commit range (`<sha before task>..<sha after>`). Brief template in `references/reviewer-briefs.md`. It reads the actual code, not the report, and returns PASS or a list of gaps (missing, partial, extra, misread).

On gaps: send the list back to the implementer (same one if it's still available, otherwise a fresh one with the task text plus the gap list), then re-run the spec review on the new range. Repeat until PASS. Extra, unrequested work counts as a gap: have it removed.

## 4. Review gate 2: code quality

Only after spec PASS. Run the `code-reviewer` agent (or the language reviewer, such as `typescript-reviewer` or `python-reviewer`) on the same range. Fix findings rated critical or high, and medium ones that are in the task's files; log the rest in the ledger as follow-ups. Re-review after fixes. If a quality fix changes behaviour, run the spec review again.

Running quality before spec wastes effort polishing code that may be wrong or unwanted, so keep the order.

## 5. Record and continue

Mark the task done in the ledger with its commit and both review results, tick its box in the plan, and move to the next task. Continue without pausing for the user unless:

- a decision would change scope, a public API, data or security,
- an action is irreversible or reaches outside the repository (deploys, migrations on shared databases, pushing),
- the same task has failed review three times, or
- the user asked for checkpoints.

## 6. Finish

1. Run the full check set (`verification-loop`).
2. Run one whole-branch review on `<base>..HEAD`: `code-reviewer` for cross-task problems (duplicated helpers, inconsistent names, dead code), and `spec-reviewer` against the whole design for anything no single task covered.
3. Fix what they find with the same loop.
4. Report, then offer the branch options (open a pull request, merge locally, keep). Don't push or merge without the user asking.

## Inline fallback (host without subagents)

Do each role yourself, in sequence, and keep the roles separate:

1. Implement the task from its text alone, following its steps, and commit.
2. Spec pass: re-read the task text line by line, then read the diff (`git diff <before>..<after>`), and list each requirement with the file:line that meets it. Anything without a line is a gap.
3. Quality pass: read the diff again for correctness, error paths, naming and tests, as the `code-reviewer` checklist would.
4. Fix and repeat. Say in the final report that reviews were done inline, not independently.

## Never

- Never run two implementers at the same time on tasks that touch the same files. Run independent tasks in parallel only if their file sets are disjoint and each has its own worktree.
- Never skip either review, or accept "close enough" on the spec review.
- Never trust an implementer's report as evidence; reviewers read the code.
- Never let implementers or reviewers start their own subagents.
- Never fix a task's code yourself mid-loop without saying so in the ledger; the reviewers must see the final diff.

## Final report

```
## Executed: <plan path>
Branch: <name>, base <sha>, head <sha>
Tasks: <done>/<total>
| # | Task | Commit | Spec | Quality | Review rounds |
Branch review: <findings fixed / open>
Verification: <commands> -> <results>
Rulings made: <decisions you took without the user, and why>
Follow-ups: <logged quality items, concerns>
```
