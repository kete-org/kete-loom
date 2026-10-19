# AGENTS.md: working in the kete-loom repo

This repo is a library of Agent Skills, subagents and slash commands, plus the tooling that installs and checks them. It has no runtime dependencies; everything runs on Node 18+.

## Layout

- `skills/<name>/`: one skill per folder. `SKILL.md`, `evals/triggers.json`, optional `references/` and `scripts/`. Skill scripts run with Node 18+ and no packages, are read-only unless the skill says otherwise, and are tested in `tests/skill-scripts.test.js`.
- `agents/<name>/`: one subagent per folder. `AGENT.md` and `evals/triggers.json`. The installer renders it per host.
- `commands/<name>.md`: one slash command per file.
- `rules/<name>.md`: one rule per file (short, always-on guidance, optional `kete-loom/paths`).
- `hooks/<name>/`: one hook per folder. `HOOK.md`, `hook.js` (exports `check`) and `cases.json`. `hooks/run.js` is the shared runner installed with them.
- `bin/kete-loom.js`: the installer CLI (`npx @ketecode/loom`), plus `kete-loom observe` for the skill observation log.
- `scripts/lib/observations.js`: the observation log (user scope, `~/.kete-loom/observations/`): id derivation, archival, restatement refusal, scans that check their own counts. The `skill-observations` skill and `/skill-review` command are its instructions; the `load-session-context` and `capture-lessons` hooks read it.
- `scripts/lib/`: shared code (frontmatter parser, item loader, host target paths, per-host renderer).
- `scripts/lint-skills.js`, `scripts/run-evals.js`, `scripts/build-catalog.js`: quality gates and catalog.
- `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`, `gemini-extension.json`: native plugin manifests. Their versions must match `package.json`.
- `profiles.json`: install profiles; `scripts/lib/profiles.js` resolves them and detects a project's languages and frameworks.
- `scripts/build-site.js`: builds the static catalog site (`npm run site`, output in the git-ignored `site/`); `.github/workflows/pages.yml` deploys it.
- `docs/SKILL_SPEC.md`: the rules every skill, agent and command follows.

## Rules

- Follow `docs/SKILL_SPEC.md` for every skill, agent and command. Only `name`, `description`, `license`, `compatibility` and `metadata` at the top level; metadata values are strings.
- Keep each `SKILL.md`, `AGENT.md` and command file under 300 lines. Long material goes in `references/`.
- Every skill, agent or command change bumps its `kete-loom/version`.
- A release bumps the version in `package.json` and all five plugin manifests together; follow `docs/RELEASING.md` (a `vX.Y.Z` tag publishes to npm).
- After adding, renaming or editing an item's description, run `npm run catalog` and commit `catalog.json`, `README.md` and `.claude-plugin/plugin.json`.
- No new npm dependencies in `bin/` or `scripts/lib/`; the installer must stay zero-dependency.
- Tests never write to the real home folder: point `KETE_LOOM_STATE_DIR`, `KETE_LOOM_OBSERVATIONS_DIR` and `--home` at temporary folders.

## Before you finish

Run `npm run check` (lint, tests and offline evals). All must pass.
