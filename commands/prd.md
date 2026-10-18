---
name: prd
description: Draft a product requirements document for a feature, with problem, users, requirements, success metrics and open questions.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<feature or problem>"
  kete-loom/owner: "Kete-org"
---

Draft a product requirements document (PRD) for the feature below. Do not write implementation code.

If the user gave no feature or problem, ask for one and stop.

If the `prd-writing` skill is available, follow it. Otherwise:

1. Gather context: search the repo for existing docs, related features and any linked issue the user mentioned. Note what you could not find.
2. Ask the user, in one message, for anything that would change the PRD: target users, the problem evidence, constraints (deadline, platforms, compliance) and how success is measured. If they cannot answer, mark each gap as an open question rather than inventing it.
3. Write the PRD:

```
# PRD: <feature>
Status: draft. Owner: <name or TBD>. Date: <today>
## Problem
## Users and use cases
## Goals / Non-goals
## Requirements
- R1 (must): ... Acceptance: ...
- R2 (should): ...
## Success metrics (baseline -> target)
## Risks and dependencies
## Open questions
```

4. Ask where to save it (suggest `docs/prd/<feature-slug>.md`) before writing the file.

Never state user research, metrics or dates you were not given; label assumptions as assumptions.

Feature: $ARGUMENTS
