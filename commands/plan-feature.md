---
name: plan-feature
description: Turn a feature request into a step-by-step implementation plan with files to touch, risks and tests, without writing code.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: read-only
  kete-loom/argument-hint: "<feature description>"
  kete-loom/owner: "Kete-org"
---

Plan the feature below. Do not write or edit code; the output is a plan for the user to approve.

If the user gave no feature description, ask for one and stop.

If the `planner` agent is available, delegate to it with the feature description. If the feature changes system boundaries or adds a new service, also ask the `architect` agent for the design first. Otherwise:

1. Search the codebase for the code the feature touches: entry points, data models, existing patterns to reuse, and the tests around them.
2. List open questions. If any would change the design (scope, data shape, who calls it), stop and ask the user before planning further.
3. Write the plan:

```
## Plan: <feature>
Goal: one sentence. Out of scope: ...
Steps
1. <change> in <path>. Done when: <check>.
2. ...
Tests: what to add and where.
Risks: migrations, breaking API changes, performance, security. Mitigation for each.
Open questions: ...
```

Keep each step small enough to land and verify on its own, in an order where the build passes after every step.

Feature: $ARGUMENTS
