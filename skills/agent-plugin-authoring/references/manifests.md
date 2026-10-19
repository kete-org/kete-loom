# Manifest and marketplace fields

Checked against each host's documentation in October 2026. Formats change between releases; re-check the host's current reference before relying on a field, and run its validator.

## Claude Code

**`.claude-plugin/plugin.json`** is optional: without it, components load from the default folders and the name comes from the marketplace entry or folder. Write one to set metadata or non-default paths.

| Field | Notes |
|---|---|
| `name` | Required. Kebab-case, no spaces, `@`, `:` or slashes. Every component is namespaced under it (`my-plugin:reviewer`). `claude plugin validate` errors on names starting `claude-`, `anthropic-` or `cc-plugin-`, and warns on `claude` as a whole word elsewhere |
| `version` | String. Pins users to this version until it changes (not for plugins loaded in place from a marketplace added by local path) |
| `description`, `author` (`name` required, `email`, `url`), `homepage` (must parse as a URL), `repository`, `license`, `keywords` | Metadata |
| `skills` | Path or array of directories. Adds to the default `skills/` scan |
| `commands` | Path, array, or map of name to `{source}` or `{content}`. Replaces the default `commands/` scan |
| `agents` | `.md` file paths (not directories). Replaces the default `agents/` scan |
| `hooks` | `.json` path, inline object, or array. Merges with `hooks/hooks.json`. A hooks file wraps its event map in a top-level `"hooks"` key |
| `mcpServers` | `.json` path, inline map, or `.mcpb` bundle. Merges with `.mcp.json` |
| `userConfig` | Values prompted on enable: each needs `type`, `title`, `description`; `sensitive: true` stores it in the keychain. Referenced as `${user_config.KEY}` |
| `dependencies` | Other plugins that must be enabled |

