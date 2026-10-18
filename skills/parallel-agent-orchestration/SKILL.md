---
name: parallel-agent-orchestration
description: Fans a large coding job out to several subagents at once and merges the results. Covers cutting the job into independent units with disjoint file ownership, writing a self-contained brief and return contract for each worker, isolating writers in separate git worktrees or branches, and checking every result before integrating it. Use when work splits naturally into pieces that can run side by side (many modules, many packages, a survey plus several fixes), or when the user asks to run agents in parallel or orchestrate a team of subagents.
license: MIT
compatibility: Any Agent Skills host that can start subagents. Worktree isolation needs git 2.17 or later (for git worktree remove).
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---

# Parallel agent orchestration

You are the orchestrator. Workers do the units; you own the plan, the contracts, the merge and the final verification. Parallelism only pays when units are truly independent. Two agents editing the same file is a merge conflict you chose.

## 1. Decide whether to parallelise

Parallelise only if all are true:

- The work splits into 2 or more units that don't need each other's output to start.
- Each unit can be checked on its own (a test, a lint, a build, a clear review question).
- The units touch different files, or are read-only.

Otherwise do it sequentially, or run a read-only survey in parallel and the edits in sequence. If the split is unclear, **stop and propose the split to the user** before starting workers.

## 2. Cut the units

1. Search the codebase to map what each unit touches. Write the plan as a table:

   | Unit | Goal | Owns (may edit) | May read | Check command |
   |---|---|---|---|---|

2. Give every file at most one owner. Shared files (lockfiles, `package.json`, route tables, barrel `index` files, generated catalogs, changelogs) belong to **you**: workers report what they need there and you apply it at merge time.
3. Do shared groundwork first and yourself: interfaces, types, config that several units depend on. Commit it, then start workers from that commit.
4. Keep the count small. Three to six workers is easier to verify than twenty. More units than that: run in waves.

## 3. Isolate writers

- Read-only workers (search, review, research) can share the working tree.
- Writing workers each get their own worktree and branch, so they can't clobber each other:

  ```
  git worktree add -b work/<unit> ../<repo>-<unit> <base-sha>
  ```

  Start every worktree from the groundwork commit of step 2. If the host creates worktrees for its subagents itself, use those instead. Remove them after merging with `git worktree remove ../<repo>-<unit>`.
- If the host runs workers in the same tree, ownership from step 2 is the only protection: state it in every brief.

## 4. Write each brief

A worker starts with none of your context. Every brief contains:

```
Goal: <one sentence, the outcome>
Context: <the 3-6 facts it needs: paths, conventions, decisions already made>
You own: <files/folders you may edit>. Do not edit anything else.
Do not: <push / commit anywhere but work/<unit> / install dependencies / touch shared files / ask the user>
Done when: <check command> passes and <acceptance criteria>
Return exactly:
  status: done | blocked | partial
  changed: list of paths
  check: <command> -> <result>
  needs_from_orchestrator: shared-file changes or decisions, or "none"
  notes: max 5 lines
```

Ask for a fixed, short return format. Free-form essays are hard to merge and eat your context.

## 5. Run and watch

- Start the independent workers together. Don't start a worker whose inputs aren't ready.
- If a worker returns `blocked`, decide yourself or **ask the user**; don't let it guess.
- Don't re-run a failed worker with the same brief. Fix the brief (missing context, wrong ownership) first.

## 6. Verify every result

Treat worker output as a claim, not a fact:

1. Check `changed` against ownership: `git diff --name-only <base-sha>..work/<unit>`, plus `git -C ../<repo>-<unit> status --short` for anything left uncommitted. Any file outside its ownership: reject or redo that part.
2. Re-run the unit's check command yourself.
3. Read the diff. Look for skipped or deleted tests, stubs, TODOs and silent scope creep.

## 7. Merge

1. Merge units one at a time onto the integration branch, in dependency order.
2. Apply the `needs_from_orchestrator` changes to shared files yourself.
3. After each merge run the affected checks; after the last, run the project's full check (tests, lint, build).
4. On a conflict, resolve it yourself with both briefs in mind, or redo the smaller unit on top of the merged result. Never pick a side blindly.

## Report

```
Units: <n> (<n> done, <n> redone, <n> dropped)
Merged: <branch> at <sha>
Full check: <command> -> <result>
Left over: <blocked items and open questions>
```

## Never

- Never give two workers write access to the same file.
- Never merge a unit you haven't re-checked yourself.
- Never let workers commit to the integration branch or push.
- Never parallelise a task whose steps depend on each other's results just to go faster.
