---
name: progress
description: Show where the project stands from its .planning/ files, git and handoff notes, and name the single next action, stopping at hard gates such as unverified phases or open blockers.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[milestone, phase or --next]"
  kete-loom/owner: "Kete-org"
---

Report where this project stands and what to do next. Do not edit any files unless the user passed `--next` and approves the action.

1. Use the `project-roadmap` skill if it is available; its file layout and gates apply. Either way, read `.planning/STATE.md`, the current milestone in `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` and `.planning/DEFECTS.md`, plus the newest session handoff note if there is one (usually `.handoff/*.md`, `HANDOFF.md` or `docs/handoff/`).
2. If there is no `.planning/` folder, say so, summarise recent work from `git log --oneline -15`, `git status` and any handoff note, and suggest `project-roadmap` to set one up. Stop.
3. Check the files against git: commits since `STATE.md`'s last activity, uncommitted changes, and whether the current phase's folder holds what its status claims. Report any drift rather than trusting the files.
4. Find the next action, applying hard gates in this order; the first that applies is the answer:
   - Planning files out of date with git: repair them first (`project-roadmap`), because every later gate reads them.
   - A phase marked `done` or `verifying` with failed or unchecked success criteria: verify it before anything else.
   - An open blocker or a `critical` defect against the current phase: resolve or get it accepted.
   - `STATE.md` says "between milestones": start the next milestone (`project-roadmap`).
   - The current phase has no locked spec: clarify it (`spec-clarification`).
   - It has a spec but no checked plan: plan it and run the `plan-checker` agent.
   - It has a checked plan: build it (`subagent-driven-development` or `implementation-plans`).
   - Every phase in the milestone is done: close the milestone.
5. Report:

```
Milestone: <version> - <name>     Phase: <NN> <name> (<status>)
Requirements: <met>/<total> met, <n> unmapped, <n> deferred
Open: <blockers and critical defects, or "none">
Last activity: <date> - <what>   Drift: <none or one line per mismatch>
Next: <one action, and the skill or agent that does it>
```

With `--next`, ask once to start that action, then hand it to the named skill or agent. Never skip a gate to get to building.

Focus from the user, if any: $ARGUMENTS
