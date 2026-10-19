---
name: systematic-debugging
description: Root-cause investigation for any bug, failing test, crash or surprising behaviour, done before a single fix is proposed. Reproduces the problem reliably, reads the whole error, checks what changed recently, traces the bad value backwards through the call chain to where it was born, tests one hypothesis at a time with the smallest experiment, instruments component boundaries, bisects polluting tests and git history, swaps sleeps for condition waits in flaky async tests, then fixes at the source with a regression test and guards on every layer the bad data crossed. Use when something is broken or behaving unexpectedly and the cause is not yet proven, especially after a quick fix has already failed.
license: MIT
compatibility: Any Agent Skills host. Needs git and the project's test runner.
metadata:
  kete-loom/version: "0.1.2"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Systematic debugging

No fix until the cause is proven. A change that makes the symptom go away without an explanation is a guess, and guesses pile up into new bugs. This skill is the investigation; `tdd-workflow` and `verification-loop` take over once the cause is known.

Use it for test failures, production bugs, build breaks, wrong output, performance cliffs and integration failures. Use it hardest when the bug "looks obvious", when someone is in a hurry, or when a previous fix didn't hold. (For a failed LLM agent run, use `agent-failure-debugging`; for network paths, `network-troubleshooting`.)

## 1. Collect the facts

1. **Read the entire error.** Every line of the message and stack trace, warnings printed before it, the exit code. Note file paths, line numbers and error codes. The answer is often already printed.
2. **Reproduce it.** Find the exact command, input and environment that trigger it. Run it at least twice. Record how often it fails (every run, 1 in 10, only in CI).
   - If you can't reproduce it, don't guess. Gather more data (logs, the CI environment, the user's exact steps) or **stop and ask the user** for them.
3. **Check what changed.** `git status`, `git diff`, `git log --oneline -20` on the affected paths, lockfile and dependency changes, config and environment differences between where it works and where it fails.
4. **Find a working twin.** Search the codebase for similar code that works. List every difference between the working and broken versions, however small. Don't dismiss a difference as "can't matter" before testing it.

## 2. Locate where it goes wrong

- **Deep in a call stack?** Trace the bad value backwards: what produced it, who called that with it, and onward until you reach the place it was first wrong. Fix there, not where it crashed. Method, instrumentation tips and non-interactive debugger recipes in `references/root-cause-tracing.md`.
- **Several components (CI → build → deploy, API → service → database, client → queue → worker)?** Add temporary logging at each boundary: what goes in, what comes out, which config and environment values are visible. Run once and read where the data stops being right. Then dig into that one component.
- **A file, row or global appears and you don't know which test made it, or a test passes alone but fails in the suite?** Bisect the tests; see `references/test-pollution.md`.
- **It worked last week?** Bisect history with `git bisect start <bad> <good>` and `git bisect run <script>`. Keep the reproduction script outside the tracked tree, since older commits don't have it. See `references/test-pollution.md`.
- **Fails only sometimes, under load or in CI, around async code?** Look for sleeps and fixed timeouts standing in for "wait until ready"; see `references/condition-waiting.md`.

## 3. One hypothesis at a time

1. Write the hypothesis down: "The cause is X, because evidence Y." Be specific enough that it could be wrong. For an investigation that may outlast the session (or the context window), keep a debug log file such as `.planning/debug/<symptom>.md`: the symptom, the reproduction, then every hypothesis with its experiment and result. Read it first when you resume, so nothing already ruled out is tried again; delete it or fold it into the report once the bug is fixed.
2. Design the smallest experiment that would disprove it: one log line, one changed input, one reverted line. Change one variable only.
3. Run it and read the result.
   - Confirmed: go to step 4.
   - Refuted: undo the experiment completely, record what you learned, form a new hypothesis. Never stack a second change on top of a failed one.
4. When you don't know, say "I don't understand X yet" and go collect more facts. Don't present a theory as a finding.

## 4. Fix at the source

1. **Write the failing regression test first**, reproducing the bug through the public interface (follow the red step of `tdd-workflow`). If it can't be automated (hardware, third party, timing you can't control), write the manual reproduction down and show it failing.
2. **Make one change** that addresses the proven cause. No refactors, renames or "while I'm here" edits in the same change.
3. **Guard the path.** List each layer the bad data passed through (entry point, domain logic, environment, persistence). Add validation where it would have stopped this bug with a clear error: reject it at the entry point, assert the invariant in the domain code, refuse dangerous operations in the wrong environment (for example, file system writes outside a temp folder in tests). Keep each guard small and test the important ones.
4. **Verify.** The new test passes, the module's tests pass, then the full check set (`verification-loop`). Remove every temporary log line and debug flag.

## 5. The three-strike rule

Count your fix attempts. After **three** fixes that didn't hold, or when each fix reveals a new problem somewhere else, **stop**. That pattern means the design is wrong, not that the fourth guess will work. Report to the user:

- what you tried and what each attempt showed,
- the shared state, coupling or assumption that keeps biting,
- two options: keep patching (and what that costs) or change the structure (with `refactoring-safely`, or the `architect` agent for a bigger rethink).

Wait for the user's decision before attempt four.

## Stop signals

Stop and return to step 1 if you catch yourself:

- proposing a fix before you can name the line where the value first goes wrong,
- changing several things at once "to see if it helps",
- adding a retry, a sleep, a `try/except: pass` or a null check at the crash site to make the symptom disappear,
- skipping the regression test because you'll "check it by hand",
- saying "it's probably X" with no experiment behind it.

When the user says "stop guessing", "did you check that?" or "we're going in circles", treat it the same way.

## Never

- Never weaken, skip or delete a test to get green. If a test is wrong, show why and get agreement.
- Never leave instrumentation, debug flags or bisect state behind (`git bisect reset` when done).
- Never declare a bug environmental or "just flaky" without evidence. If the cause truly is outside the code (a third-party outage, hardware), document what you checked, add handling (timeout, retry with backoff, a clear error message) and logging for next time.

## Report

```
## Debug report: <symptom>
Reproduction: <command or steps> (fails <n>/<m> runs)
Root cause: <one sentence>, at <file:line>
Evidence: <the experiment or trace that proved it>
Hypotheses ruled out: <each, with the experiment that ruled it out>
Fix: <file: change>; guards added at <layers>
Regression test: <path::name>, failed before, passes after
Verification: <commands> -> <results>
Open risks: <anything not proven, or "none">
```
