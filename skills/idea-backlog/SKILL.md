---
name: idea-backlog
description: Parking lot for ideas that come up mid-task, kept as small plain Markdown files under .planning/backlog/ - quick notes, todos, backlog items and seeds, where a seed is an idea saved together with the trigger condition that will make it worth revisiting - plus a periodic review that promotes, keeps or deletes every entry and flags seeds whose trigger has now been met. Use when the user says "note that for later", "add a todo", "park this idea", "remind me when we add payments", wants to list or clean out saved ideas, or is starting a new milestone and wants to know which parked ideas are now relevant.
license: MIT
compatibility: Any Agent Skills host. Writes plain Markdown files in the repository; git is optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Idea backlog

Good ideas arrive at bad times. Write each one down in under a minute, then go straight back to the task in progress. Deciding what an idea is worth happens later, in a review, never at capture time.

## Where entries live

```
.planning/backlog/
├── notes/       # a thought, observation or question; no action implied
├── todos/       # a small, concrete action ("rename X", "add a test for Y")
├── items/       # a larger piece of work that would need its own plan
└── seeds/       # an idea plus the condition that makes it relevant later
```

- If the project already keeps ideas somewhere else (an `IDEAS.md`, a `docs/backlog/` folder, a tracker the user named), use that and follow its format. Ask once if two candidates exist.
- One file per entry, named `YYYY-MM-DD-<short-slug>.md` (date from the system clock, slug of 3-6 words). One file per entry keeps merges clean and lets a review delete entries one at a time.
- Before creating `.planning/`, check `.gitignore`. Whether the backlog is committed is the user's call; ask the first time and follow that answer afterwards.

## Entry format

```markdown
---
kind: note | todo | item | seed
created: 2026-10-18
status: open
source: <file:line, branch, or "conversation">
trigger: <seeds only: the observable condition, see below>
---
# <one-line title>

<1-5 lines: what, and why it came up. Quote the user if they phrased it.>
```

Keep entries short. If it takes more than five lines to explain, it is an `item`, and the detail belongs in a plan when it is promoted.

## Capturing

1. Classify it with the first rule that fits:
   - Has a "when", "once", "if we ever" or "after" condition → `seed`.
   - Concrete and doable in under an hour → `todo`.
   - Needs design or several steps → `item`.
   - Otherwise → `note`.
2. Search the backlog for an existing entry on the same thing (grep the titles and slugs). If one exists, append a dated line to it instead of making a duplicate.
3. Write the file, then reply in one line: `Saved <kind>: <path>`. Then resume the current task exactly where it was.

Never, at capture time:
- Start the work, edit code for it, or research it beyond what is needed to word it clearly.
- Debate whether the idea is good. Capture first, judge in review.
- Open an issue in a tracker. Promotion to a tracker happens in review, and only when the user says so (the `issue-sync`, `jira` or `epic-decompose` items can do that part).

## Writing a seed trigger

A trigger must be something you can check later by reading the repository or asking one question. Rewrite vague ones:

| Vague | Checkable |
|---|---|
| "when we scale" | "when any table passes 1M rows, or p95 latency on /search exceeds 500 ms" |
| "later" | "when a milestone named 'v2' or 'billing' is started" |
| "if users ask" | "when 3 or more issues mention bulk export" |
| "after the refactor" | "when `src/legacy/` no longer exists" |

Prefer triggers based on files, dependencies, milestone or plan names, dates, or issue counts. If you cannot make the trigger checkable, ask the user one question; if they don't know, save it as a `note` instead.

## Reviewing

Run a review when the user asks, when a plan, milestone or release starts (offer it then, don't run it unasked), or when the backlog passes about 30 open entries (suggest it, don't force it).

1. List every open entry, grouped by kind, oldest first.
2. Check each seed's trigger against the current state: search the codebase, read `package.json` or equivalent for dependencies, list plan and milestone files, and query the tracker only if the trigger names one and its CLI is available. Mark each seed `met`, `not met` or `can't tell`.
3. Propose one action per entry and show the whole list before changing anything:
   - **promote**: move into the real workflow (a plan, a spec, a tracker issue, or the current todo list). Promoting an `item` usually means handing it to the `implementation-plans` or `design-brainstorming` skill, or, if the project keeps a `.planning/ROADMAP.md`, to `project-roadmap` as a new phase or requirement.
   - **keep**: still plausible, not now. Seeds whose trigger is not met are kept by default.
   - **delete**: done, obsolete, or no longer wanted. Prefer deleting over keeping a pile nobody reads.
   - **merge**: two entries are the same idea; keep the clearer one and fold the other's lines in.
4. **Stop and ask** the user to confirm or change the actions. They may answer per entry or in bulk ("delete all notes older than 90 days").
5. Apply only what they approved. Delete files outright (git history keeps them if committed); set `status: promoted` with a pointer (`promoted_to: <path or issue URL>`) when the target is outside the backlog.
6. Report:

```
## Backlog review: <date>
Seeds now relevant: <title> - trigger "<trigger>" met because <evidence>
Promoted: <n> (<titles and where they went>)
Kept: <n>   Deleted: <n>   Merged: <n>
Still open: notes <n>, todos <n>, items <n>, seeds <n>
```

## Surfacing seeds without a full review

When starting a plan, milestone or feature, read only the `seeds/` folder and check triggers that relate to it. Mention matching seeds in at most three lines ("Parked idea now relevant: ..."), and leave acting on them to the user.

## Rules

- Never delete or rewrite an entry without the user's approval during a review.
- Never put secrets, customer data or credentials in a backlog file; reference where they live instead.
- Do not let a capture grow into a design session. If the user wants to explore the idea now, that is `design-brainstorming`; if they want to test whether it is even possible, that is `feasibility-spike`.
