# Reviewer brief templates

Reviewers are read-only. Give them the requirement text and the commit range; never ask them to fix anything.

## Spec compliance (send to the `spec-reviewer` agent)

```
Check whether this implementation does what its task asked: no more, no less.

## Requirement (complete text)
<paste the task text from the plan>

## Constraints that apply to every task
<versions, naming, limits, copy rules from the design>

## What the implementer says it did (unverified)
<paste the implementer's report>

## Change to review
Commit range: <base sha>..<head sha>   Working directory: <path>
Read the diff and the changed files. Treat the report as claims to check, not evidence.

Return PASS, or a ranked list of gaps (missing, partial, extra, misread), each with file:line evidence.
Do not comment on style or code quality.
```

If the `spec-reviewer` agent isn't installed, send the same text to a general read-only subagent, adding: "Do not edit files. Do not run commands that change the working tree, index or branches."

## Code quality (send to the `code-reviewer` agent, or the language reviewer)

Only after the spec review returns PASS.

```
Review this change for correctness and quality. The spec check has already passed; do not re-litigate scope.

Task: <title> (one line on what it does)
Commit range: <base sha>..<head sha>   Working directory: <path>
Test command: <command>

Focus: correctness bugs, unhandled error paths, broken callers, tests that don't prove the behaviour, names and structure that will confuse the next reader.
Return findings ranked by severity (critical, high, medium, low) with file:line and the smallest fix. Do not edit files.
```

## Whole-branch review (end of the plan)

```
Review the whole branch <base sha>..HEAD, built task by task from <plan path> and <design path>.
Look for problems no single-task review could see: duplicated helpers across tasks, inconsistent names or error handling, dead code left by earlier tasks, requirements of the design that no task covered, and integration gaps between components.
Return findings ranked by severity with file:line. Do not edit files.
```

Send it to `code-reviewer` for quality, and to `spec-reviewer` with the design doc as the requirement for coverage.
