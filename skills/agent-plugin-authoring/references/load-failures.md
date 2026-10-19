# A plugin installs but something is missing

Work through the list in order; stop at the first match. Always re-run the host's validator and restart the session after each fix.

| Symptom | Likely cause | Fix |
|---|---|---|
| Nothing from the plugin appears | Manifest in the wrong place, or components inside `.claude-plugin/` / `.codex-plugin/` | Manifest in the dot-folder, every component folder at the plugin root |
| Validator says a path is not found or escapes the plugin | Path missing `./`, uses `..`, backslashes, or points at a file not committed | Rewrite as `./relative/path` with forward slashes; `git ls-files` to confirm it is committed |
| Default `commands/` or `agents/` folder ignored (Claude Code warns `Default <folder>/ folder is ignored because the manifest sets "<key>"`) | Manifest sets `commands` or `agents`, which replaces the default scan | List the default folder too: `"commands": ["./commands/", "./extra/"]`, or drop the key |
| Agents key rejected (Claude Code) | Pointed `agents` at a directory | List each `.md` file |
| Edits don't show up | Host loads an installed copy: Claude Code pins to the manifest version, Codex runs from its cache | Bump the version, update or reinstall, restart (for Codex, the desktop app); for development use `claude --plugin-dir` or `gemini extensions link` |
| Users stuck on an old release | Version not bumped, or `plugin.json` and marketplace entry disagree (Claude Code uses `plugin.json`) | Bump and align every manifest; add a check that fails on mismatch |
| `has conflicting manifests` (Claude Code) | Marketplace entry with `"strict": false` also declares components while the plugin has `plugin.json` | Declare components in one place only |
| Hooks never run | Hooks file lacks the top-level `"hooks"` wrapper; command path wrong; script not executable; Codex: hooks not yet trusted, or the plugin wasn't installed manually in the desktop app, or an explicit `hooks` value replaced `hooks/hooks.json` | Fix the shape, use the root variable in quotes, `chmod +x`; in Codex ask the user to review and trust the hooks |
| Hook works locally, fails for users | Absolute path from the author's machine, or relies on a tool users don't have | Use `${CLAUDE_PLUGIN_ROOT}` / `${extensionPath}`; document required tools |
| MCP server missing | Server name clash (a later declaration replaces an earlier one), command not on `PATH`, required env var unset, Codex `mcp.json` server without a transport `type` | Unique names; add `type` in Codex; absolute command via the root variable; prompt for the value via user config |
| Skill present but never chosen | Description too vague, or overlaps another skill | Rewrite it with the `skill-authoring` skill |
| Commands missing in Gemini CLI | Shipped Markdown commands | Convert to `.toml` |
| Marketplace add refused | Reserved or impersonating marketplace name, or invalid characters | Pick a distinct kebab-case name |
| Installed from a URL marketplace, relative sources fail (Claude Code) | A `url` marketplace source fetches only the JSON file | Use `github` or `git-subdir` sources in the entries, or add the marketplace as a git repo |

If none match: start the host with its debug or verbose flag, read the plugin errors it reports (Claude Code shows them under `/plugin`, and `claude plugin list` prints load errors), and compare against the current host documentation, which may have changed.
