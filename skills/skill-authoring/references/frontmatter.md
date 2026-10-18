# Portable frontmatter rules

These rules are the strictest subset accepted by every major Agent Skills host as of October 2026. A skill that follows them installs unchanged everywhere.

| Rule | Reason |
|---|---|
| Frontmatter starts on line 1 between `---` lines | Required by every host |
| `name` matches `^[a-z0-9]+(-[a-z0-9]+)*$`, max 64 chars | OpenCode and Codex reject other names |
| `name` equals the folder name | OpenCode requires it; others use the folder name for display |
| `description` is one line, 1–1024 chars (Kete Loom: at least 80) | Spec limit; multi-line YAML scalars are parsed inconsistently |
| Only `name`, `description`, `license`, `compatibility`, `metadata` at the top level | Unknown keys are rejected or ignored depending on the host |
| `metadata` is a flat map of string to string | OpenCode requires string values |
| Quote values that contain `:` or start with a special character | Plain YAML would misparse them |
| Host-specific settings go under `metadata` with a host prefix, e.g. `opencode/slash: "true"` | Keeps the top level portable |

## Where hosts look for skills

| Host | User folder | Project folder |
|---|---|---|
| Shared standard (Codex, OpenCode, Cursor, Gemini CLI, Copilot) | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| OpenCode (own folder) | `~/.config/opencode/skills` | `.opencode/skills` |
| Cursor (own folder) | `~/.cursor/skills` | `.cursor/skills` |
| Gemini CLI (own folder) | `~/.gemini/skills` | `.gemini/skills` |
| GitHub Copilot (own folder) | `~/.copilot/skills` | `.github/skills` |

Installing into `~/.agents/skills` plus `~/.claude/skills` reaches all of them.

## Optional Codex UI file

Codex and the ChatGPT apps read an optional `agents/openai.yaml` inside the skill folder for a display name, icon, brand colour, default prompt, and `allow_implicit_invocation: false` (load only when invoked by name). Other hosts ignore it.

## Manual checklist

- [ ] Frontmatter follows every rule above
- [ ] Description says what it does and contains "Use when"
- [ ] Body under 300 lines; every referenced file exists
- [ ] Scripts have a shebang, are executable and need only the listed tools
- [ ] `evals/triggers.json` has 3+ positives and 3+ near-miss negatives
- [ ] Tried in at least two hosts
