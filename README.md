<p align="center">
  <img src="assets/brand/kete-loom.svg" alt="Kete Loom" width="96" />
</p>

<h1 align="center">Kete Loom</h1>

<p align="center"><strong>Curated, tested Agent Skills for coding agents.</strong><br/>
One source. Installs unchanged in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot and Kete Code.</p>

---

Kete Loom is the skills library behind [Kete Code](https://ketecode.ai). It takes a quality-first approach: fewer skills, and every one of them is

- **portable**: uses the strictest common subset of the [Agent Skills](https://agentskills.io) format, so no host rejects it;
- **tested**: ships trigger evals that check it loads for the right requests and stays out of the way for the wrong ones;
- **short**: under 300 lines, with detail moved into `references/` that the agent reads only when needed;
- **versioned and labelled**: semver, category and a risk level (`read-only`, `writes-files`, `runs-commands`, `network`) in its metadata;
- **script-backed** where the work is deterministic.

## Install

### Any agent (recommended)

```bash
npx @ketecode/loom install
```

This installs every skill into `~/.agents/skills` (read by Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot and Kete Code) and `~/.claude/skills` (Claude Code). Restart your agent afterwards.

Common options:

```bash
npx @ketecode/loom install --project                       # into this repo (.agents/ and .claude/), commit it for your team
npx @ketecode/loom install --skill tdd-workflow,security-review
npx @ketecode/loom install --target claude                  # one host only
npx @ketecode/loom install --dir ~/.some-agent/skills       # any other agent
npx @ketecode/loom doctor                                   # what's installed, and which hosts can see it
npx @ketecode/loom uninstall                                # removes only skills kete-loom installed
```

No Node? Use the shell installers, which fall back to a plain copy:

```bash
curl -fsSL https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/Kete-org/kete-loom/main/install.ps1 | iex
```

### Native plugin installs

| Host | Command |
|---|---|
| Claude Code | `/plugin marketplace add Kete-org/kete-loom` then `/plugin install kete-loom@kete-loom` |
| Codex | `codex plugin marketplace add Kete-org/kete-loom` then `codex plugin add kete-loom@kete-loom` |
| Gemini CLI | Use the `npx` installer (Gemini reads `~/.agents/skills`). A `gemini-extension.json` is included for `gemini extensions install https://github.com/Kete-org/kete-loom` (experimental) |
| Any skills CLI | `npx skills add Kete-org/kete-loom` |

Plugin installs update through the host's own plugin manager. Use either a plugin install or the `npx` installer for a given host, not both, or the host may list each skill twice.

## Skills

<!-- catalog:start -->
| Skill | Category | Risk | What it does |
|---|---|---|---|
| [`paystack-integration`](skills/paystack-integration/SKILL.md) | integrations | network | Builds and reviews Paystack payment integrations, including transaction initialisation, server-side verification, webhooks with HMAC-SHA512 signature checks, idempotent fulfilment, and Ghana mobile money (MTN, Telecel, AT) charges. |
| [`security-review`](skills/security-review/SKILL.md) | security | read-only | Security review of a code change or module covering secrets, injection, authentication and authorization, input validation, data exposure, dependencies and unsafe configuration, with findings ranked by severity and concrete fixes. |
| [`skill-authoring`](skills/skill-authoring/SKILL.md) | meta | writes-files | Creates or improves an Agent Skill (a SKILL.md folder) so it loads reliably and works unchanged in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot and Kete Code, including portable frontmatter, a tight trigger description, short instructions, helper scripts and trigger evals. |
| [`tdd-workflow`](skills/tdd-workflow/SKILL.md) | testing | runs-commands | Test-first development loop that writes a failing test, makes it pass with the smallest change, then refactors with the suite green. |
| [`verification-loop`](skills/verification-loop/SKILL.md) | testing | runs-commands | Pre-merge verification that detects the project's build, lint, type-check and test commands, runs them in order, fixes what it safely can and reports a pass/fail verdict. |
<!-- catalog:end -->

## Where hosts look for skills

| Host | User folder | Project folder |
|---|---|---|
| Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| OpenCode only | `~/.config/opencode/skills` | `.opencode/skills` |
| Cursor only | `~/.cursor/skills` | `.cursor/skills` |
| Gemini CLI only | `~/.gemini/skills` | `.gemini/skills` |
| GitHub Copilot only | `~/.copilot/skills` | `.github/skills` |

## Contributing

Read [`docs/SKILL_SPEC.md`](docs/SKILL_SPEC.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md). Every pull request must pass:

```bash
npm run lint      # frontmatter, length, references, evals, manifest versions
npm test          # installer and linter tests
npm run eval      # eval file checks (CI also runs live routing evals)
```

The `skill-authoring` skill walks your agent through writing a new skill to this standard.

## License

MIT © Kete-org. See [LICENSE](LICENSE).
