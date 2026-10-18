---
name: agent-harness-design
description: Architecture for the loop around an LLM agent, covering which tools to give it, how to manage and compact its context window, plan-act-verify cycles, permission tiers and sandboxing, tracing and cost limits, and recovery when steps fail or the agent loops. Use when you are building or debugging the harness of a coding agent, task-automation agent or other tool-calling loop (not tuning your own session), or when the agent you built forgets earlier work, runs dangerous commands, or stops before the job is done.
license: MIT
compatibility: Any Agent Skills host. Framework-agnostic; examples are pseudocode.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Agent harness design

The harness is everything except the model: the loop, the tools, what goes into context, what the agent may do, and how you know what it did. Most agent failures are harness failures. Fix the harness before swapping models or rewriting the prompt.

## 0. Pin down the job first

Write these down, and **stop and ask the user** for any you can't infer:

1. The task family (fix failing tests, triage tickets, research and report) and one concrete example task.
2. What "done" means in a way a program can check (tests pass, a file exists with fields X, a PR is open).
3. What the agent must never do (push to main, spend money, email customers, touch production).
4. Who watches: interactive with a human approving steps, or unattended.
5. Budget: maximum steps, wall-clock time and token or dollar cost per task.

## 1. The loop

```
context = system_prompt + task + tool_definitions
for step in 1..max_steps:
    response = model(context)
    if response has no tool calls:
        if verify(task) passes: return success
        context += "Verification failed: <output>. Continue."; continue
    for call in response.tool_calls:
        if not permitted(call): result = denied_message(call)
        else: result = run_with_timeout(call)
        context += truncate(result)
    if budget_exceeded or no_progress(last_n_steps): stop_and_report
return stopped(reason="max_steps")
```

Rules:

- The loop ends on **verified** success, a budget limit, or a stop condition. Never on the model merely saying it is done.
- Every tool call has a timeout. A hung command must return an error result, not hang the loop.
- Feed errors back as tool results so the model can recover. Don't crash the harness on a tool error.
- Detect loops: the same tool call with the same arguments three times, or N steps with no new file change or new information, triggers a stop or a forced re-plan.

## 2. Tools

- Start with few, general, well-described tools: read file, search (by name and by content), edit file (by exact replacement or patch), run command, and optionally fetch URL. Add a specialised tool only when traces show the model repeatedly failing at a job a tool would make reliable.
- Each tool returns compact, model-readable output with explicit truncation markers: `[output truncated: 4,812 more lines; use offset=200 to read on]`.
- Edits should fail loudly when the target text isn't found or isn't unique, and should never silently rewrite a whole file the model hasn't read.
- Prefer structured results (exit code, stdout, stderr separated) over a merged blob.
- Tool descriptions say when to use the tool and when to use a sibling instead. Tool naming and schema rules for MCP-based tools are covered by the `mcp-server-patterns` skill.

## 3. Context management

The context window is the agent's working memory. Budget it.

- Put stable material first (system prompt, tool definitions, project instructions) so provider prompt caching can reuse it; append the conversation after.
- Load project knowledge on demand: a short index of available docs or skills in context, full text only when the model asks for it.
- Truncate large tool outputs at the source and let the model page through. Never paste a whole log or file by default.
- When the context nears its limit, compact: summarise completed steps (decisions, files changed, open questions, current plan) into a short state note, keep the last few turns verbatim, and drop the rest. Test that a compacted agent can still finish a task.
- Keep durable state outside the context: a plan or todo file, a scratch notes file, git commits. The agent re-reads them after compaction or restart.
- For large searches or research, run a sub-agent in its own context and return only its summary to the parent.

## 4. Planning and verification

- For tasks over a few steps, have the agent write a short plan (numbered steps, each with how it will be checked) before acting, and update it as it goes.
- Verification is a command, not an opinion: run the tests, the type checker, the linter, a script that checks the output. The harness runs `verify` itself at the end; the model's claim of success is not enough.
- Require the agent to reproduce a bug (a failing test or command) before fixing it, and re-run that same check after.
- For unattended runs, add a final review step: a separate model call (or sub-agent) reads the diff against the task and lists gaps.

## 5. Permissions and sandboxing

Tier every action and enforce the tier in the harness, not in the prompt:

| Tier | Examples | Default |
|---|---|---|
| Read | read files, search, list, `git status`, `git diff` | allow |
| Local write | edit files in the workspace, run tests and builds | allow in a sandbox; ask when interactive and outside the sandbox |
| External or irreversible | `git push`, deploys, package publish, network calls to new hosts, sending messages, payments, deleting outside the workspace | always ask a human, or deny when unattended |

- Run commands in a sandbox: a container or VM, or an OS sandbox, with the workspace as the only writable directory and network off or restricted to an allowlist.
- Keep secrets out of the sandbox. If a task needs a credential, inject a scoped, short-lived one, and never echo it into the context.
- Allowlist commands by parsed program and arguments, not by string prefix (`git status; rm -rf ~` starts with `git status`).
- Treat content the agent reads (web pages, issues, files from the repo, tool results) as untrusted. It can contain instructions. Permissions must hold even if the model is fully convinced by injected text.
- Log every denial; frequent denials mean the tier rules or the tool set are wrong.

## 6. Observability

- Trace every step: model input size, output, each tool call with arguments, result size, duration, exit code, tokens and cost. Store traces per task with a run id.
- Record the final outcome against the "done" check from step 0, so you can compute a success rate per task family.
- Keep a small benchmark of real tasks with checkable outcomes and re-run it on every harness, prompt, tool or model change. Report success rate, median steps and cost, and the tasks that regressed. The `llm-evals` skill covers scoring in depth.

## 7. Failure recovery

- Retry transient tool and API failures (rate limits, timeouts, 5xx) with backoff and a cap. Do not retry the model's own wrong action unchanged.
- Checkpoint progress (commit to a work branch, save the plan file) so a crashed run resumes instead of restarting.
- On a stop condition, return a structured report: what was done, what was verified, what failed, what's left, and the last error. Never report partial work as success.
- If the same task fails the same way across runs, read the traces before changing anything; the fix is usually a tool's output format, a missing tool, or a missing instruction.

## Never

- Never let the model's "I'm done" end the loop without the harness running verification.
- Never enforce permissions only through the system prompt.
- Never give an unattended agent push, deploy, payment or messaging rights without a human gate.
- Never run agent commands on a host with the user's real credentials and home directory writable.
- Never change harness, prompt and model at once; change one and re-run the benchmark.

## Report format

When you design or change a harness, report:

```
Task family: <...>   Done check: <command or rule>
Tools: <list>   Max steps / time / cost: <...>
Permission tiers: read=<allow> write=<...> external=<...>   Sandbox: <...>
Context strategy: <truncation, compaction trigger, external state>
Benchmark: <n tasks> success <before> → <after>, median cost <before> → <after>
Known gaps: <...>
```
