---
name: lint-agent-config
description: Lint a project's agent setup (AGENTS.md and CLAUDE.md, skills, agents, commands, rules, hooks, MCP configs, plugin manifests) for broken references, invalid frontmatter, bloat, conflicts and risky settings.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[path, default the repository root]"
  kete-loom/owner: "Kete-org"
---

Lint the agent configuration in the path below (default: the repository root). Report only; do not edit anything unless the user approves a fix.

1. **Inventory.** Search for `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.claude/` (`settings.json`, `settings.local.json`, `skills/`, `agents/`, `commands/`, `rules/`), `.codex/config.toml`, `.gemini/settings.json`, `opencode.json`, `kete.json`, `.mcp.json`, `.kete-loom/`, `SKILL.md`, `AGENT.md`, `HOOK.md`, `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/` and `gemini-extension.json`. List what you found.
2. **Run Kete's linter on what it covers.** For each skill, agent, command, rule or hook folder, run `npx @ketecode/loom check <path>` (a folder of them works too) and keep its failures and warnings as they are. It enforces the Kete Loom spec, which is stricter than some hosts; say so where a failure only matters for portability.
3. **Check the rest by hand:**
   - **Instruction files**: every `@import`, linked file, script, command and path they name exists (search the repo); nothing over about 200 lines without a reason (Codex stops adding `AGENTS.md` files once their combined size reaches `project_doc_max_bytes`, 32 KiB by default); no two files or sections giving contradictory rules (for example two package managers or test commands); no secrets or personal data.
   - **Frontmatter of host-native files** (outside Kete's linter): valid YAML, a skill's `name` matching its folder (agents and commands take their name from the file or the `name` field, depending on the host), a description that says when to use it, and no two items with near-identical descriptions.
   - **Hooks in host settings**: every command path exists and is executable; no network calls, `curl | sh`, or writes outside the project; matchers not so broad that every tool call runs a slow script; timeouts set.
   - **MCP configs**: no literal tokens or keys (use environment variables); servers pinned to a version rather than `@latest`; `http://` only for localhost; each server's command resolves.
   - **Permissions**: flag broad allows such as all shell commands, `rm`, `git push`, or reading `~/.ssh` and `.env`.
   - **Plugin manifests**: valid JSON; every component path starts with `./` and exists; versions match across manifests and `package.json`. If the Claude Code CLI is installed, run `claude plugin validate <dir>` on each `.claude-plugin/` root and keep its errors and warnings. The `agent-plugin-authoring` skill has the manifest rules.
4. **Verify each finding** by opening the file and line; drop anything you can't point to.
5. **Report:**

```
## Agent config lint: <path>
Errors (break loading or behaviour)
- path:line: problem. Fix.
Warnings (risky or wasteful)
- path:line: problem. Fix.
Kete linter: <n> items checked, <n> failed
Checked by hand: <areas>  Not present: <areas>
```

Then ask which fixes to apply. For a deeper security review of agent permissions and prompt-injection paths, use the `agent-security` skill.

Path: $ARGUMENTS
