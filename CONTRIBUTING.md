# Contributing to Kete Loom

Kete Loom prefers a small number of excellent skills to a large number of untested ones. A new skill is accepted when it:

1. Solves a task coding agents do often, and that isn't already covered by an existing skill (extend that one instead).
2. Follows [`docs/SKILL_SPEC.md`](docs/SKILL_SPEC.md).
3. Ships `evals/triggers.json` with at least 3 should-trigger and 3 near-miss should-not-trigger prompts.
4. Passes `npm run check`, and live routing evals in CI.
5. Has been tried in at least two hosts (say which in the PR).

## Workflow

```bash
git clone https://github.com/Kete-org/kete-loom && cd kete-loom
mkdir -p skills/my-skill/evals
# write skills/my-skill/SKILL.md and skills/my-skill/evals/triggers.json
npm run check
npm run catalog
node bin/kete-loom.js install --project --skill my-skill --link   # try it in a real repo
```

Or ask your agent to use the `skill-authoring` skill.

## Versioning

- Each skill has its own `kete-loom/version`: patch for wording, minor for new steps, major when behaviour changes.
- The package version covers the installer and the collection; it's bumped on release in `package.json` and every plugin manifest at once (the linter checks they match).

## Live evals locally

```bash
export KETE_LOOM_EVAL_BASE_URL=https://api.openai.com/v1   # any OpenAI-compatible endpoint
export KETE_LOOM_EVAL_API_KEY=...
export KETE_LOOM_EVAL_MODEL=...
npm run eval:live -- --skill my-skill
```

## Commits

Use Conventional Commits, scoped to the skill when relevant: `feat(paystack-integration): add refund flow`.
