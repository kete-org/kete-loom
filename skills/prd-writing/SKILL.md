---
name: prd-writing
description: Product requirements document (PRD) drafting that starts from the user problem and the evidence for it, sets goals and explicit non-goals, describes target users and scenarios, writes numbered requirements each with testable acceptance criteria and a priority, picks success and guardrail metrics with baselines, lists open questions with owners, and plans a staged rollout. Use when a product manager or engineer needs a PRD, product spec or feature brief written, reviewed or tightened before design and engineering commit to building it.
license: MIT
compatibility: Any Agent Skills host. No tools required; reads existing docs or code when the user points to them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# PRD writing

A PRD says what problem to solve, for whom, and how you will know it worked. It does not say how to build it; that belongs in a design doc or an implementation plan.

## 0. Before you write

1. Collect what exists: the request, user research, support tickets, analytics, sales notes, earlier docs. Search the repo or docs folder if the user points to one.
2. Answer these five questions. If you cannot answer the first two, **stop and ask the user**; do not invent a problem or evidence.
   - What problem, for which users?
   - What evidence says it is real and worth solving now (numbers, quotes, tickets, lost deals)?
   - What does success look like, measurably?
   - What is out of scope?
   - What deadline or constraint is fixed (legal date, launch event, contract)?
3. Find the house template. If the team has one, use its headings and add missing sections below rather than replacing it.

## 1. Problem and evidence

- State the problem from the user's side in two to four sentences. No solution words ("we need a dashboard") in the problem statement.
- List evidence with its source and date. Mark anecdote as anecdote. If evidence is thin, say so and add "validate the problem" as an open question.
- Say why now: what it costs to wait.

## 2. Goals and non-goals

- Goals: three at most, each an outcome, not a feature ("cut time to first invoice below 5 minutes", not "add an invoice wizard").
- Non-goals: things a reader could reasonably expect that you will not do. Each non-goal prevents a later argument, so be specific.

## 3. Users and scenarios

- Name the primary user segment and any secondary ones. Use real segments the team already tracks, not invented personas with names and hobbies.
- Write three to six scenarios: who, situation, what they try to do, what success looks like for them. Include at least one edge or failure scenario (no data yet, permissions missing, offline, large account).

## 4. Requirements

Number every requirement so reviews and tickets can cite it. Use this shape:

```
R3 (Must): An admin can invite a teammate by email from the Members page.
  Acceptance:
  - Given an admin on Members, when they submit a valid email, then an invite is sent and appears as Pending.
  - Given an email already on the team, when they submit it, then they see "already a member" and no invite is sent.
  - Invites expire after 7 days. (Open question Q2: confirm with security.)
```

Rules:

- Priority on every requirement: Must, Should or Could. If more than about half are Must, push back: ask what ships if time runs out.
- Acceptance criteria are observable and testable. Ban "fast", "easy", "intuitive" and "seamless" unless given a number or a check.
- Cover non-functional needs the user cares about: performance targets, accessibility, privacy and data retention, localisation, permissions, audit.
- Describe behaviour, not UI layout or architecture, unless the constraint is real (for example "must work inside the existing mobile app").

## 5. Metrics

- One primary success metric tied to the goals, with current baseline, target and the date you will read it.
- One to three guardrail metrics that must not get worse (error rate, support tickets, churn, latency).
- Say where each metric comes from. If the event or query does not exist yet, add tracking as a requirement.
- If there is no baseline, say so; do not guess one.

## 6. Open questions and risks

Table of open questions, each with an owner and a date it must be answered by. Risks get a likelihood, an impact and a mitigation. Anything legal, privacy, security or pricing related gets flagged for the owning team; do not answer it yourself.

## 7. Rollout

- Stages: internal, beta or percentage rollout, general availability. Say who is in each and what signal moves you to the next.
- Feature flag or kill switch, and what turning it off does to users mid-flow.
- Migration of existing data or users, support and docs readiness, and who announces it.
- For deploy mechanics (canary, blue-green, flags) defer to the `deployment-strategies` skill if available.

## Output format

Write the PRD as Markdown (or into the user's template) with these headings in order:

```
# <Feature>: PRD
Status: Draft | In review | Approved   Owner: <name>   Last updated: <date>
## Summary            (three sentences: problem, proposal, expected result)
## Problem and evidence
## Goals
## Non-goals
## Users and scenarios
## Requirements        (R1..Rn, priority, acceptance criteria)
## Metrics             (primary, guardrails, baseline, target, source)
## Open questions      (Q1..Qn, owner, due)
## Risks
## Rollout
## Appendix            (research links, mockups)
```

Keep it short enough to read in ten minutes. Move research detail to the appendix.

## Reviewing an existing PRD

Check in this order and report findings as a list, most serious first:

1. Is the problem stated without a solution, and is there evidence?
2. Are goals outcomes with numbers? Are non-goals present?
3. Does every requirement have a priority and testable acceptance criteria?
4. Is there a primary metric with a baseline and a guardrail?
5. Do open questions have owners and dates?
6. Is there a rollout and a way to turn it off?

## Never

- Never invent user quotes, research findings, metrics or baselines. Mark gaps as open questions.
- Never pick an implementation (database, framework, architecture) in the PRD; record it as a constraint only if it truly is one.
- Never mark the PRD Approved; only the named approvers can.

## Neighbours

- Recording a technical decision: `architecture-decision-records`.
- Turning an agreed PRD into files and steps: the `planner` agent or `/plan-feature`.
- Sizing the work: `estimation-and-scoping`.
