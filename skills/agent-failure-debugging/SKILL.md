---
name: agent-failure-debugging
description: Post-mortem for a single failed or poor LLM agent run, reading its transcript, tool-call log or trace to find the first step where it went wrong, sorting the cause into a fixed taxonomy (tool loop, tool error mishandled, context lost or overflowed, ambiguous or conflicting instructions, wrong tool chosen, missing tool or permission, model limit), then changing the prompt, tool definitions or harness and re-running the same task to prove the fix. Use when an agent got stuck repeating itself, ignored an instruction, gave up early, edited the wrong files, hallucinated a tool result, or produced a bad answer and someone has the session log and wants to know why.
license: MIT
compatibility: Any Agent Skills host. Needs read access to the run's transcript, JSONL session log or trace export, and a way to re-run the agent on the same task.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Agent failure debugging

Debug one bad run the way you would debug a crash: get the evidence, find the first wrong step, name the cause, change one thing, re-run, compare.

Scope: one run (or a handful of runs of the same task). To score many outputs against a rubric, use `llm-evals` or the `agent-evaluator` agent. To redesign the harness from scratch, use `agent-harness-design`. To rewrite a prompt in general, use `prompt-engineering`.

## 1. Collect the evidence

Ask for, or find, all of:

- The task as given: the user prompt and any files or links it named.
- The full transcript or log: every model turn, every tool call with its arguments, every tool result, and any errors from the harness. Session logs are usually JSONL (one event per line).
- The system prompt, instruction files (`AGENTS.md`, `CLAUDE.md` and similar), loaded skills, and the tool definitions as the model saw them.
- The model and settings: model name, temperature or effort, context window, max turns, timeouts.
- What "good" would have looked like: the expected result in one or two sentences.

If the transcript is missing or truncated, stop and say so. Do not reconstruct a run from memory or from the final answer alone.

Large logs: don't read them whole. Extract a compact timeline first (turn number, role, tool name, first 200 characters of arguments and result, token count if logged), then read in full only the turns around the failure. `context-budget` covers techniques for huge files.

## 2. Find the first wrong step

Walk the timeline from the start and mark:

1. The last step where the agent was clearly on track.
2. The first step that was wrong: a wrong tool, wrong arguments, a misread result, a skipped instruction, or a false claim.
3. What the agent had in view at that moment: was the needed fact in the context, already compacted away, or never provided?

The first wrong step, not the final symptom, is what you fix. A run that ends in a loop often went wrong five turns earlier when a tool error was misread.

## 3. Classify the failure

Pick one primary cause (and at most one contributing cause):

| Cause | Signs in the log | Usual fix |
|---|---|---|
| **Loop** | Same tool and near-identical arguments 3+ times, no new information gained | Return clearer tool results; add a repeat detector or turn cap in the harness; tell the agent what to do when stuck |
| **Tool error mishandled** | Error result ignored, misread as success, or retried unchanged | Make errors explicit and actionable (`isError`, what to change); instruct "on error, read it and change the call or stop" |
| **Context lost** | Agent forgets an earlier decision or file after compaction or truncation; re-reads the same file | Keep key facts in a notes file or pinned summary; compact earlier and keep decisions; split the task |
| **Context overflow** | Huge tool output (logs, lockfiles, minified code) right before quality drops; window near its limit | Cap and paginate tool output; search instead of dumping; delegate bulky reads to a subagent |
| **Ambiguous instructions** | Two reasonable readings; agent picked the other one; instruction files contradict each other or the user | Rewrite the instruction with a concrete example; remove the contradiction; say which source wins |
| **Wrong tool** | A tool that exists and fits was skipped for a worse one (shell `cat` instead of a read tool, guessing instead of searching) | Sharpen tool names and descriptions so the right one is obvious; remove overlapping tools |
| **Missing tool or permission** | Agent improvises around a denied or absent capability, or hallucinates a result | Grant the narrow capability, or tell the agent to stop and ask when it is missing |
| **Premature stop** | Agent declares done without running the check the task required | Add an explicit completion check; harness verifies before accepting "done" |
| **Hallucinated result** | Claims a file, test pass or API field that the log shows never existed | Require evidence (command output, path:line) in the answer; verify in the harness |
| **Model limit** | Task needs reasoning or knowledge the model lacks even with perfect inputs | Break the task down, give examples, or use a more capable model |

If nothing fits, write a one-line new category rather than forcing one.

## 4. Fix one thing

1. State a hypothesis: "The run failed at turn N because X; changing Y will make it succeed."
2. Make the smallest change in the right layer: prompt or instruction file, tool definition or result format, or harness (caps, compaction, retries, permissions).
3. Change one thing at a time so the re-run tells you something.
4. Show the user the diff before editing a shared system prompt, instruction file or tool schema.

Never "fix" a run by adding instructions that hard-code the answer to this one task.

## 5. Re-run and confirm

1. Re-run the same task with the same inputs and model settings, changing only the fix.
2. Agents are not deterministic: run it 3 times if cost allows (more for a flaky failure) and count successes before and after.
3. Compare timelines: the failing step should now go right, and no new failure should appear later.
4. Re-run one or two other tasks that the change could affect, so the fix doesn't break something else.
5. If the failure persists after two hypotheses, stop and report what you tried; the cause may be in an area you don't control (provider outage, model limit).

Stop and ask the user before re-running anything that writes outside a scratch area, costs real money, sends messages or touches production.

## Report

```
## Agent run diagnosis: <task, run id or log path>
Expected: <one line>
Got: <one line>
First wrong step: turn <N> — <what happened> (evidence: <quoted log excerpt, under 3 lines>)
Cause: <category> (contributing: <category or none>)
Fix: <layer: prompt | tools | harness> — <change, with diff or file:line>
Re-run: <k>/<n> succeeded before, <k>/<n> after; side checks: <tasks re-run and result>
Remaining risk: <what this fix does not cover>
```
