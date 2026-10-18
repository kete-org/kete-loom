---
name: skill-create
description: Create a new Agent Skill for a repeated workflow, to the Kete Loom spec, with trigger evals, and check it before use.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<the workflow to capture>"
  kete-loom/owner: "Kete-org"
---

Use the `skill-authoring` skill if it is available; it has the full method. In short:

1. Capture the workflow: what it does, what "done" looks like, 3 to 5 requests that should load it and 3 to 5 near misses that should not, the steps and the stop-and-ask points. If it is really a one-line rule, suggest `/learn` instead.
2. Choose the location: the project's skill folder (for example `.claude/skills/<name>/` or `.agents/skills/<name>/`) or, for Kete Loom itself, `skills/<name>/`. Ask if unclear.
3. Write `SKILL.md` (portable frontmatter, a description that says what it does and "Use when …", a short body) and `evals/triggers.json`.
4. Check it: `npx @ketecode/loom check <folder>`, and fix every error.
5. Suggest trying the should-trigger requests in a new session to see it load.

Workflow: $ARGUMENTS
