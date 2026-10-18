---
name: autonomous-loops
description: Runs an agent unattended over many iterations without it drifting or doing damage. Defines a measurable goal and stop conditions up front, caps iterations, time and spend, verifies each iteration with a real check, commits checkpoints so any step can be rolled back, keeps a progress log, and stops to escalate on repeated failure or risky actions. Use when the user wants the agent to keep going on its own ("loop until the tests pass", "work through this backlog overnight", "fix every lint error"), or when designing a headless or scheduled agent run.
license: MIT
compatibility: Any Agent Skills host. Needs git 2.23 or later (for git switch and git restore) and the project's check commands.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Autonomous loops

An unattended loop is a small program with an agent inside. It needs what any long-running job needs: a definition of done, limits, a health check each step, a log, and a way out. Agree all of it with the user **before** the first iteration, because nobody will be watching after.

## 1. Write the loop contract

Fill this in and show it to the user. **Do not start until they confirm it.**

```
Goal:          <measurable end state, e.g. "npm test exits 0" or "0 eslint errors in src/">
Check:         <command that measures progress, and the number it reports>
Scope:         <paths the loop may edit>; everything else is read-only
Per iteration: <one unit of work, e.g. "fix one failing test file">
Stop when:     goal met | <N> iterations | <T> minutes | <budget> spent |
               no progress for 3 iterations | same error 3 times
Escalate if:   <actions needing a human: see section 4>
Branch:        <work branch, never main>
Log:           <path, e.g. .handoff/loop-log.md>
```

If the goal can't be checked by a command, it is not ready for a loop. Help the user turn it into one, or run it attended.

## 2. Prepare

1. Create a work branch: `git switch -c loop/<topic>`. Never loop on the default branch.
2. Make sure the tree is clean (`git status --short`). If it isn't, ask the user what to do with the changes.
3. Run the check once and record the baseline in the log. If the baseline is already at the goal, stop.

## 3. Each iteration

1. **Read the log** (last few entries) so you don't repeat a failed approach.
2. **Pick one unit** of work, the smallest that moves the check.
3. **Make the change** inside the agreed scope.
4. **Verify**: run the check, plus the project's fast tests or lint if the check alone could hide regressions.
5. **Decide**:
   - Better and nothing else broke: commit with a message naming the unit (`loop: fix parser.test.ts timeouts`).
   - Not better, or something else broke: revert the change: `git restore --staged --worktree -- <tracked files you modified>`, then delete the files this iteration created (git restore rejects untracked paths), and note why. Only ever revert this iteration's own uncommitted work.
6. **Log** one entry:

   ```
   ## Iteration 7 - 14:32
   Did: raised timeout handling in src/parser.ts
   Check: 12 failing -> 9 failing (kept, commit a1b2c3d)
   Next: auth.test.ts fixtures
   ```

7. **Check stop conditions** before starting the next iteration.

## 4. Escalate instead of acting

Stop the loop and report to the user when the next step would:

- Edit files outside the agreed scope, delete files, or change CI, secrets or deployment config.
- Delete, skip or weaken a test, or lower a lint or coverage threshold to make the check pass.
- Install, upgrade or remove dependencies (unless the contract allows it).
- Push, open a PR, deploy, run migrations, or call paid or production services.
- Repeat an approach the log already shows failed.

Also stop if the check gets worse twice in a row, or the same error shows three times. That's a sign the loop is stuck, not that it needs more tries.

## 5. Budgets

- Keep a counter of iterations and elapsed time in the log header and compare against the contract each iteration.
- If the host reports cost or token usage, track it the same way. If it doesn't, the iteration cap is the budget.
- For long runs, checkpoint the context too: after every few iterations, make sure the log alone is enough to continue (see the `session-handoff` and `context-budget` skills).

## 6. Finish

When any stop condition hits, end with this report:

```
Stopped because: <goal met | cap reached | stuck | escalation>
Check: <baseline> -> <final>
Iterations: <n> (<kept> kept, <reverted> reverted)
Branch: loop/<topic> at <sha>
Needs a human: <escalations and open questions, or "nothing">
```

Leave the branch for review. Don't merge or push it unless the user asked for that in the contract.

## Never

- Never run a loop without a check command and a hard iteration cap.
- Never game the check (skip tests, add ignores, hard-code expected output, special-case the test).
- Never keep a change that made the check worse.
- Never let the loop widen its own scope or extend its own budget.
