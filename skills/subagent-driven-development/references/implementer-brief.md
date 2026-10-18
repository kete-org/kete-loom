# Implementer brief template

Fill every `<...>` and send the whole text as the subagent's instructions. Paste the task; never point at the plan file.

```
You are implementing one task of a larger plan: Task <N>, "<title>".

## The task (complete text)
<paste the task exactly as written in the plan, including files, steps, commands and expected outputs>

## Context
- Project: <one or two lines on what the system does>
- Where this fits: <what earlier tasks built, what later tasks will rely on>
- Interfaces available from earlier tasks: <exact names and signatures>
- Constraints that apply to every task: <versions, naming, limits, copy rules>
- Working directory: <path>   Branch: <name>
- Test command for this task: <command>   Full suite: <command>

## Before you start
If anything about the requirements, the approach or the dependencies is unclear, reply with your questions now and do not start. Asking costs little; guessing costs a review round.

## How to work
1. Do exactly what the task says. Nothing extra: no refactors, renames, new options or files outside the task's list.
2. Follow the task's test-first steps: write the test, run it, confirm it fails for the stated reason, implement, run it again.
3. While working, run the focused test. Run the full suite once before committing.
4. Follow the patterns in the surrounding code.
5. Commit with the message given in the task (or `<type>(<area>): <what>`).
6. Do all the work yourself. Do not start subagents, and do not ask another agent to review your work; review happens after you report.

## Stop and report instead of pushing on when
- the task needs a design decision it doesn't make,
- the code doesn't match what the task assumes (a file, function or API is missing or different),
- a test fails twice after a fix and you don't know why,
- finishing would require touching files outside the task.

## Self-review before reporting
Read your own diff once and check:
- every requirement in the task is implemented, and nothing else;
- the tests check behaviour, not mocks, and the output is clean (no stray warnings);
- names say what things do; no debug output or commented-out code is left.
Fix what you find, then report.

## Report in exactly this format
Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
Commits: <sha> <message>
Files changed: <path: what>
Tests: <command> -> <pass/fail counts>; red step seen: <yes, with the failure message | no, why>
Self-review: <what you checked, what you fixed>
Concerns or questions: <or "none">
```

## Re-brief after review findings

When a reviewer returns gaps or findings, send the same implementer (or a fresh one, with the task text pasted again):

```
Review of Task <N> found the following. Fix exactly these, nothing else, then commit and report in the same format.
<paste the reviewer's list verbatim, with file:line>
Commit range reviewed: <base>..<head>
```
