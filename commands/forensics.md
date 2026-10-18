---
name: forensics
description: Read-only post-mortem of a multi-session piece of work that went wrong, rebuilding the timeline from git history and plan, state and handoff files to find where it diverged and how to recover, without changing anything.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[feature, branch, date range or symptom]"
  kete-loom/owner: "Kete-org"
---

Investigate how the work named below went wrong across sessions. This is read-only: do not edit, commit, revert, stash, check out or delete anything. Only run commands that read state (`git log`, `git show`, `git diff`, `git reflog`, `git branch -a`, `git status`, reading files). For one failed agent session with a transcript, use the `agent-failure-debugging` skill instead; for a production incident, use `/postmortem`.

1. **Scope.** Take the feature, branch, date range or symptom below. If none, use the current branch since its merge base with the default branch, and state that.
2. **Gather the record.**
   - Git: `git log --format='%h %ad %an %s' --date=iso <range>`, `git log --stat`, `git reflog` (resets, rebases, abandoned branches), and branches touching the same files.
   - Intent: the plan, roadmap, phase, state, todo and handoff files (`.planning/`, `docs/plans/`, `HANDOFF.md`, session notes, the ticket), and every UAT or review report.
   - Results: CI history if available, test results recorded in commits or notes.
3. **Build the timeline.** One line per event: date, session or commit, what was intended, what actually happened. Mark gaps longer than a day and sessions that ended without a handoff.
4. **Look for these divergence patterns**, each backed by commits or file lines:
   - **Scope creep**: commits touching files or features the plan never mentioned.
   - **Skipped verification**: commits or "done" claims with no test run, a failing CI run, or a UAT never completed.
   - **Abandoned plan**: plan steps never done, or the plan stopped being updated while commits continued.
   - **Repeated failed fixes**: several commits on the same file or error message, fix-revert-fix sequences, "try"/"again"/"really fix" messages.
   - **State drift**: state or handoff files claiming progress the code doesn't show, or the reverse.
   - **Lost work**: reflog entries for resets or force updates, branches never merged.
5. **Find the first divergence**: the earliest point where what happened stopped matching the plan. Later problems usually follow from it.
6. **Recommend recovery**, without doing it: what to keep, what to undo (with `/revert-work` and the commits), what to re-verify (`/verify`, `/uat`), what to re-plan, and what process change would have caught it.

Report:

```
## Forensics: <scope>
Summary: <two sentences: what went wrong and when it started>
Timeline:
- <date> <sha or session>: <intended> -> <actual> [pattern]
First divergence: <date, sha or file:line> - <what happened>
Causes:
1. <pattern>: <evidence>
Recovery:
1. <step> (<command or item to use>)
Not examined: <sources missing or unreadable>
```

Say which conclusions are inferred rather than shown by evidence. Offer to save the report to a file only if the user asks.

Scope from the user: $ARGUMENTS
