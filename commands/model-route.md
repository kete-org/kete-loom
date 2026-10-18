---
name: model-route
description: Recommend which model tier to use for a task (fast, balanced or most capable), weighing complexity, risk and cost, and say how to switch in this host.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: read-only
  kete-loom/argument-hint: "<the task>"
  kete-loom/owner: "Kete-org"
---

Recommend a model tier for the task below. Don't switch models yourself.

Judge the task on three things, briefly:
- **Complexity**: how much reasoning, how many files, how much ambiguity.
- **Risk**: what a mistake costs (security, money, data, production, or a throwaway script).
- **Volume**: one careful pass, or many repetitive calls.

Then recommend one tier:
- **Fast and cheap** for mechanical, well-specified or high-volume work: renames, formatting, boilerplate, simple lookups, bulk classification.
- **Balanced** for everyday feature work and debugging with clear tests.
- **Most capable** for design decisions, subtle bugs, security or payment code, large refactors and anything hard to undo.

Give the recommendation in two or three lines with the reason, name the host's current models in that tier if you know them, and say how to switch here (for example the host's model command or setting). If the task mixes both kinds of work, suggest splitting it.

Task: $ARGUMENTS
