---
name: verification-loop
description: Pre-merge verification that detects the project's build, lint, type-check and test commands, runs them in order, fixes what it safely can and reports a pass/fail verdict. Use when the user asks to verify, check or validate changes before committing, opening a pull request, merging or shipping.
license: MIT
compatibility: Any Agent Skills host. The detection script needs Node 18+; without Node, detect commands by reading project files manually.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "git, node"
  kete-loom/owner: "Kete-org"
---

# Verification loop

Prove the change works before anyone else has to. Run every check the project defines, in a fixed order, and give a clear verdict.

## 1. Scope the change

Run `git status` and `git diff --stat` against the base branch (usually `main`). Note which files and packages changed. In a monorepo, verify the changed packages plus anything that depends on them.

## 2. Detect the checks

Run the helper from this skill's folder:

```
node scripts/detect-checks.js [project-dir]
```

It prints a JSON list of the build, lint, type-check, format-check and test commands it finds (npm/pnpm/yarn/bun scripts, Python, Go, Rust, Java, .NET, Makefile). Also read `AGENTS.md`, the README and the CI workflow files: if CI runs a command the script missed, add it. CI is the source of truth.

If nothing is detected, ask the user how they verify changes. Don't invent commands.

## 3. Run in this order

1. **Install / build**: does it compile?
2. **Format check**: check mode only (`--check`), never a reformat of the whole repo.
3. **Lint**
4. **Type-check**
5. **Tests**: unit, then integration. Skip end-to-end suites that need external services unless the user asks.

Run each command exactly as the project defines it. Capture the exit code and the first relevant error lines.

## 4. Fix, then re-run

For each failure:

- **Caused by this change**: fix it, then re-run that check and everything after it.
- **Pre-existing** (also fails on the base branch): don't fix it unasked. Report it as pre-existing. Confirm with `git stash` or by checking the base branch only if it's cheap and safe.
- **Flaky** (passes on retry with no change): report it as flaky, with the test name.

Never make a check pass by disabling a rule, adding `skip`/`ignore`, loosening types to `any`, or deleting tests. If that seems like the only path, stop and ask.

Stop after three fix rounds on the same check and report.

## 5. Final review of the diff

Re-read the full diff once. Look for: debug prints, commented-out code, secrets or tokens, TODOs you introduced, unrelated changes, and missing tests for new behaviour.

## 6. Verdict

Report a table, then one line:

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | ✅ pass |
| Lint | `npm run lint` | ✅ pass (2 warnings) |
| Tests | `npm test` | ❌ 1 failing (pre-existing: `auth.spec.ts`) |

**Verdict:** READY, READY WITH NOTES, or NOT READY, followed by what must happen before merge.
