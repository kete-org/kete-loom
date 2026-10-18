---
name: use-skills
description: Always-on rule to check for an installed skill, agent or command that fits a task before starting it, say which one is used, and follow its steps rather than working from memory.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

- Before starting a task, including a clarifying question or a quick look at the code, check whether an installed skill, agent or command covers it. Check again when the task changes.
- If one fits even partly, load it and tell the user in one line which one you are using and why.
- Prefer the most specific match: a framework skill over a language skill, a language reviewer over a general one.
- Process skills (brainstorming, debugging, test-first, planning) come before implementation skills; they decide how the work is done.
- Follow a loaded skill's steps in order. Do not skip a step because you remember the gist or the task looks simple.
- Where a skill has a checklist, work through every item and report each one.
- Treat a skill's "stop and ask" points as real stops; do not guess past them.
- Read a skill's `references/` files when its steps tell you to, not from memory of similar files.
- Delegate to an agent when its description matches and its separate context helps (reviews, wide searches, build fixes).
- If no skill fits, say so briefly and work normally; do not force a poor match.
- The user's explicit instructions win over any skill. When they conflict, follow the user and mention the conflict once.
- Never claim to have followed a skill you did not load.
