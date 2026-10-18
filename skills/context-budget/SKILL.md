---
name: context-budget
description: Keeps a long agent task inside its context window by deciding what to read in full versus search for, reading files in slices, summarising findings into a running notes file, pushing bulky reads and log analysis to subagents that return short answers, and checkpointing before the window runs out. Use when a task spans many files or huge outputs (logs, lockfiles, generated code, large diffs), when earlier details start getting lost, or when the user warns the session is close to its context limit.
license: MIT
compatibility: Any Agent Skills host. Subagent delegation needs a host that supports subagents.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Context budget

The context window is the agent's working memory. Everything you read, every command output and every long reply spends it. When it fills, the host compacts or truncates and early details (the goal, constraints, decisions) are the first to blur. Spend it on what changes your next action.

## 1. Set the budget at the start

1. Write the goal and the hard constraints in 3 to 5 lines in a notes file (for example `.handoff/notes.md` or the host's scratch area). This survives compaction; your memory does not.
2. Estimate the size of the job: how many files, how big the outputs. If it clearly won't fit in one session, plan checkpoints now (section 6).

## 2. Search before you read

Decision rule for every file or output:

| Situation | Do |
|---|---|
| You need to know *where* something is | Search (file name or text search). Don't open files to look. |
| You need one function or section | Search for it, then read only that line range. |
| File is small (under ~300 lines) and central to the change | Read it in full once. |
| File is large, generated, minified, a lockfile or vendored | Never read in full. Search inside it or read a slice. |
| You already read it and haven't changed it | Don't reread. Use your notes. |
| You changed it | Reread only the edited region to confirm. |

## 3. Keep command output small

- Filter at the source: `grep`, `head -n 50`, `tail -n 50`, `wc -l`, `--stat`, `--name-only`, `--quiet`, a test runner's "only failures" flag.
- Run the single failing test, not the whole suite, while iterating. Run the full suite once at the end.
- Redirect huge output to a file, then search the file: `cmd > out.log 2>&1; grep -n "ERROR" out.log | head` (use the host's scratch or temp directory, not the repo, for `out.log`).
- Never paste a full log, diff or dependency tree into the conversation when a count or the first error answers the question.

## 4. Summarise as you go

After each investigation step, append 1 to 3 lines to the notes file:

```
- auth: tokens are checked in src/middleware/auth.ts:40-88 (verifyToken). Refresh is NOT handled there.
- tests: npm test -- auth -> 12 pass, 1 fail (refresh.test.ts "expired token")
- decided: fix in verifyToken, not the client, because the client is shared by 3 apps
```

Write file paths and line numbers, so you can return to the source instead of keeping its text in context.

## 5. Delegate bulky reads

Hand work to a subagent when it means reading a lot to produce a little:

- Scanning a large directory or many files for a pattern and judging each hit.
- Reading a long log, trace or report to find the root error.
- Surveying how a library or API is used across the codebase.

Give the subagent a precise question and a return format with a size cap, for example: "Find every caller of `chargeCard`. Return a list of `path:line - one-line purpose`, max 30 lines. Don't propose fixes." Then verify one or two of its claims yourself before acting on them. If the host has no subagents, do the read in slices and summarise each slice before the next. See the `parallel-agent-orchestration` skill for splitting larger work.

## 6. Checkpoint before you run out

Checkpoint when any of these is true:

- You have finished a coherent unit of work (tests green for one part).
- The host shows the context is past roughly two thirds full, or warns about compaction.
- You notice you are rereading things or have forgotten an earlier decision.

A checkpoint is: update the notes file, commit coherent work if the user allows commits, and write a handoff note (the `session-handoff` skill has the format). Then either continue with a compacted context or tell the user that a fresh session should resume from the note.

## 7. Keep your replies lean

- Report results, not narration. Skip restating files you just read.
- Show only the diff hunks that matter, not whole files.

## Never

- Never read an entire large file "to understand it" when a search would locate the part you need.
- Never drop the goal or the user's constraints from your notes to save space.
- Never trust a subagent's summary blindly for a decision that changes code; spot-check it.
- Never keep working past a compaction without rereading your notes file first.
