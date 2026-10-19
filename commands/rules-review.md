---
name: rules-review
description: Review recent local agent session logs, read-only, against AGENTS.md, CLAUDE.md, rules and installed skills; report broken, missing, stale and untriggered guidance, and edit only what you approve.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[last N sessions | 7d | 30d] [project]"
  kete-loom/owner: "Kete-org"
---

Audit how well this project's agent guidance worked in recent sessions, from the user's own logs. Read-only until the user approves a specific change.

**Say this first, before reading anything:** which log folders you will read, that you only read them on this machine, that nothing is sent anywhere, that the report quotes at most a short phrase per finding, and that no file changes without approval.

1. **Collect the guidance in force.** Read the project's `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` and any files they import, the user-level ones (for example `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`), rule files (`.claude/rules/`, `.cursor/rules/`, `.github/instructions/`), and the names and descriptions of installed skills, agents and hooks (`npx @ketecode/loom doctor` lists Kete Loom ones). Number every rule so findings can cite it.
2. **Find the logs** for this project only, default the last 10 sessions or the window given below. Typical places (formats change, so inspect one record before parsing): Claude Code `~/.claude/projects/<project-slug>/*.jsonl`; Codex `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` (match on `cwd`); Gemini CLI `~/.gemini/tmp/<project-hash>/chats/`; OpenCode and Kete Code SQLite databases, opened with `sqlite3 -readonly` after reading `.schema`. The `usage-report` command documents these formats if it is installed. Skip missing hosts and list them.
3. **Extract with a throwaway script** in a temporary directory, no installs, streaming large files: user messages, the agent's tool calls (name and target, not full output) and skill or agent loads. Never open other users' home folders or credential files, drop anything that looks like a secret, and delete the temporary output when done.
4. **Look for four things**, each backed by at least two sessions unless it is a clear violation:
   - **Violated**: the agent broke a rule (the user corrected it, or a tool call contradicts it). Suggest a rewording that is harder to misread, or `/hookify` if it must never happen.
   - **Missing**: a correction or instruction the user repeated that no rule covers. Suggest a one-line rule, or a skill if it is a multi-step workflow (`/skill-create`).
   - **Untriggered**: a task an installed skill or agent covers, done without loading it. Name the skill and the phrasing that missed; suggest a sharper description.
   - **Stale**: a rule naming files, commands, tools or versions that no longer exist in the repository (check by searching it), or that no session touched and that conflicts with current practice.
5. **Report**, most useful first, at most 15 findings:

```
## Rules review: <project>, <n> sessions (<hosts>, <date range>)
Violated
- R<n> "<rule, short>": broken in <k> sessions (<dates>). Proposed wording: "<text>" | or /hookify
Missing
- "<proposed rule>": user asked <k> times (<dates>). Goes in: <file, heading>
Untriggered
- <skill>: missed on "<short paraphrase>" (<k>x). Description fix: <text>
Stale
- R<n> "<rule>": <what no longer exists>. Proposal: delete | update to "<text>"
Read: <folders>  Not found: <hosts>
```

6. **Stop and ask** which proposals to apply. Apply only the approved ones, as minimal edits to the files named, then show the diff. Don't commit. For a single lesson use `/learn`; for a profile of the user's style use `/developer-profile`.

Window or project: $ARGUMENTS
