# Kete Loom spec: skills, agents and commands

Every skill in this repo must install and load unchanged in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot and Kete Code. To guarantee that, Kete Loom uses the **strictest common subset** of the Agent Skills format, and `npm run lint` enforces it.

## Folder layout

```
skills/<name>/
├── SKILL.md              # required. Under 300 lines.
├── evals/
│   └── triggers.json     # required. Prompts that should and should not load the skill.
├── references/           # optional. Detail the agent reads only when needed.
├── scripts/              # optional. Deterministic helpers the agent runs.
└── agents/openai.yaml    # optional. Codex/ChatGPT UI details.
```

## Frontmatter

```yaml
---
name: tdd-workflow
description: Test-first development loop ... Use when adding a feature, fixing a bug, or refactoring code that has tests.
license: MIT
compatibility: Any Agent Skills host. Needs git and the project's test runner.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/owner: "Kete-org"
---
```

| Key | Rule | Why |
|---|---|---|
| `name` | `^[a-z0-9]+(-[a-z0-9]+)*$`, max 64, equals folder name | OpenCode and Codex reject anything else |
| `description` | one line, 80 to 1024 chars, contains "Use when" | Hosts only read this to decide whether to load the skill |
| `license` | required | Clear reuse terms for every skill |
| `compatibility` | optional, max 500 chars | Agent Skills spec field for environment needs |
| `metadata` | string-to-string map only | OpenCode rejects nested or non-string metadata |
| `metadata.kete-loom/version` | semver, required | Lets the runtime and catalog track changes |
| `metadata.kete-loom/category` | coding, testing, security, integrations, devops, data, ai, docs, business, compliance, meta | Catalog grouping |
| `metadata.kete-loom/risk` | read-only, writes-files, runs-commands, network | Lets Kete Code warn before loading risky skills |
| `metadata.kete-loom/requires` | comma list of CLIs | `kete-loom doctor` checks them |

No other top-level keys are allowed. Host-specific settings go under `metadata` with the host's prefix, for example `opencode/slash: "true"`.

## Body rules

- Under 300 lines. Put long material in `references/` and tell the agent when to read it.
- Write instructions, not essays: steps, checks, and "stop and ask" points.
- Refer to tools by capability ("run the test command", "search the codebase") rather than one host's tool names.
- Scripts must run with only the tools listed in `kete-loom/requires`, and print a clear result.

## Trigger evals

`evals/triggers.json`:

```json
{
  "should_trigger": ["at least 3 prompts that need this skill"],
  "should_not_trigger": ["at least 3 near-miss prompts that must NOT load it"]
}
```

`npm run eval` checks structure offline. `npm run eval:live` asks a model to pick a skill from all descriptions, the same way hosts route, and fails if a prompt picks the wrong skill.

# Agents

An agent is a subagent the host delegates to. It runs in its own context and returns a result. Kete Loom keeps one portable source per agent, and the installer converts it to each host's format (Markdown for Claude Code, OpenCode, Kete Code, Cursor, Gemini CLI and Copilot; TOML for Codex).

```
agents/<name>/
├── AGENT.md              # required. Under 300 lines. The body is the agent's instructions.
└── evals/
    └── triggers.json     # required. Hosts pick agents by description, like skills.
```

Frontmatter follows the skill rules above (same keys, `name` equals the folder name, description of 80 to 1024 chars containing "Use when"), plus one optional key:

| Key | Rule | Why |
|---|---|---|
| `metadata.kete-loom/tools` | comma list of `read`, `search`, `shell`, `edit`, `web`. Leave it out to inherit every tool | Mapped to Claude Code `tools`, Copilot `tools`, OpenCode and Kete Code `permission`, and Cursor `readonly`. Codex and Gemini CLI agents currently inherit every tool, so treat it as advisory there |

Write the body as instructions to the agent ("You review..."). Say what it must not do, how it verifies its own findings, and the exact shape of what it returns.

# Commands

A command is a slash command the user types, such as `/verify`. Claude Code, OpenCode, Gemini CLI and Kete Code support them. Codex has deprecated custom prompts, Copilot CLI has none and Cursor's are in beta, so a command should usually call a skill that does the work, with a short fallback for hosts where that skill isn't installed.

```
commands/<name>.md        # Under 300 lines. The body is the prompt.
```

| Key | Rule | Why |
|---|---|---|
| `name` | same pattern as skills, equals the file name, and must not equal a skill name | Claude Code serves commands and skills from one namespace |
| `description` | one line, 20 to 300 chars | Shown in the host's command menu |
| `license`, `metadata` | as for skills (`kete-loom/version`, `kete-loom/category`, `kete-loom/risk` required) | |
| `metadata.kete-loom/argument-hint` | optional, for example `"[file or area]"` | Shown by Claude Code while typing |

Use `$ARGUMENTS` where the user's text goes; the installer converts it for Gemini CLI (`{{args}}`). Commands need no trigger evals, because users invoke them by name.

# Installed files

Installed agent and command files start with a `# kete-loom <name>@<version>` comment, and installed skill folders contain `.kete-loom.json`. That is how `install` avoids overwriting files you wrote and how `uninstall` removes only what kete-loom installed. Don't add either marker by hand.

# Hooks

A hook runs automatically at a point in the agent loop and can stop the agent. Kete Loom writes each hook once as a plain function; `hooks/run.js` translates every host's payload and answer format, and the installer registers it with each host.

```
hooks/<name>/
├── HOOK.md       # required. Frontmatter and a short explanation for users.
├── hook.js       # required. Exports check(event) -> { block: true, reason } | { block: false }.
└── cases.json    # required. Commands that must be blocked and must be allowed.
```

| Key | Rule | Why |
|---|---|---|
| `name`, `license`, `metadata` | as for skills (`kete-loom/version`, `kete-loom/category`, `kete-loom/risk` required) | |
| `description` | one line, 20 to 300 chars | Shown in the catalog and `kete-loom list` |
| `metadata.kete-loom/event` | `pre-shell` (runs before every shell command; `check` gets `{ command, cwd }`) | The only event every host supports the same way today |

`hook.js` must be fast, pure and dependency-free: no network, no writes, no child processes. The runner treats any error as allow, so a broken hook never blocks every command. `cases.json` holds at least 3 `should_block` and 3 `should_allow` commands; `npm run lint` runs every one, so add a case for each rule and for each false positive you fix.

A hook is a seatbelt, not a security boundary: it reads the command text, which unusual quoting can get past.
