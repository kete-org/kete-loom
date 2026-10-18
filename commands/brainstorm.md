---
name: brainstorm
description: Turn a rough idea into an approved design before any code is written, asking one question at a time and comparing approaches.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<idea or feature>"
  kete-loom/owner: "Kete-org"
---

Shape the idea below into a design the user approves. Do not write or change any code during this command.

If the user gave no idea, ask what they want to build and stop.

If the `design-brainstorming` skill is available, follow it. Otherwise:

1. Read the relevant code, docs and recent commits so questions are grounded in the project.
2. Ask clarifying questions one at a time (purpose, users, constraints, what success looks like), preferring multiple-choice questions.
3. Propose two or three approaches with their trade-offs, and recommend one with the reason.
4. Present the design in short sections (scope, components, data flow, error handling, testing), asking after each whether it looks right.
5. When the user approves, offer to save it as a design document and to turn it into an implementation plan (`implementation-plans` skill or `/plan-feature`).

Idea from the user: $ARGUMENTS
