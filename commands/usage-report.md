---
name: usage-report
description: Summarise token usage and estimated cost per session, project and model from local agent session logs (Claude Code, Codex, Gemini CLI, OpenCode, Kete Code), read-only.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[today | 7d | 30d | since YYYY-MM-DD] [host] [project]"
  kete-loom/owner: "Kete-org"
---

Build a token usage report from local agent session logs. Read-only: never edit, move or delete a log, and never send log contents anywhere. Logs contain prompts and code; only print aggregates, never message text.

Default period: last 7 days, all hosts found. Formats change between releases, so inspect one record before parsing and say if a format looks different from below.

**Where to look**

- **Claude Code**: `~/.claude/projects/<project-slug>/*.jsonl` (subagent logs may sit in subfolders). Assistant lines carry `message.model` and `message.usage` with `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`. One response can span several lines with the same `message.id` and repeated usage; count each `message.id` (plus `requestId` if present) once. Skip lines whose model is `<synthetic>`. Project = `cwd` field, or the slug.
- **Codex**: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. `event_msg` records with `payload.type == "token_count"` hold `info.total_token_usage` (cumulative: `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_output_tokens`); take the last non-null `info` per file, not the sum (early records can have `info: null`). Model and `cwd` come from `turn_context` records.
- **Gemini CLI**: `~/.gemini/tmp/<project-hash>/chats/` (session files with per-message token counts). Check whether files are `.json` or `.jsonl` before parsing. Read only `chats/`; `/chat save` and checkpoint files elsewhere under the project folder repeat the same conversation and would double-count.
- **OpenCode**: SQLite at the path `opencode db path` prints (usually `~/.local/share/opencode/opencode.db`); older versions used JSON under `~/.local/share/opencode/storage/`. **Kete Code**: `~/.local/share/kete/kete.db`; table `session_v2` has `directory`, `cost`, `tokens_input`, `tokens_output`, `tokens_reasoning`, `tokens_cache_read`, `tokens_cache_write`. Open databases read-only (`sqlite3 -readonly`); inspect `.tables` and `.schema` first.

**Steps**

1. Find which of these exist; skip missing ones and list them under "Not found".
2. Write a small throwaway script in a temporary directory (Node or Python, no installs) that streams the files, filters by timestamp to the period, and aggregates by host, project, model, and session. Don't load huge files into memory at once.
3. Keep input, cache write, cache read, output and reasoning tokens as separate columns; they are priced differently.
4. Cost: use a cost the log itself records where present (OpenCode, Kete Code). Otherwise estimate with per-million-token prices for each model, and state the prices used and their date. Prices change: tell the user to check them against each provider's current pricing page; never present the estimate as a bill. Subscription plans aren't billed per token, so say the figure is the API-equivalent cost.

**Report**

```
## Agent usage: <period>
Totals: <sessions>, input <n>, cache write <n>, cache read <n>, output <n>, est. cost <$>
By host and model: table (host, model, sessions, tokens by type, est. cost)
By project: top 10 by est. cost
Top sessions: top 5 (date, host, project, model, tokens, est. cost)
Prices used: <model: $in/$out/$cache per 1M, source, date>; check current provider price pages
Not found / unparsed: <hosts, files skipped and why>
```

Period, host or project filter: $ARGUMENTS
