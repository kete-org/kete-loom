# Kete Loom capability architecture

How Kete Loom's parts fit together, and where the skill observation loop sits among them. Confirmed against the source at the commit that added this document.

## Responsibilities

| Layer | Owns | Does not own |
|---|---|---|
| **Kete Loom** (this repository, `@ketecode/loom`) | Portable content (skills, agents, commands, rules, hooks, MCP configs); the zero-dependency installer that renders it per host; quality gates (lint, trigger and behaviour evals); small local state the hooks and CLI need (`~/.kete-loom/`) | Running agents, IDE integration, hosting, accounts |
| **Kete Code runtime** (and the other seven hosts) | The agent loop, tools, sandboxing, hook execution, session transcripts | Skill content, quality gates |
| **Kete Code platform** | Distribution, administration, gateway, portal | Anything this repository ships |

Kete Loom reaches the runtime only through each host's documented extension points: skill folders, agent and command files, hook registrations in the host's settings, and MCP config. Nothing here depends on platform UI or hosting.

## Components

```
content/                          tooling (zero dependencies)                 host side
skills/  agents/  commands/  ───▶ scripts/lib/skills.js (load) ─┐
rules/   hooks/   mcp/            scripts/lib/lint.js (spec)    ├─▶ bin/kete-loom.js ──▶ host folders and settings
profiles.json                     scripts/lib/render.js (per host)┘   install update audit doctor observe
                                  scripts/lib/{targets,hooks-install,rules-install,mcp-install,profiles,inventory}.js
                                  hooks/run.js (one normalized event per host)  ◀──── host hook calls
                                  scripts/lib/observations.js  ◀── kete-loom observe, load-session-context, capture-lessons
```

- **Discovery and activation** are the hosts' own: they route by each item's `description`. Kete Loom keeps descriptions portable (lint) and tests routing (`scripts/run-evals.js`).
- **Progressive disclosure**: `SKILL.md` under 300 lines; long material in `references/`, each pointer naming when to load it.
- **Composition** is by reference: skills and commands delegate to each other by name (`/feature-dev` → `design-brainstorming` → `implementation-plans` → `subagent-driven-development` with `task-implementer`, `spec-reviewer`, `code-reviewer`). Profiles group items for installation.
- **Hooks** are single-file `check(event)` functions behind one runner (`hooks/run.js`), which turns each host's payload into one normalized event and answers in the host's dialect. Internal errors fail open.
- **State** is plain files: `.planning/` (project plans), `.handoff/` (session handoff), `~/.kete-loom/state/` (hook bookkeeping), and now `~/.kete-loom/observations/` (the skill observation log).

## The skill observation loop

```
 during work                          between sessions                    review
 skill-observations skill ──▶ kete-loom observe new ──▶ ~/.kete-loom/observations/log/NNNN-*.md
 capture-lessons hook (stop) ─┘        │                     │
                                       │      load-session-context hook (start): open count, review due,
                                       │      rules broken twice
                                       ▼
                         /skill-review ──▶ staged/<date>/<target>/ + diff ──▶ user approves ──▶ live file
                                       └─▶ installed Kete Loom item: upstream draft (+ optional project rule)
                                       └─▶ rule broken twice: /hookify (barrier)
                                       └─▶ new skill: /skill-create
```

Design decisions:

1. **One library, three readers.** `scripts/lib/observations.js` holds the logic (id derivation, archival, restatement refusal, scan). The CLI uses it directly. The two hooks read only the frontmatter lines they need, because hooks ship as single files; their parsing is limited to `status`, `kind` and `rule`, which `render()` always writes on one line each.
2. **User scope by default.** Observations about skills installed for the user would be split if each project kept its own log, and lost if the log lived in a worktree. `KETE_LOOM_OBSERVATIONS_DIR` overrides it; `--home` moves it with the rest of `~/.kete-loom/`.
3. **Barriers in code, judgement in instructions.** Anything mechanical (ids, archival, duplicate refusal, the blank sibling check, two-violation detection, broken-scan detection) is enforced by the CLI. Anything needing judgement (what is worth logging, sibling relevance, review decisions) stays in the skill and the command.
4. **No in-place edits of installed items.** `kete-loom update` rewrites installed Kete Loom items, so `/skill-review` never stages over them; improvements to them become upstream drafts.
5. **No network, no new dependencies.** The log never leaves the machine; the library uses only Node's standard library.

## Extension points

- New observation kinds: add to `KINDS` in `observations.js`, then to the table in the skill.
- Another reader (for example a dashboard): consume `kete-loom observe scan --json` or `list --json`, rather than parsing files.
- Another host's session-start context: the `load-session-context` hook already reaches every host with a session-start event.
