# Contributing to Kete Loom

Kete Loom prefers a small number of excellent skills to a large number of untested ones. The same bar applies to agents (`agents/<name>/AGENT.md`) and commands (`commands/<name>.md`); see the spec for their extra rules. A new skill is accepted when it:

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

## Live evals

Live evals ask a model to route every trigger prompt the way a host does, and check that the right skill or agent is picked (and the near misses aren't). Prompts are routed in batches of 25 against the full catalog, which is sent as a cached block, so a full run of all skills and agents is under 100 calls.

```bash
npm install                                   # live evals use the Anthropic SDK (a dev dependency only)
export ANTHROPIC_API_KEY=...
npm run eval:estimate                         # calls and tokens a run would use; makes no API calls
npm run eval:live -- --skill my-skill         # one item
npm run eval:live -- --changed                # only items changed since origin/main
npm run eval:live -- --report live-evals.json # everything, with every miss in the report
```

The default model is `claude-opus-5-5`; set `KETE_LOOM_EVAL_MODEL` to use another. To use any OpenAI-compatible endpoint instead (Kete Gateway, OpenRouter, a local server), set `KETE_LOOM_EVAL_PROVIDER=openai` with `KETE_LOOM_EVAL_BASE_URL`, `KETE_LOOM_EVAL_API_KEY` and `KETE_LOOM_EVAL_MODEL`. A run fails when the overall pass rate is under 90% or any item is under 75% (`--min-pass`, `--item-min`); `--max-calls` (default 300) stops a run that would cost more than you expect.

In CI, `.github/workflows/live-evals.yml` runs the changed items on pull requests and everything weekly, once the `ANTHROPIC_API_KEY` repository secret is set.

## Commits

Use Conventional Commits, scoped to the skill when relevant: `feat(paystack-integration): add refund flow`.
