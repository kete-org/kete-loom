---
name: feature-dev
description: Build a feature end to end: plan it, implement it test-first, review it and verify it, stopping for approval between stages.
license: MIT
metadata:
  kete-loom/version: "0.2.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<the feature>"
  kete-loom/owner: "Kete-org"
---

Build the feature below in stages. Stop after each stage, show the result, and wait for the user before starting the next.

1. **Design.** If the feature is more than a small, well-defined change, agree the design first with the `design-brainstorming` skill (one question at a time, two or three approaches, approval per section). Skip this for small changes.
2. **Plan.** Write the plan with the `implementation-plans` skill, or use the `planner` agent (otherwise plan it yourself): files to touch, tests to add, risks, and anything to ask. Ask the open questions now. For larger work, offer an isolated workspace with the `git-worktrees` skill.
3. **Build test-first.** Follow the `tdd-workflow` skill: a failing test for each behaviour, the smallest change that passes it, then refactor with the suite green. For a plan with several tasks on a host with subagents, run it with the `subagent-driven-development` skill. Keep to the plan; if the plan turns out wrong, stop and say so.
4. **Review.** Run `/review` (or the language reviewer agent, or `code-reviewer`) on the change. Fix what it finds that is in scope, and list the rest.
5. **Verify.** Run the project's checks with the `verification-loop` skill (or `/verify`) and report pass or fail per check.

Finish with a short summary: what changed, the tests added, the checks run, and anything left. Don't commit or push unless the user asks; when they want to wrap up, use the `finishing-a-branch` skill (or `/finish-branch`).

Feature: $ARGUMENTS
