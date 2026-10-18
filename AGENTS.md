# AGENTS.md: working in the kete-loom repo

This repo is a library of Agent Skills plus the tooling that installs and checks them. It has no runtime dependencies; everything runs on Node 18+.

## Layout

- `skills/<name>/`: one skill per folder. `SKILL.md`, `evals/triggers.json`, optional `references/` and `scripts/`.
- `bin/kete-loom.js`: the installer CLI (`npx @ketecode/loom`).
- `scripts/lib/`: shared code (frontmatter parser, skill loader, host target paths).
- `scripts/lint-skills.js`, `scripts/run-evals.js`, `scripts/build-catalog.js`: quality gates and catalog.
- `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`, `gemini-extension.json`: native plugin manifests. Their versions must match `package.json`.
- `docs/SKILL_SPEC.md`: the rules every skill follows.

## Rules

- Follow `docs/SKILL_SPEC.md` for every skill. Only `name`, `description`, `license`, `compatibility` and `metadata` at the top level; metadata values are strings.
- Keep each `SKILL.md` under 300 lines. Long material goes in `references/`.
- Every skill change bumps `kete-loom/version` in that skill.
- A release bumps the version in `package.json` and all five plugin manifests together.
- After adding, renaming or editing a skill's description, run `npm run catalog` and commit `catalog.json` and `README.md`.
- No new npm dependencies in `bin/` or `scripts/lib/`; the installer must stay zero-dependency.

## Before you finish

Run `npm run check` (lint, tests and offline evals). All must pass.
