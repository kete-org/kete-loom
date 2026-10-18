---
name: design-brainstorming
description: Collaborative design session that turns a rough idea into an approved design before any code is written. Reads the project first, asks one question per message (multiple choice where possible) to settle purpose, users, constraints and success criteria, offers two or three approaches with trade-offs and a recommendation, walks the design through in short sections approved one at a time, cuts anything not needed now, and saves a dated design doc in the repo for the implementation-plans skill to pick up. Use when someone has an idea, feature or change they want to build but the what and why are not pinned down yet, or says "let's think this through before we code".
license: MIT
compatibility: Any Agent Skills host. Reads the repository and writes one Markdown design doc.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Design brainstorming

Find out what the user actually wants, and why, before anything gets built. The output is an approved design doc, not code. Don't write, scaffold or edit source files during this skill.

Neighbours: `prd-writing` is for a full product requirements document for stakeholders; the `architect` agent compares system-level structures; `planner` and `implementation-plans` turn an approved design into steps. This skill sits before them.

## 0. Size the ceremony

Decide how much process the request needs before you start:

| Request | What to do |
|---|---|
| Fully specified and tiny ("make the button label say Save") | Skip this skill. Do it, say what you did. |
| Small change, one or two open points | Ask those questions, state the design in a few lines, get a yes, go. No doc unless asked. |
| A feature, a new module, anything touching data shape, APIs or several files | The full flow below, with a design doc. |
| Several independent subsystems ("build a marketplace with chat, payments and reviews") | Stop and propose splitting it into separate designs. Agree which one goes first, then run the flow on that one. |

Always tell the user they can say "skip the questions and just start". If they do, state the one or two big choices you're making (language, storage, where it lives) in a line each and hand over to the normal workflow.

## 1. Read before you ask

Look at the project before the first question so you don't ask what the repo already answers:

- README, `AGENTS.md` or similar, existing design docs and ADRs (`docs/`, `docs/adr/`, `docs/designs/`).
- The code nearest the idea: where similar features live, the data models, the frameworks in use.
- Recent commits in that area.

Note what you learned in two or three lines in your first message, so the user can correct a wrong assumption early.

## 2. Ask, one question per message

Work through these in roughly this order, skipping any the request or the code already answers:

1. **Purpose**: what problem it solves, the moment someone wishes it existed.
2. **Users**: who uses it, how often, how technical.
3. **Scope**: the one thing it must do on day one; what is explicitly out.
4. **Constraints**: deadlines, platforms, performance, compliance, budget, things that must not change.
5. **Success**: how we'll know it works (an observable behaviour or a number).

Rules:

- **One question per message.** Never a list of questions.
- Prefer multiple choice: 2 to 4 labelled options plus "something else". Open questions only where options would lead the answer.
- Use the user's words. No process jargon.
- If an answer is vague, ask a follow-up that offers concrete examples, rather than filling the gap yourself.
- Stop asking when you could explain the design to a new teammate without guessing. Usually 3 to 8 questions.

## 3. Offer approaches

Present **two or three** genuinely different approaches, then recommend one:

```
A. <name>: <how it works in 1-2 lines>. Good: ... Costs: ...
B. ...
C. ...
Recommendation: B, because <the constraint or goal it serves best>.
```

Ground them in this codebase (reuse what exists), not generic patterns. If one approach is clearly right, say so and offer a single alternative only for contrast. Wait for the user to pick.

## 4. Walk the design through in sections

Present the chosen design in short sections, each a few sentences to a short list, and **get a yes on each before the next**. Pick the sections that apply:

1. Overview: what it is and what it isn't.
2. Components and where each lives (existing files to extend, new files and why).
3. Data: shapes, storage, migrations.
4. Interfaces: API routes, function signatures, UI screens, events.
5. Flow: the main path step by step, then failure and edge cases.
6. Testing: how each behaviour will be proved.
7. Rollout: flags, migration order, backwards compatibility.

When the user changes something, revise that section and re-confirm it. Go back to an earlier section if a later answer breaks it.

**Cut ruthlessly.** For every element ask "is this needed for the first version?" Remove configuration, extension points, generalisations and "nice to have" items nobody asked for, and list them under "Not now" so the decision is visible.

## 5. Write the design doc

1. Save it to the folder the project already uses for designs. If there is none, use `docs/designs/YYYY-MM-DD-<topic>.md` with today's date, and say where you put it.
2. Use this layout:

```markdown
# <Topic> design
Date: YYYY-MM-DD    Status: approved
## Problem and users
## Goals / success criteria
## Out of scope / not now
## Chosen approach (and alternatives considered)
## Components, data, interfaces
## Main flow and edge cases
## Testing
## Rollout and risks
## Open questions
```

3. Re-read it once: no placeholders, no contradictions between sections, every success criterion testable, nothing in it the user didn't approve.
4. Ask the user to read the file and confirm. Commit it only if they agree (or the project's workflow says design docs are committed).

## 6. Hand off

Once the doc is approved, offer the next step: the `implementation-plans` skill (or the `planner` agent) to turn it into tasks. Don't start implementing inside this skill.

## Stop and ask

- The idea conflicts with something in the codebase or an earlier decision (an ADR, a documented constraint).
- It touches regulated data, payments, security or irreversible data changes: flag it and suggest the matching review (`threat-modeling`, `privacy-compliance`, `payments-reviewer`).
- The user's answers contradict each other.

## Never

- Never write implementation code, scaffolding or migrations during brainstorming.
- Never ask more than one question in a message.
- Never present a single option as if it were a choice, or hide a trade-off.
- Never pad the design with features to look thorough.

## Report

At the end, reply with: the design doc path, the chosen approach in one line, the "not now" list, open questions, and the suggested next step.
