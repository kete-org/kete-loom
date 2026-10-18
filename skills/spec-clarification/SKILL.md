---
name: spec-clarification
description: Requirements interrogation for one already-scoped phase, feature or ticket before anyone plans it, scoring how ambiguous the goal, boundaries, constraints and acceptance checks still are, listing the gray areas, optionally switching to assumptions mode (stating what would be assumed, with file:line evidence from the codebase, for the user to correct), probing edge cases and "must never happen" prohibitions, and locking the answers into a SPEC.md with a short discussion log. Use when the direction is already chosen but the exact behaviour is not - "before we plan phase 3, nail down what it must do", "what's unclear about this ticket", "list your assumptions about this change so I can correct them" - and not for choosing between approaches.
license: MIT
compatibility: Any Agent Skills host. Reads the codebase; writes one SPEC file and a discussion log.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Spec clarification

Turn one scoped piece of work into a spec a planner can't misread. The direction is already chosen; this pins down exactly what it does, where it stops, what it must never do, and how anyone will know it works.

Not this skill: choosing between approaches or shaping a vague idea (use `design-brainstorming`), writing a product document for stakeholders (use `prd-writing`), or breaking work into tasks (use `implementation-plans` or the `planner` agent).

## 0. Find the input

1. Identify the unit of work: a roadmap phase (see `project-roadmap`), a ticket, a design doc section or the user's description. If it covers more than one independently shippable thing, **stop and ask** which one to clarify first.
2. Read what already exists: the phase entry and its requirement IDs, `PROJECT.md` constraints and locked decisions, any earlier SPEC or CONTEXT files, a design doc. Never ask a question one of these already answers.
3. Search the codebase for the code the change will touch and the closest existing feature. Note conventions, data shapes and helpers that constrain the answer.
4. Decide where the spec goes: `.planning/phases/<NN>-<slug>/SPEC.md` when the project uses `.planning/`, otherwise `docs/specs/<YYYY-MM-DD>-<slug>.md`. If a SPEC already exists, update it instead of starting over, and say so.

## 1. Score the ambiguity

Score four dimensions from what you have read, before asking anything. Each scores 0 (unknown), 1 (partly clear) or 2 (clear enough to plan from):

| Dimension | Clear (2) means |
|---|---|
| Goal | One sentence says who can do what afterwards, and why it matters |
| Boundaries | It is written down what is in, what is out, and what neighbouring code must not change |
| Constraints | Performance, security, compatibility, data and dependency limits are known, or known not to matter |
| Acceptance | Each behaviour has a check someone could run and see pass or fail |

Show the scores in one line, for example `Goal 2 · Boundaries 1 · Constraints 0 · Acceptance 1`. The spec is ready when all four are 2, or when the user explicitly accepts a 1 and the risk is recorded.

## 2. List the gray areas

Write the questions that, answered differently, would change what gets built. Group them by dimension, put the ones that block the most behaviour first, and drop any whose answer would not change the code. Usually five to twelve. Show the list so the user sees the whole terrain before answering.

## 3. Resolve them: interview or assumptions mode

Offer both modes in one line and let the user pick. If they don't pick, use the interview for user-facing work and assumptions mode for internal, code-heavy work, and say which you chose.

**Interview mode.** One question per message. Offer two to four concrete options with your recommendation and why, and always allow "other". After each answer, rescore and say which dimension moved.

**Assumptions mode.** Faster for code-heavy work where the codebase answers most questions.

1. For each gray area, state what you would assume and the evidence, for example: `Assume refunds reuse PaymentService.reverse() (src/payments/service.ts:88); if wrong, a second reversal path is built`. Hand this to the `assumptions-analyzer` agent when it is available and the change touches more than a few files.
2. Mark each assumption `confident`, `likely` or `unclear`.
3. Present them in one numbered list and ask the user to reply with only the numbers they disagree with, plus corrections.
4. Ask the `unclear` ones as interview questions; they never become decisions by silence.

Either way, stop after about eight rounds and ask whether to keep going, lock what's settled and record the rest as open, or narrow the scope.

## 4. Probe the edges

Once the main behaviour is clear, run the probes in `references/probes.md` that match the change's inputs and outputs: empty, boundary, duplicate, concurrent, partial-failure, permission and time-based cases. Ask only about cases the answers so far don't cover. Each answer becomes a requirement line or an explicit "out of scope".

## 5. Probe the prohibitions

Ask: "What must never happen, even if everything else works?" Then offer candidates from `references/probes.md` that fit the domain (data loss, a charge without an order, a message to the wrong person, a secret in a log, a breaking change to a public API). Each prohibition the user confirms becomes a `NEVER` line with a check that would catch it. These are the lines a reviewer reads first.

## 6. Lock the spec

Write the SPEC file:

```markdown
# Spec: <name>
Source: <phase NN, ticket, design doc>   Requirements: <IDs, if any>
Status: locked <YYYY-MM-DD>   Scores: Goal 2 · Boundaries 2 · Constraints 2 · Acceptance 2

## Goal
<one sentence>

## Behaviour
1. <REQ-ID or S-1>: <behaviour>. Check: <how to see it pass or fail>

## Never
- N-1: <prohibition>. Check: <test, query or review step that catches it>

## Out of scope
- <thing>, because <reason>

## Constraints
- <constraint and source>

## Decisions
| # | Question | Decision | Decided by |
|---|----------|----------|------------|
| D-1 | <gray area> | <answer> | user / assumption confirmed / locked earlier |

## Open
- <question still unanswered, its owner, and what the planner should do meanwhile>
```

Then append a discussion log at the end of the file, or in `DISCUSSION.md` beside it when it runs past about 30 lines: each question in one line, the options offered, the answer, the date. It explains later why a decision was made.

Show the spec and ask for approval. On approval, mark it locked, record any decision that changes project scope in `PROJECT.md` when `.planning/` is used, and hand it to `implementation-plans` or the `planner` agent. Commit the spec on its own.

## Rules

- Never invent an answer the user did not give or confirm. A silent assumption in the spec is a defect.
- Never widen scope. A good idea outside the boundary goes under "Out of scope" or to the user as a separate item.
- Never write implementation detail (file layout, function names) unless the user decided it; that's the planner's job.
- Don't re-ask a locked decision from an earlier phase. If new information contradicts it, show the conflict and ask whether to reopen it.
- Every behaviour and every `Never` line needs a check. If no check is possible, say so in "Open".
