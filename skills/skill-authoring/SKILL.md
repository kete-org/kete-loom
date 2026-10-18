---
name: skill-authoring
description: Creates or improves an Agent Skill (a SKILL.md folder) so it loads reliably and works unchanged in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot and Kete Code, including portable frontmatter, a tight trigger description, short instructions, helper scripts and trigger evals. Use when the user wants to write a new skill, turn a repeated workflow into a skill, or fix a skill that triggers at the wrong time.
license: MIT
compatibility: Any Agent Skills host.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Skill authoring

A good skill is found at the right moment and followed exactly. Two things decide that: the **description** (routing) and the **body** (execution).

## 1. Capture the workflow

Ask, or extract from the conversation:

- What task does the skill handle, and what does "done" look like?
- 3–5 real requests that should load it, and 3–5 similar requests that should **not**.
- The steps an expert follows, the decisions they make, and where they stop and ask.
- Which parts are deterministic (better as a script) and which need judgment (instructions).

If the workflow is a single fact or a one-line rule, it belongs in `AGENTS.md`, not a skill. Say so.

## 2. Write the frontmatter

Use exactly this shape; it is the subset every host accepts. Details are in `references/frontmatter.md`.

```yaml
---
name: kebab-case-name            # equals the folder name, max 64 chars
description: <What it does, in one sentence>. Use when <the situations and phrasings that should load it>.
license: MIT
compatibility: <tools, network or OS it needs>
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding     # coding | testing | security | integrations | devops | docs | meta
  kete-loom/risk: read-only      # read-only | writes-files | runs-commands | network
  kete-loom/requires: "git"      # optional, comma-separated CLIs
---
```

The description is the only thing a host reads before deciding to load the skill. Make it:

- **Specific**: name the task, the objects and the outputs ("Paystack webhooks", not "payments stuff").
- **Triggerable**: list the situations and words users actually say after "Use when".
- **Distinct**: if another skill's description overlaps, sharpen both so a router can tell them apart.
- One line, 80–1024 characters.

## 3. Write the body

- Under 300 lines. Put long material in `references/` and say exactly when to read each file.
- Numbered steps for procedures; checklists for reviews; a fixed format for the final report.
- Say where to stop and ask the user, and what never to do.
- Describe actions by capability ("run the test command", "search the codebase"), not by one host's tool names, so every host can follow them.
- Move deterministic work into `scripts/`: one task per script, clear output, non-zero exit on failure, only tools listed in `kete-loom/requires`, with a shebang and `chmod +x`.

## 4. Write trigger evals

Create `evals/triggers.json` with at least 3 `should_trigger` and 3 `should_not_trigger` prompts. Make the negatives **near misses**: same domain, different job. These are what catch an over-broad description.

## 5. Check it

In a Kete Loom checkout:

```
npm run lint        # spec checks: frontmatter, length, references, evals
npm run eval        # eval file checks
npm run eval:live   # routes every prompt through a model, like a host does
```

Outside the repo, apply the checklist in `references/frontmatter.md` by hand. Then install locally and try the real prompts in at least two hosts:

```
npx @ketecode/loom install --project --skill <name> --link
```

## 6. Iterate on misses

- Skill didn't load → the description is missing the user's words or the situation. Add them.
- Loaded when it shouldn't → the description is too broad. Narrow it and add the prompt as a negative eval.
- Loaded but did the wrong thing → the body is ambiguous at that step. Add a rule or an example there.

Bump `kete-loom/version` on every change: patch for wording, minor for new steps, major when behaviour changes.
