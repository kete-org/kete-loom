---
name: product-discovery
description: Product discovery work that happens before anyone writes a PRD - drafting customer interview guides built on past behaviour rather than opinions, synthesising interview notes into evidenced opportunities, mapping an opportunity solution tree from one outcome, naming and testing the riskiest assumption first, and ranking ideas with RICE, ICE or cost of delay with every score's inputs and source written down. Use when a team is unsure which customer problem to solve next, needs an interview script or a synthesis of user calls, wants an opportunity tree or assumption test, or must prioritise a backlog of ideas in a way others can check.
license: MIT
compatibility: Any Agent Skills host. Works on notes, transcripts and spreadsheets the user provides; no network or CLI needed.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Product discovery

Decide what is worth building, with evidence, before a spec exists. The output of discovery is a chosen opportunity, the assumptions it rests on, and the test results behind them. Writing the PRD afterwards is the `prd-writing` skill's job; sizing the market is `market-research`.

## Ground rules

1. **Start from one outcome.** A measurable product or business outcome ("raise week-4 retention of new teams from 22% to 30%"), not a feature. If the user cannot name one, stop and agree it first.
2. **Behaviour beats opinion.** Ask what people did last time, not what they would do or want. Hypothetical answers ("would you use...?") are not evidence.
3. **Every claim carries its source.** Interview ID, ticket link, analytics query or "assumption". Never blend them.
4. **Kill ideas cheaply.** Test the assumption that would sink the idea, with the cheapest test that could prove it wrong.
5. **Scores show their inputs.** A RICE or ICE number without its reach, impact, confidence and effort written down, with where each came from, is not allowed in the output.

## Workflow

### 1. Frame

Write a one-page frame: outcome and its current baseline, target segment, what is already known (with sources), what is unknown, decision deadline. Ask the user to confirm it before going on.

### 2. Interview guide

Draft a 30 to 45 minute guide (template in `references/interview-guide.md`):

- Screener: criteria that pick people who had the problem recently (last 30 to 90 days).
- Opening: role, context, a typical week.
- Story prompts: "Tell me about the last time you ..." then follow the timeline: trigger, what they tried, tools, who else was involved, what it cost, how it ended.
- Probes: "What happened next?", "How did you decide?", "What did you do instead?"
- Never: leading questions, pitching the solution, asking for price acceptance, or asking "would you..." as a main question.
- Close: anything we should have asked; permission to follow up.

Aim for 5 to 8 interviews per segment before you trust a pattern. Remind the user to get consent for recording and to strip personal data from notes they share.

### 3. Synthesise

For each interview make a snapshot: who, the story in five lines, quotes, pains, desired outcomes, workarounds, surprises. Then across interviews:

1. Tag each observation as a pain, a need or a workaround.
2. Cluster into opportunities phrased as customer problems ("I can't tell which invoices are overdue until a client complains").
3. Count how many interviews support each, and note contradicting ones.
4. Mark anything heard once as a lead, not a finding.

### 4. Opportunity solution tree

Outcome at the root, opportunities below it (split large ones into child opportunities), then at least three candidate solutions under the opportunity you pick, then the assumption tests under each solution. Render it as an indented list or a Mermaid `graph TD`. Pick the target opportunity on: size (how many interviews and how much it hurts), fit with the outcome, and what the team can do.

### 5. Assumptions and tests

For each candidate solution list assumptions in five kinds: desirability (they want it), viability (it works for the business), feasibility (we can build it), usability (they can use it), and ethical or legal risk. Plot each on importance versus evidence, and test the important, low-evidence ones first.

Pick a test from `references/assumption-tests.md` and write it down before running it:

```
Assumption: Team admins will invite colleagues within their first day
Test: Fake-door "Invite your team" button on day-1 dashboard for 2 weeks
Metric: share of new admins who click it
Pass if: >= 25%   Fail if: < 10%   In between: rerun with copy variant
Owner / date: ...
```

Set pass and fail thresholds before seeing data. A test with no fail line is not a test.

### 6. Prioritise

Use the method the team already uses; otherwise RICE for a backlog of comparable ideas, ICE for quick early sorting, cost of delay (CD3 = cost of delay / duration) when timing matters. Formulas and scales in `references/prioritisation.md`. Present a table with one row per idea and a column for every input plus its source, then the score, then a one-line reason. Flag any score whose confidence input is "gut feel".

## Stop and ask the user

- No outcome or baseline can be named.
- Interview notes contain personal data the user may not have consent to share.
- The ranking flips when one input changes by a plausible amount; show that and ask which estimate to trust.
- The user wants to skip to a PRD while the riskiest assumption is untested; say so plainly, then follow their call.

## Never

- Invent interview quotes, user counts or survey numbers.
- Treat a synthetic persona's answer as customer evidence (see `persona-panels` for what those are good for).
- Present a score as more precise than its inputs (no "RICE 347.5" from guesses).

## Output

A discovery brief in Markdown: frame, interview summary (N, segments), opportunity list with evidence counts, the tree, the assumption table with test plans and results so far, the prioritisation table, and a recommendation with what would change it.
