---
name: agent-plugin-authoring
description: Packages existing skills, slash commands, subagents, hooks and MCP servers into an installable plugin for Claude Code, Codex and Gemini CLI, covering each host's manifest file and component layout, marketplace catalog entries, keeping versions in step across manifests, testing a local install before publishing, and diagnosing a plugin that installs but loads nothing. Use when bundling agent components into a plugin or extension, writing plugin.json, marketplace.json or gemini-extension.json, publishing a plugin marketplace from a repo, or fixing a plugin whose skills or commands don't show up.
license: MIT
compatibility: Any Agent Skills host. Local install tests need the target host's CLI (claude, codex or gemini).
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Agent plugin authoring

A plugin is a folder of components plus a manifest that tells a host where they are. Most failures are not in the components but in the packaging: a path without `./`, a manifest in the wrong folder, a version that was never bumped. This skill is about the packaging. To write the components themselves, use `skill-authoring` for skills, `mcp-server-patterns` for MCP servers and `/hookify` for hooks.

Read `references/manifests.md` for each host's manifest and marketplace fields, and `references/load-failures.md` when a plugin installs but something is missing.

## 1. Decide what you are shipping

Ask, or work out from the repository:

- Which components: skills, commands, agents, hooks, MCP servers. Each must already work on its own.
- Which hosts. Support differs (table below); stop and tell the user if a component they need has no equivalent on a host they want.
- One plugin or several. Split when users would want only part of it, or when one part needs secrets or network and the rest doesn't.
- Where it is published: a marketplace file in the same repository (simplest), a separate catalog repository, or npm.

| Component | Claude Code | Codex | Gemini CLI |
|---|---|---|---|
| Skills (`skills/<name>/SKILL.md`) | yes | yes | yes |
| Slash commands | Markdown in `commands/` (docs prefer skills for new plugins) | not documented for plugins | TOML in `commands/` |
| Subagents | Markdown in `agents/` | not documented for plugins | Markdown in `agents/` (preview) |
| Hooks | `hooks/hooks.json` | `hooks/hooks.json`; only for plugins installed manually in the desktop app, skipped until the user trusts them, and not allowed in the public directory | `hooks/hooks.json` |
| MCP servers | `.mcp.json` or `mcpServers` in the manifest | `mcp.json` at the root, each server with a transport `type` (the scaffold writes `.mcp.json`; don't just rename it) | `mcpServers` in the manifest |

Skills are the portable part. Prefer moving behaviour into skills over host-only commands.

## 2. Lay out the folder

Keep components at the plugin root and only the manifest inside the host's dot-folder:

```
my-plugin/
├── .claude-plugin/plugin.json       # Claude Code (and marketplace.json if this repo is the catalog)
├── .codex-plugin/plugin.json        # Codex
├── gemini-extension.json            # Gemini CLI
├── skills/<name>/SKILL.md
├── commands/                        # .md for Claude Code; Gemini needs .toml copies
├── agents/
├── hooks/hooks.json
└── .mcp.json
```

Rules that apply on every host:

1. Every path in a manifest is relative to the plugin root and starts with `./`. No `..`, no absolute paths, forward slashes only.
2. Reference bundled files from hooks and MCP servers through the host's root variable (`${CLAUDE_PLUGIN_ROOT}` in Claude Code, `PLUGIN_ROOT` in Codex hook commands, `${extensionPath}` in Gemini CLI), never a path from your machine. Quote it in shell-form commands.
3. Never write state into the plugin folder; installs are replaced on update. Claude Code gives `${CLAUDE_PLUGIN_DATA}` for that.
4. No secrets in any manifest or MCP config. Read them from environment variables or the host's user-config prompt (`userConfig` with `sensitive: true` in Claude Code, `settings` with `sensitive: true` in Gemini CLI).
5. Name the plugin in kebab-case, distinct from the host vendor's own names (`claude plugin validate` fails names such as `claude-*` or `anthropic-*` that pass as Anthropic's).

## 3. Write the manifests

Fill them from `references/manifests.md`. Keep one source of truth for name, version, description and author, and copy it into each manifest. Before writing, check whether the host's docs have changed: plugin formats are young and move between releases.

Stop and ask the user before adding hooks or MCP servers that run commands on install or session start; users are asked to trust them and many will refuse.

## 4. Versions

- One version for the whole plugin, the same in every manifest, every marketplace entry that states one, and `package.json` if there is one.
- Bump it on every release. Claude Code keeps users on the version a manifest sets until it changes, so an unbumped release never reaches them.
- In Claude Code, the `plugin.json` version wins over the marketplace entry's; set it in one place, or keep both identical.
- Add a check (a test or a CI step) that fails when the versions disagree, rather than relying on memory.

## 5. Test a local install before publishing

Run each host's own check, then install from the local folder in a clean session and confirm every component appears:

1. Claude Code: `claude plugin validate ./my-plugin` (add `--strict` in CI), then start a session with `claude --plugin-dir ./my-plugin`, or add the repo as a marketplace with `/plugin marketplace add ./path` and install `my-plugin@<marketplace>`.
2. Codex: `codex plugin marketplace add ./path-to-marketplace-root`, then `codex plugin marketplace list` to see the root it resolved. These commands only register the catalog; OpenAI documents installing and testing a local plugin from the Plugins Directory in the ChatGPT desktop app. Restart the app after every change: Codex loads an installed copy from its cache, not your folder.
3. Gemini CLI: `gemini extensions link ./my-plugin` for development (a symlink, so edits apply without reinstalling), then `gemini extensions list` to confirm it is enabled, and start a new session.
4. In each, invoke one skill, one command and one agent by name, trigger one hook, and list MCP tools. A component that is missing goes to `references/load-failures.md`.

Do not publish until every host you claim support for passes step 4.

## 6. Publish

1. Commit the marketplace file at the location the host reads (`.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`).
2. Tag the release with the version from step 4.
3. For Anthropic's or OpenAI's public directories, follow their submission steps; a Codex plugin with hooks is not eligible for OpenAI's public directory.
4. Tell users the exact add and install commands for each host, and what the plugin's hooks and MCP servers run.

## Never

- Put `skills/`, `commands/` or `hooks/` inside `.claude-plugin/` or `.codex-plugin/`.
- Ship literal API keys, `@latest` MCP server packages, or `curl | sh` in a hook.
- Publish without testing an install from a clean session.
- Claim a host is supported when you only validated the manifest.

## Report

```
## Plugin: <name> <version>
Components: <n> skills, <n> commands, <n> agents, <n> hooks, <n> MCP servers
Hosts: Claude Code <validated | installed and tested | not supported: why>; Codex <...>; Gemini CLI <...>
Versions in step: <files checked>
Install: <commands per host>
Open issues: <anything not tested or not portable>
```
