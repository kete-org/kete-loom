---
name: feasibility-spike
description: Time-boxed throwaway experiments that answer "can this actually work?" before anyone writes a plan - each open question becomes a Given/When/Then hypothesis, gets the smallest runnable proof in an isolated spike folder or branch, and ends with a VALIDATED, INVALIDATED or PARTIAL verdict backed by recorded evidence, while the spike code itself is never merged. Use when the user is unsure whether a library, API, performance target, platform limit or integration will hold up, says "let's spike this" or "prove it first", or a plan depends on an assumption nobody has tested.
license: MIT
compatibility: Any Agent Skills host. Needs the project's language toolchain; git is used for the spike branch when available.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Feasibility spike

A spike buys knowledge, not code. It ends when every question has a verdict with evidence, or when the timebox runs out, whichever comes first. What gets kept is the findings; the code is thrown away or rewritten properly.

## 1. Frame the questions

1. Ask what decision the spike must unblock ("pick between A and B", "commit to this design", "drop the feature"). If nobody can name the decision, **stop and ask**: a spike with no decision behind it never ends.
2. List the unknowns that decision depends on. Keep 1 to 5; more means the idea needs `design-brainstorming` first.
3. Write each as a hypothesis with a measurable outcome:

```
H1: Given <starting state and inputs>,
    when <the one action under test>,
    then <observable result with a threshold>.
```

Good: "Given a 200 MB CSV on a 2 vCPU container, when we parse it with the streaming reader, then peak RSS stays under 300 MB and it finishes in under 60 s."
Bad: "The parser is fast enough." (No threshold, so no verdict is possible.)

4. Order them riskiest first: the one that, if false, kills the idea.
5. Agree a timebox with the user per hypothesis and in total (for example 30-90 minutes each). Show the hypotheses and timebox and **wait for approval** before building.

## 2. Isolate

- Work on a branch named `spike/<topic>` or in a folder such as `spikes/NNN-<topic>/` at the repo root. Never inside `src/` or another production path. Check that the project's build, test runner, linter and type checker do not pick the folder up (their include/exclude globs, workspace lists); if they do, exclude it or use a directory outside the repo.
- Each experiment gets its own subfolder with a `README.md` and the minimum files to run it.
- Hard-code values, skip config systems, frameworks, styling and error handling that the question doesn't need. Use the project's language unless the question is about another one.
- Use sandbox or test credentials only. **Stop and ask** before anything that touches production data, costs money, sends messages or emails, or calls a paid API beyond a handful of requests.
- Never add a dependency to the main project's manifest for a spike; install it inside the spike folder.

## 3. Build the smallest proof

For each hypothesis, in order:

1. Write the experiment that exercises exactly the "when" step, with a way to observe the "then" (a printed timing, a memory reading, an API response, a screenshot).
2. Run it. Record the exact command and the raw output.
3. If it fails for an incidental reason (typo, missing env var), fix and rerun. If it fails for the reason under test, that is a result: record it.
4. Record the start time (run `date`) when each experiment begins and check it between runs. At the timebox, stop building, even mid-experiment, and give the verdict with what you have.

If a result surprises you, run it once more before trusting it; for performance, take at least three runs and report the spread.

## 4. Give a verdict per hypothesis

| Verdict | Meaning |
|---|---|
| **VALIDATED** | The "then" held, under the stated conditions, with evidence attached. |
| **INVALIDATED** | It did not hold, and the cause is understood well enough to say why. |
| **PARTIAL** | It held only under narrower conditions, or the timebox ran out before a clear answer. Say exactly what remains unknown. |

Never mark VALIDATED from reading docs alone, from code that was not run, or from a mocked version of the thing under test. Documentation-only findings are PARTIAL at best.

Write each experiment's `README.md`:

```markdown
# H<n>: <short title>
Hypothesis: Given ..., when ..., then ...
Verdict: VALIDATED | INVALIDATED | PARTIAL
Evidence: <command run, key output lines, numbers, screenshots>
Conditions: <versions, hardware, data size, sandbox vs real>
Surprises: <anything that changes the plan>
Time spent: <minutes> of <timebox>
```

## 5. Wrap up

1. Write `spikes/SUMMARY.md` (or append to it; if the code will be deleted or stays on an unmerged branch, put the summary where it survives, such as `docs/spikes/<topic>.md` or the design doc) with one row per hypothesis: id, question, verdict, one-line evidence, and what it means for the decision.
2. State a recommendation for the decision named in step 1, and the risks that remain.
3. Carry the findings forward: hand them to `implementation-plans` or `architecture-decision-records` if those are in use, or into the design doc. Plans should cite the spike, not re-run it.
4. Ask the user what to do with the spike code: delete it, or keep it on the unmerged `spike/` branch or in `spikes/` as reference. Default is to keep the findings and delete the code.

## Never

- Merge spike code into the main branch, or copy it into production paths as-is. If the approach is chosen, rebuild it with tests (`tdd-workflow`), using the spike only as a reference.
- Extend the timebox silently. If more time is needed, say what is left and ask.
- Report a verdict without the command and output that produced it.
- Turn a spike into a feature build because "it's almost working".

## Report format

```
## Spike: <topic>
Decision to unblock: <decision>
H1 <title>: VALIDATED - <evidence in one line>
H2 <title>: PARTIAL - <what held, what's unknown>
H3 <title>: INVALIDATED - <why>
Recommendation: <go / no-go / go with changes>, because <reason>
Remaining risks: <list>
Spike code: <path or branch>, <deleted | kept as reference>
```
