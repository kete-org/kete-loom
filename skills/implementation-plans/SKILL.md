---
name: implementation-plans
description: Writes a saved, executable implementation plan that an engineer with zero context could follow, then works through it. Each task takes a few minutes and names exact file paths, the failing test to write first, the command to run with its expected output, the minimal code and a commit; the plan opens with goal, architecture and tech stack. Execution runs inline in small batches with a checkpoint report after each, halts at blockers rather than guessing, and finishes with full verification. Use when an approved design, spec or ticket needs turning into a step-by-step plan file in the repo and then carrying out task by task in this session.
license: MIT
compatibility: Any Agent Skills host. Needs git and the project's test runner.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Implementation plans

Two halves: **write** a plan precise enough that someone who has never seen this codebase can follow it without asking, then **execute** it in small, checked batches. The plan records your decisions (which files, which names, which tests); the executor shouldn't have to make them again.

Neighbours: the `planner` agent produces a read-only plan in chat; use this skill when the plan should live in the repo and be executed. `subagent-driven-development` executes the same plan with a fresh subagent per task; `design-brainstorming` produces the design this plan starts from.

## Part 1: write the plan

### 1. Check the input

- You need a design, spec or clear ticket. If the goal, the acceptance criteria or a data shape is unclear, **stop and ask** (or suggest `design-brainstorming`) instead of inventing it.
- If the input spans independent subsystems, propose one plan per subsystem, each producing working, tested software on its own.
- Run the test suite once and record the baseline. If it's red, tell the user before planning.

### 2. Map the files first

Search the codebase and list every file to create or modify, with one line on its responsibility. Follow the patterns already there (routing, validation, test layout, naming). Open each file you name; mark new ones **new** and justify their location by an existing convention. Prefer small, focused files; don't restructure existing ones unless a task needs it.

### 3. Write tasks

A task is the smallest change that carries its own test cycle and could be reviewed on its own, normally 2 to 10 minutes of work. Fold setup and config into the task whose behaviour needs them. Order tasks so the build and tests pass after every task.

Each task uses this shape:

````markdown
### Task 3: Reject expired coupons

Files: modify `src/checkout/coupons.ts`; test `src/checkout/coupons.test.ts`
Uses: `Coupon` type from Task 1. Provides: `isRedeemable(c: Coupon, now: Date): boolean`

- [ ] Write the failing test:
  ```ts
  it('rejects a coupon past its expiry', () => {
    expect(isRedeemable(coupon({ expiresAt: '2024-01-01' }), new Date('2024-02-01'))).toBe(false);
  });
  ```
- [ ] Run `npx vitest run src/checkout/coupons.test.ts`. Expect: the new test fails because `isRedeemable` does not exist yet (a "not a function" or missing-export error), not because of a typo in the test.
- [ ] Implement `isRedeemable` in `src/checkout/coupons.ts`: compare `expiresAt` to `now`.
- [ ] Run the same command. Expect: all passed.
- [ ] Commit: `feat(checkout): reject expired coupons`
````

Rules for tasks:

- Exact paths, exact names and signatures, exact commands, the expected result of each command.
- Show the test code. Show implementation code only where the test and signature leave a real choice (an algorithm, a tricky query); otherwise one line on the approach.
- Copy exact values from the spec (limits, messages, field names) instead of paraphrasing them.
- No "handle errors appropriately" or "add validation as needed": say which error, which validation.
- Each acceptance criterion is proved by at least one task's test. Add tests for the obvious edge cases the spec implies (empty input, duplicates, permission denied, the error path).

### 4. Add the header and save

Start the file with:

```markdown
# <Feature> implementation plan
Goal: <one sentence>
Architecture: <2-3 sentences: the approach and how the pieces fit>
Tech stack: <languages, frameworks, key libraries>
Source: <path to the design doc or ticket>
Constraints: <project-wide rules from the spec, one per line, exact values>
Baseline: <test command> -> <green | red: details>
Execution: checkbox tasks; run with the implementation-plans or subagent-driven-development skill
```

Save it where the project keeps plans; if nowhere, `docs/plans/YYYY-MM-DD-<feature>.md`. Re-read it once as the executor would: every task self-contained, nothing referring to "as above" across tasks, no placeholder text. Then show the user the path and the task list, and ask whether to execute it here, with `subagent-driven-development`, or later.

## Part 2: execute the plan

1. **Read the whole plan critically first.** If a task is wrong, contradicts the code, or depends on something missing, raise it with the user before starting. Don't silently rewrite the plan.
2. **Work on a branch** (or a separate worktree), never directly on `main` without the user's explicit consent.
3. **Run in batches of about three tasks.** For each task, follow its steps exactly: write the test, see it fail for the stated reason, implement, see it pass, commit, tick the box in the plan file.
4. **Checkpoint after each batch.** Report and wait for the user to say continue (unless they told you to run straight through):

```
Batch 2 done (tasks 4-6 of 11)
- Task 4: <title> - done, commit <sha>
- Task 5: ... - done
- Task 6: ... - done with a note: <deviation and why>
Tests: <command> -> <counts>
Next: tasks 7-9
```

5. **Stop at blockers, don't guess.** Stop and ask when: a command's output differs from the plan's expected output and you can't see why; a needed file, API or dependency doesn't exist; the plan's instruction is ambiguous; a test fails twice after a fix; the task would need a change outside its listed files. Use `systematic-debugging` for unexpected failures.
6. **Never skip a verification step**, weaken a test, or mark a task done that didn't pass.
7. **Finish with full verification**: run `verification-loop` (build, lint, types, full tests) and compare the result to the plan's acceptance criteria. Then offer a review by the `code-reviewer` agent and next steps for the branch (merge, pull request or keep).

## Never

- Never start coding while writing the plan.
- Never leave a task without its test, command and expected result.
- Never let one task change files the plan assigned to a later task.
- Never push, merge or delete branches without the user asking.

## Final report

```
## Plan: <path>
Tasks: <done>/<total>; commits <first sha>..<last sha>
Deviations: <task: what changed and why, or "none">
Verification: <commands> -> <results>
Acceptance criteria: <each: met | not met>
Left over: <blocked or skipped tasks, follow-ups>
```
