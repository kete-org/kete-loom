---
name: estimation-and-scoping
description: Software effort estimation and scope negotiation that breaks a project into small tasks, gives each a best, likely and worst case instead of a single number, surfaces unknowns and time-boxed spikes to resolve them, adds integration, review and release overhead, and offers concrete scope cuts that fit a deadline, finishing with a range and a stated confidence level. Use when someone asks how long a feature or project will take, needs a quote or a sizing for planning, has a fixed date and must decide what to cut, or wants to know why an earlier estimate was wrong.
license: MIT
compatibility: Any Agent Skills host. Reads the codebase to size the work; no other tools needed.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Estimation and scoping

An estimate is a range with a confidence level and the assumptions it depends on. It is not a promise. Give the reader what they need to make a decision: how big, how sure, and what would change it.

## 0. Pin down the question

1. What exactly is being estimated, and what does "done" mean (merged, released to all users, documented, migrated)? If unclear, **ask the user** before estimating.
2. Who is doing the work, how much of their time is available, and in what unit the answer is wanted (engineer-days, calendar weeks, story points). Calendar time is effort divided by real availability, not by headcount alone.
3. Is the date or the scope fixed? If the date is fixed, the job is scoping (section 4), not estimating.
4. If a PRD or plan exists, read it. If the requirements are vague, estimate only the parts that are defined and list the rest as unknowns.

## 1. Break it down

- Read the code the work touches: search for the modules, endpoints, tables and tests involved. Note anything unexpectedly tangled.
- Split into tasks of roughly half a day to three days each. Anything bigger is not understood yet; split again or mark it as an unknown.
- Include the work people forget: tests, migrations and backfills, config and feature flags, docs, code review rounds, QA, deploy and rollout, monitoring, and handling feedback after release.
- Note dependencies on other teams, approvals, vendors or environments. Waiting time goes in the calendar estimate even though it is not effort.

## 2. Estimate each task as a range

For each task give best case (B), likely case (L) and worst case (W) in the same unit.

- B: everything goes right. W: the realistic bad case, not the apocalypse.
- A wide B-to-W spread is information; do not narrow it to look confident.
- Roll-up: the common three-point (PERT) expected value per task is E = (B + 4L + W) / 6. Sum the E values for the planning number; do not sum likely cases, which understates the total because overruns are larger than underruns. Summed B and summed W give the outer range ends, but say that summed W overstates the bad tail, since not every task goes wrong at once.
- Use history if it exists: how long similar past work took, from tickets or git history. Prefer that over gut feel and say which you used.

## 3. Unknowns and spikes

- List every unknown: unfamiliar API, unclear requirement, performance not yet measured, legacy code nobody owns, a dependency's readiness.
- For each, either propose a **spike**: a time-boxed investigation (for example "2 days to prototype the vendor webhook and confirm rate limits") with the question it must answer, or carry it as a risk that widens the range.
- When unknowns dominate, recommend estimating in two stages: commit only to the spikes now, re-estimate after them.

## 4. Scope to fit

When the range does not fit the date or budget, offer options instead of squeezing the numbers:

- Cut or defer Should and Could requirements; name each and its saving.
- Ship a thinner first version: one platform, one customer segment, manual steps behind the scenes, no admin UI, a lower limit.
- Buy or reuse instead of build.
- Add people only when the work splits cleanly and there is time to onboard them; say this rarely shortens a late project.
- Make each option concrete: what is cut, what the user loses, the new range.

Never quietly lower an estimate because the requester wants a smaller number. If pushed, restate the range and offer scope cuts.

## 5. Communicate confidence

- State the range and a confidence level in plain words: "4 to 7 weeks; about 70% confident we finish within 7".
- Say what the estimate assumes (staffing, no major requirement changes, the spike result) and what would move it.
- Name the checkpoint where you will re-estimate (after the spike, at the halfway mark).
- Use the unit asked for. If asked for story points, give points but still list the unknowns.

## Output format

```
## Estimate: <work item>
Done means: <definition>
Assumes: <people, availability, fixed scope, other assumptions>

| # | Task | Best | Likely | Worst | Notes |
|---|------|------|--------|-------|-------|
| 1 | ...  | 1d   | 2d     | 4d    | touches billing/invoice.ts |

Effort: <sum best> to <sum worst> (expected <sum of PERT E>) engineer-days
Calendar: <range> at <availability>, including waits on <dependencies>
Confidence: <level and what it means>
Unknowns and spikes: <list with time boxes>
Scope options if it must be smaller: <option, saving, user cost>
Re-estimate at: <checkpoint>
```

## Reviewing why an estimate was wrong

Compare the original breakdown to what happened: tasks that were missing entirely, tasks that grew, waiting time, scope added mid-way, availability lower than assumed. Report the biggest causes and one change to the next estimate for each. Do not assign blame.

## Never

- Never give a single number without a range and its assumptions.
- Never estimate work you have not broken down; say you need to break it down first.
- Never present a guess about someone else's team as fact; mark it and suggest asking them.

## Neighbours

- Writing the requirements being sized: `prd-writing`.
- An ordered implementation plan with files and tests: the `planner` agent or `/plan-feature`.
