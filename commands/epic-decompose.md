---
name: epic-decompose
description: Break a feature or epic into small, independently shippable issues with acceptance criteria, and create them in GitHub, Jira or Linear after approval.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: network
  kete-loom/argument-hint: "<epic or feature>"
  kete-loom/owner: "Kete-org"
---

Break the epic below into issues that can each be built, reviewed and shipped on their own.

1. Understand the goal. If there is a PRD or spec, read it; if not, ask for the outcome and the constraints, or use the `prd-writing` skill to draft one first.
2. Use the `estimation-and-scoping` skill to cut it into vertical slices (each one delivers something usable), smallest valuable slice first. Note dependencies and spikes for unknowns.
3. For each issue write a title, the why, acceptance criteria as a checklist, dependencies, and a size (S, M, L). Show the full list and ask for changes.
4. **After the user approves**, create them in the tracker the project uses, with the matching skill: `github-api-automation` (or the `gh` CLI), `jira-integration` or `linear-integration`. Link each to the epic and add dependencies. Never create issues before approval.
5. Report the created issue links.

Epic: $ARGUMENTS