Default locations: `skills/`, `commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, `output-styles/`, `bin/` (added to the shell `PATH`), `settings.json`. A `CLAUDE.md` in the plugin root is not loaded; put context in a skill.

Variables: `${CLAUDE_PLUGIN_ROOT}` (installed copy, replaced on update), `${CLAUDE_PLUGIN_DATA}` (persists across updates), `${CLAUDE_PROJECT_DIR}`. They are substituted in hook and MCP config and in skill, command and agent bodies, but are not in the environment of shell commands the agent runs.

Unknown top-level fields are stripped with a warning; unknown keys inside `userConfig` entries fail the load.

**`.claude-plugin/marketplace.json`** at the marketplace root. Relative sources resolve from the root (the folder holding `.claude-plugin/`), not from `.claude-plugin/`.

```json
{
  "name": "acme-tools",
  "owner": { "name": "Acme", "email": "dev@acme.example" },
  "description": "Acme's agent plugins",
  "plugins": [
    { "name": "acme-review", "source": "./plugins/acme-review", "description": "Review agents" },
    { "name": "acme-deploy", "source": { "source": "github", "repo": "acme/deploy-plugin", "ref": "v2.0.0" } }
  ]
}
```

- Required: `name`, `owner.name`, `plugins`; each entry needs `name` and `source`.
- Source forms: `"./path"` (must start with `./`; `"."` is the root), `github` (`repo`, `ref`, `sha`), `url` (any git URL, `ref`, `sha`), `git-subdir` (`url`, `path`), `npm` (`package`, `version`, `registry`; install scripts never run), `archive` (HTTPS zip, `sha256`), `command` (a local command that prints the plugin directory).
- `strict` (default `true`): with `false`, an entry that also declares `commands`, `agents`, `skills` or `hooks` while the plugin has its own `plugin.json` is a conflict and the plugin fails to load.
- Reserved marketplace names include ones that imitate official Anthropic catalogs and `inline`, `builtin`, `npm`, `github`.

Validate either file with `claude plugin validate <dir or file>`; `--strict` turns warnings into failures.

## Codex

OpenAI documents a portable layout with `plugin.json` at the plugin root and an optional compatibility fallback at `.codex-plugin/plugin.json`; many existing plugins use only the overlay. Check which the installed Codex version reads.

- Root fields: `name` (stable kebab-case), `version`, `description`, optional `author`, `homepage`, `repository`, `license`, `keywords`.
- Skills are discovered from `skills/` with no manifest field; the plugin-creator scaffold also writes `"skills": "./skills/"`.
- MCP servers: `mcp.json` at the root, under `mcpServers`, each server with a transport `type` (for example `"type": "streamable-http"`). The scaffold generates `.mcp.json`; convert it rather than renaming it.
- OpenAI-specific settings (`interface` for display name, descriptions, icons and default prompts; `hooks`; `apps` pointing at `.app.json`; `onboardingSkill`) sit under `extensions.com.openai` in the root manifest, which then replaces the overlay's OpenAI settings entirely. Existing overlays, including this repository's, keep `interface` at their top level; the current docs don't show that shape.
- Hooks: `hooks/hooks.json` is discovered by default; an explicit `hooks` value replaces that. Hooks run only for plugins installed manually in the desktop app, are skipped until the user reviews and trusts the current definition, and make a plugin ineligible for the public directory. Hook commands get `PLUGIN_ROOT` and `PLUGIN_DATA`.
- Enable or disable per project in `.codex/config.toml`: `[plugins."my-plugin@local-repo"]` with `enabled = true`.

**Marketplace** at `$REPO_ROOT/.agents/plugins/marketplace.json` (repo), `~/.agents/plugins/marketplace.json` (personal), or `.claude-plugin/marketplace.json` (read for compatibility). Each entry needs `name`, `source`, `policy` and `category`:

```json
{
  "name": "acme-tools",
  "interface": { "displayName": "Acme tools" },
  "plugins": [
    {
      "name": "acme-review",
      "source": { "source": "local", "path": "./plugins/acme-review" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Coding"
    }
  ]
}
```

`policy.installation` is `AVAILABLE`, `INSTALLED_BY_DEFAULT` or `NOT_AVAILABLE`. `source.path` starts with `./` and stays inside the marketplace root.

CLI: `codex plugin marketplace add <owner/repo | git URL | ./local-root>` (with `--ref`, `--sparse`), `list`, `upgrade`, `remove`. These manage catalogs only; install and test a local plugin from the Plugins Directory in the ChatGPT desktop app. Installs are cached under `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/` (`local` for local plugins) and loaded from there, so update the source folder and restart the app after every change.

## Gemini CLI

**`gemini-extension.json`** at the extension root:

```json
{
  "name": "acme-review",
  "version": "1.2.0",
  "description": "Review skills and commands",
  "contextFileName": "GEMINI.md",
  "mcpServers": {
    "acme": { "command": "node", "args": ["${extensionPath}${/}server.js"] }
  },
  "excludeTools": [],
  "settings": [
    { "name": "API key", "description": "Acme API key", "envVar": "ACME_API_KEY", "sensitive": true }
  ]
}
```

- `name`: lowercase letters, numbers and dashes (no underscores or spaces). Other fields: `plan`, `themes`, `migratedTo` (a new repository URL the CLI migrates to).
- Components: `commands/*.toml` (`commands/deploy.toml` is `/deploy`, `commands/gcs/sync.toml` is `/gcs:sync`), `skills/<name>/SKILL.md`, `agents/*.md` (preview), `hooks/hooks.json` (not in the manifest), `policies/*.toml` (extension `allow` decisions and `yolo` settings are ignored).
- Variables: `${extensionPath}`, `${workspacePath}`, `${/}` (path separator), in the manifest and `hooks/hooks.json`.
- Markdown commands from other hosts must be converted to TOML: `prompt` (required), `description` (optional), and `{{args}}` where the user's arguments go; without `{{args}}`, arguments are appended after the prompt.

CLI: `gemini extensions install <git URL or path> [--ref <ref>]`, `link <path>` (symlink for development), `update <name> | --all`, `uninstall`, `enable` / `disable`, `config`, `new <path> [template]`. List installed extensions with `gemini extensions list`. Extensions live in `~/.gemini/extensions/`.

Google's docs say Gemini CLI was replaced by Antigravity CLI on 18 June 2026 for unpaid-tier and Google One users; confirm which CLI the user's audience runs, and that it still reads `gemini-extension.json`, before investing in this target.
