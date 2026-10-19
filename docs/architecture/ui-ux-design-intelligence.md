# UI/UX design intelligence in Kete Loom

How Kete Loom makes design decisions, turns them into code and checks the result, after the UI/UX Pro Max review (`docs/analysis/ui-ux-pro-max-gap-analysis.md`).

## Decision: knowledge in skills, checks in scripts, no search engine

The reference keeps its design knowledge in CSV files and retrieves it with a BM25 engine written in Python. Kete Loom does not adopt that:

- **Context efficiency comes from progressive disclosure.** A skill's `SKILL.md` tells the agent to read one row of `references/product-directions.md`, or one stack section of `references/stack-wiring.md`. That loads only what the task needs, as a search would, with no second runtime.
- **No new runtime.** The installer and scripts stay zero-dependency Node (AGENTS.md rule). A Python search engine would be a parallel framework that every host would need to run.
- **Determinism where it matters.** Judgement (which direction suits a clinic booking app) stays with the agent, which must state its reasons and their source. Facts that can be computed, such as contrast ratios and counts of hard-coded values, come from scripts with exit codes. The reference computes contrast only inside its own data validator; Kete Loom gives that check to the user.

## Responsibilities

| Layer | Owns | Items |
|---|---|---|
| Kete Loom (this repo) | Design knowledge, process, deterministic checks | `design-system` (direction, tokens, DESIGN.md), `ui-design-polish` (screen finish), `css-architecture`, `web-accessibility`, `mobile-accessibility`, `ui-motion`, `ui-flow-audit`, `metrics-dashboards`, framework skills; agents `ui-auditor`, `accessibility-reviewer`; command `/design-ui`; scripts `contrast.js`, `token-audit.js` |
| Kete Code runtime (and other hosts) | Loading skills, running agents and commands, browser tools for rendered checks | Not changed. Items are installed per host by the existing installer |
| Kete Code platform | Distribution, governance | Not changed. The `design` profile is the distribution unit |

Repository boundary confirmed: everything here lives in `kete-loom`; no host or platform code was touched. Nothing is coupled to a portal, hosting provider or framework: stack-specific advice is a per-stack section, chosen by detecting the project's files.

## Flow

```
/design-ui  (or a direct request that routes to design-system)
  1 Context brief ── detect stack from files; find DESIGN.md, tokens, brand
  2 Direction ────── product-directions row + dials; reasons tagged [project]/[table]/[default]
                     preserve mode: token-audit.js → extend what exists
  3 System ───────── three-layer tokens in the stack (stack-wiring.md)
                     contrast.js on every pair, light and dark → DESIGN.md (+ pages/)
  4 Build ────────── framework skill + project components; ui-design-polish for states; ui-motion
  5 Check ────────── token-audit.js, contrast.js, project build/lint/tests, accessibility-reviewer,
                     rendered at 375/768/1280 in both themes (or "not rendered")
  6 Review ───────── ui-auditor scores against DESIGN.md
```

Each stage stops for approval (the same gate pattern as `/feature-dev`). There's no new orchestration engine: the command names skills and agents, and the host runs them.

## Design preservation

`design-system` has three modes. In **preserve** mode (an existing app), the agent runs `token-audit.js` first and treats the most-used values as the system. **Extend** mode applies when a DESIGN.md exists, and it then wins over the skill's defaults. A redesign happens only when asked. DESIGN.md is never overwritten without showing the diff and getting approval. `ui-design-polish` and `ui-auditor` read DESIGN.md first.

## Trade-offs made explicit

The skill asks for two directions with a trade-off table (usability, aesthetics, accessibility risk, build effort, performance) when there is no brand and the choice matters. For regulated or high-stakes categories (healthcare, government, fintech), it caps expressiveness at 3 unless the brand says otherwise, and records the trade-off.

## Security and untrusted input

- The scripts only read files. `token-audit.js` skips vendor and build folders, caps file size at 512 KB, and reports unreadable folders instead of failing silently. `contrast.js` resolves `var()` chains with a depth limit, so circular tokens can't loop forever.
- The skill forbids sending private product details to external design or font services to get a recommendation.
- The reference repo was treated as data: nothing was executed, and no text was copied. Kete Loom's tables and rules are written from scratch, with the reference credited as the source of the ideas (MIT).
