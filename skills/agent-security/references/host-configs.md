# Where each host keeps agent permissions, MCP servers and hooks

Check the host's current docs before relying on a key; these change between releases.

## Claude Code

- Settings precedence, highest first: managed settings (`managed-settings.json`, MDM), command line (`--settings`), `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`.
- Permissions: `permissions.allow`, `permissions.ask`, `permissions.deny`, `permissions.defaultMode`, `permissions.additionalDirectories`. Rules look like `Bash(npm run test *)`, `Read(./.env)`. Deny rules win.
- Managed lock-down: `allowManagedPermissionRulesOnly` (only managed permission rules apply), `allowManagedHooksOnly` (only organisation hooks run), `permissions.disableBypassPermissionsMode`.
- MCP scopes: local and user servers in `~/.claude.json`, project servers in `.mcp.json` at the repo root.
- MCP approval: `enableAllProjectMcpServers` (approves every `.mcp.json` server), `enabledMcpjsonServers`, `disabledMcpjsonServers`. Organisation controls: `allowedMcpServers`, `deniedMcpServers`, `managed-mcp.json`.
- `apiKeyHelper` and MCP `headersHelper` run shell commands; treat them like hooks.
- Hooks: `hooks` in any settings file; scripts often under `.claude/hooks/`.
- Flags to search for in scripts and CI: `--dangerously-skip-permissions`, `bypassPermissions`.

## Codex

- Config: `~/.codex/config.toml`, project `.codex/config.toml`.
- `approval_policy`: `on-request`, `never`, or a `granular` table. `sandbox_mode`: `read-only`, `workspace-write`, `danger-full-access`. `sandbox_workspace_write.network_access` (boolean).
- `shell_environment_policy`: `inherit` (`all` | `core` | `none`), `filters`, `set`; use it to keep secrets out of spawned commands.
- MCP: `[mcp_servers.<id>]` with `command`, `args`, `env`, `url`, `bearer_token_env_var`, `enabled_tools`, `disabled_tools`.

## Gemini CLI

- Settings: `~/.gemini/settings.json`, project `.gemini/settings.json`. MCP servers in `mcpServers`. Instruction file `GEMINI.md`.

## Cursor

- MCP: `.cursor/mcp.json` (project), `~/.cursor/mcp.json` (user). Rules: `.cursor/rules/*.mdc`.

## OpenCode and Kete Code

- `opencode.json` (project) or `~/.config/opencode/opencode.json`; Kete Code `~/.config/kete/kete.json`. Look at `permission`, `mcp` and `agent` blocks.

## GitHub Copilot

- Instructions: `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`. VS Code MCP: `.vscode/mcp.json`. Coding agent runs in Actions; check the workflow's `permissions:` and the repository's agent firewall settings.
