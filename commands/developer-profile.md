---
name: developer-profile
description: Build a short working-style profile of you from your own local agent session logs, read-only and on this machine only, then show it and write it to AGENTS.md or a profile file only if you approve.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[30d | 90d | since YYYY-MM-DD] [project] [--questions]"
  kete-loom/owner: "Kete-org"
---

Build a profile of how the user likes to work, so future sessions start with their preferences instead of relearning them.

**Say this first, before reading anything:** which log folders you will read (below), that you only read them, that nothing is sent anywhere, that the profile will hold patterns and short paraphrases rather than copied prompts or code, and that nothing is written without their approval. If they decline, or pass `--questions`, skip to step 4 and build the profile from a short questionnaire instead.

1. **Find the logs**, the user's own only, on this machine. Default window: last 90 days, all projects, or the period and project given below. Typical locations (formats change between versions, so inspect one record before parsing):
   - Claude Code: `~/.claude/projects/<project-slug>/*.jsonl`
   - Codex: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`
   - Gemini CLI: `~/.gemini/tmp/<project-hash>/chats/`
   - OpenCode: the SQLite file `opencode db path` prints (usually `~/.local/share/opencode/opencode.db`; older versions used JSON under `~/.local/share/opencode/storage/`). Kete Code: `~/.local/share/kete/kete.db`. Open databases read-only (`sqlite3 -readonly`) and inspect `.schema` first.
   The `usage-report` command documents these formats in more detail if it is installed. Skip hosts that aren't present and list them.
2. **Extract only the user's own messages** with a throwaway script in a temporary directory (no installs, stream large files). Never open other people's logs, shared machines' other home folders, or credential files. Drop anything that looks like a secret, key or token before analysis, and delete the temporary output when done.
3. **Look for patterns that recur in at least three sessions**, each with a count and confidence (high, medium, low):
   - Corrections they repeat ("don't add comments", "use pnpm", "stop asking, just do it").
   - Conventions: languages, package managers, test and commit styles, naming, formatting they ask for.
   - Communication: preferred answer length, explanation depth, tone, whether they want options or a recommendation.
   - Workflow: plan first or act first, how often they want confirmation, how they debug, when they want tests.
   Leave out one-off requests, anything about other people, and anything personal or sensitive (health, finances, location, relationships), even if it recurs.
4. **Questionnaire fallback** (or to fill gaps): ask up to six short questions, one at a time, covering the same areas.
5. **Show the draft**, under 30 lines:

```
## Working-style profile (<period>, <n> sessions, <hosts>)
Prefers: <item> (seen <n>x, high)
Avoid: <item> (corrected <n>x, high)
Conventions: <item> (<n>x, medium)
Communication: <item>
Workflow: <item>
Low confidence, not included unless you say so: <items>
Read: <folders>  Not found: <hosts>
```

6. **Stop and ask** where it should go, if anywhere: a section in the user-level instruction file (for example `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`), a project `AGENTS.md`, or a separate file such as `~/.config/kete-loom/profile.md`. Project files are often committed and shared, so warn before writing personal preferences there. Write only after explicit approval, inside a clearly marked section, update that section instead of duplicating it, and don't commit. For a single lesson rather than a profile, `/learn` is the better fit.

Period, project or mode: $ARGUMENTS
