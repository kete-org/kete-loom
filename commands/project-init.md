---
name: project-init
description: Set a repository up for coding agents: write or improve AGENTS.md, install the Kete Loom packs for its stack, and fix what the readiness audit flags.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "[focus]"
  kete-loom/owner: "Kete-org"
---

Prepare this repository for working with coding agents. Ask before each change.

1. **Audit.** Run `npx @ketecode/loom audit` and show the scorecard.
2. **Instructions.** If there is no `AGENTS.md` (or `CLAUDE.md`), draft one with the `codebase-onboarding` skill: what the project is, how to build, test and run it (exact commands), the layout, conventions, and what agents must not do. If one exists, propose specific improvements; keep it under a few hundred lines.
3. **Packs.** Run `npx @ketecode/loom profiles` here and recommend a profile (usually `core`, or `developer` to include the safety hooks). Install it after the user agrees: `npx @ketecode/loom install --profile <name>` (add `--project` to share it with the team through the repository).
4. **Fix the rest** of the audit's findings that are quick and safe (for example `.gitignore` for `.env`), and list the others.
5. Run the audit again and report the new score. Don't commit.

Focus: $ARGUMENTS
