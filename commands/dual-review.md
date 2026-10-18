---
name: dual-review
description: Two independent reviewers, optionally on different models or providers, review the same change against one rubric; fix and repeat until both approve or the round limit is hit, then report disagreements.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[scope] [--rounds N] [--models a,b]"
  kete-loom/owner: "Kete-org"
---

Run a dual review of the change below. Default: 3 rounds at most.

1. **Scope.** Use the files, commit range or PR in the arguments; otherwise `git diff HEAD` plus untracked files from `git status --short`; if empty, the branch diff against its merge base with the default branch. If there is nothing to review, say so and stop.
2. **Rubric.** Write one rubric and give it to both reviewers unchanged: correctness, security, error handling, tests for changed behaviour, breaking changes for callers. Each finding needs `path:line`, severity (blocking | should fix | nit) and a concrete fix. Verdict: approve | request changes.
3. **Reviewers.** Start two reviewers in separate contexts, at the same time, with the same scope and rubric, and never show either the other's output. Use the matching Kete Loom reviewer agent for the language (as `/review` routes: `typescript-reviewer`, `python-reviewer`, `payments-reviewer` and so on), else `code-reviewer`. If `--models` names two models or the host has a second provider configured, run one reviewer on each; otherwise use two separate subagents and say the independence is weaker. If subagents aren't available, tell the user and stop rather than reviewing twice in one context.
4. **Reconcile.** Merge findings. Mark each as *both*, *A only* or *B only*. Check every single-reviewer finding against the code yourself before acting on it; drop ones you can disprove and note why.
5. **Fix.** Show the user the blocking and should-fix list and ask before editing. Apply the smallest fix per finding, run the project's tests, and don't touch code outside the scope.
6. **Repeat.** Re-run both reviewers on the updated diff with fresh contexts. Stop when both approve, at the round limit, or when a round fixes nothing new (the same blocking findings keep coming back); in the last two cases list every unresolved blocking finding under Open. Never weaken the rubric to get an approval.

Report:

```
## Dual review: <scope>   Rounds: <n>/<max>   Reviewers: <A agent/model>, <B agent/model>
Verdict: both approve | A approves, B requests changes | both request changes
Fixed: path:line — issue (found by A|B|both)
Open: path:line — issue — why not fixed
Disagreements: <finding> — A says ..., B says ..., your assessment
Tests: <command> → <result>
```

Scope and options: $ARGUMENTS
