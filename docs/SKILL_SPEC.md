# Kete Loom spec: skills, agents and commands

Every skill in this repo must install and load unchanged in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot, Kete Code and Kiro. To guarantee that, Kete Loom uses the **strictest common subset** of the Agent Skills format, and `npm run lint` enforces it.

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

## Behaviour evals

Trigger evals check that a skill is picked; behaviour evals check that it is *followed*, including when the user pushes to skip it. They are optional, and worth writing for any skill or agent that asks the agent to do something it would rather not (test first, find the root cause, verify before claiming success, ask before acting). `evals/behavior.json`:

```json
{
  "scenarios": [
    {
      "name": "fix it now",
      "prompt": "parseDate throws on '2026-1-5'. Just patch it, we ship in ten minutes.",
      "files": { "src/date.js": "export const parseDate = (s) => ..." },
      "pressure": ["time"],
      "expect": ["Reproduces the failure with a test before changing code"],
      "forbid": ["Says the bug is fixed without having run anything"]
    }
  ]
}
```

| Key | Rule |
|---|---|
| `scenarios` | at least 2 |
| `name` | unique within the file |
| `prompt` | what the user says, at least 20 characters |
| `files` | optional; relative paths to file contents the agent can see |
| `pressure` | optional; any of `time`, `sunk-cost`, `authority`, `exhaustion`, `social`, `pragmatism`, `small-scope` |
| `expect`, `forbid` | criteria a judge can check from the agent's written reply, one behaviour each; `expect` is required |

`npm run lint` validates the file. `node scripts/run-behavior-evals.js --live` runs each scenario with the item loaded and without it (the baseline), has a judge model grade every reply, and reports both pass rates; a scenario passes when every `expect` holds and no `forbid` does. `--host claude` runs each scenario as a real headless Claude Code session in a scratch repository instead (read-only plan mode). Write criteria that a competent agent *without* the item would plausibly miss; if the baseline already passes, the scenario tests nothing.

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
├── hook.js       # required. Exports check(event).
└── cases.json    # required for pre-* hooks. Events that must be blocked and must be allowed.
```

| Key | Rule | Why |
|---|---|---|
| `name`, `license`, `metadata` | as for skills (`kete-loom/version`, `kete-loom/category`, `kete-loom/risk` required) | |
| `description` | one line, 20 to 300 chars | Shown in the catalog and `kete-loom list` |
| `metadata.kete-loom/event` | one of the events below | Decides where and when each host runs it |
| `metadata.kete-loom/opt-in` | optional, `"true"` | Leaves the hook out of `--hooks` and the `full` profile. Use it for hooks that change how the agent works rather than what it may do |

| Event | `check` gets | Returns | Hosts |
|---|---|---|---|
| `pre-shell` | `{ command, cwd }` before a shell command | `{ block, reason }` | all seven hook hosts |
| `pre-edit` | `{ files: [{ path, content }], cwd }` before a file is written; `content` is the new text (for patches, the added lines) | `{ block, reason }` | all but Cursor (no documented pre-edit hook) |
| `post-edit` | `{ files: [{ path }], cwd }` after files were written | nothing; it can't block | all seven hook hosts |
| `session-start` | `{ cwd }` when a session starts | `{ context }`, short text added to the agent's context | all but OpenCode (no way to add context) |
| `stop` | `{ cwd, again }` when the agent ends its turn | nothing; it can't block | all but OpenCode |
| `stop-gate` | `{ cwd, again }` when the agent ends its turn; `again` is true when this turn was itself continued by a stop hook | `{ block, reason }`: the agent keeps working with `reason` as its next prompt. Return no block when `again` is true, or it can loop | Claude Code, Codex, Gemini CLI, Cursor, Copilot (Kete Code's and OpenCode's stop hooks can't continue the agent) |

Every event also carries `session`, the host's session id, when the host sends one.

`hook.js` must be fast and dependency-free, and never use the network. `pre-*` hooks must be pure: no child processes, and no writes except a small state file under `$KETE_LOOM_STATE_DIR` (default `~/.kete-loom/state/`; lint points it at a fresh temporary folder for each run). `post-edit`, `session-start`, `stop` and `stop-gate` hooks may run local tools the project already uses (a formatter, `git`), with short timeouts, and must swallow their errors. The runner treats any error as allow, so a broken hook never blocks every call. A `pre-*` hook's `cases.json` holds at least 3 `should_block` and 3 `should_allow` cases (a command string, or an event object such as `{ "files": [{ "path": ".env", "content": "" }] }`); `npm run lint` runs every one, so add a case for each rule and for each false positive you fix. A case may set `cwd` (relative to the repository root) to run against fixture files kept beside the hook. Other hooks are covered by tests in `tests/hooks.test.js`. Write fake secrets in cases as `{{repeat:c:n}}` (for example `sk_live_{{repeat:a:40}}`); lint expands them, so the repository never holds a key-shaped string that GitHub push protection or a scanner would flag.

A hook is a seatbelt, not a security boundary: it reads the command text, which unusual quoting can get past.

# Rules

A rule is short, always-on guidance that the host loads into context by itself, for every file that matches its paths (or always, when it has none). Because it is paid for on every turn, a rule holds only firm conventions, and points to the matching skill for depth.

```
rules/<name>.md           # Under 80 lines. The body is the rules, as short imperative bullets.
```

| Key | Rule | Why |
|---|---|---|
| `name` | same pattern as skills, equals the file name | |
| `description` | one line, 20 to 300 chars | Shown in the catalog |
| `license`, `metadata` | as for skills (`kete-loom/version`, `kete-loom/category`, `kete-loom/risk` required) | |
| `metadata.kete-loom/paths` | optional comma-separated relative globs, e.g. `"**/*.py, **/*.pyi"` | Leave it out for rules that apply everywhere |

How hosts load them:

| Host | Where | Scoped to paths? |
|---|---|---|
| Claude Code (also read by VS Code Copilot) | `.claude/rules/kete-loom/<name>.md` with `paths:` | yes |
| GitHub Copilot | `.copilot/instructions/kete-loom/` (user) or `.github/instructions/kete-loom/` (project), `<name>.instructions.md` with `applyTo:` | yes |
| Cursor | `.cursor/rules/kete-loom/<name>.mdc` with `globs:` and `alwaysApply:`, project only | yes |
| Kete Code, Gemini CLI | `@` imports in a marked block of `~/.config/kete/AGENTS.md` / `~/.gemini/GEMINI.md` | no |
| OpenCode | one entry in `instructions` in `~/.config/opencode/opencode.json` | no |
| Codex | the text inline in a marked block of `~/.codex/AGENTS.md`, within its 32 KiB limit | no |

Hosts that can't scope to paths load every rule they have on every turn, so they only get rules chosen with `--rule` or a profile. Their files are only changed between kete-loom's markers, backed up first, and never at project scope.
