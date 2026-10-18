---
name: learn
description: Turn a lesson from this session into a lasting project rule, in AGENTS.md or a Kete Loom rule, so future sessions don't repeat the mistake.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "[the lesson]"
  kete-loom/owner: "Kete-org"
---

Capture a lesson so it sticks.

1. **Find the lesson.** Use the one given below, or the most important correction, surprise or repeated mistake in this session. State it as one concrete rule: "When X, do Y (because Z)". Vague lessons ("be careful") are not worth saving.
2. **Choose where it lives:**
   - A project fact or convention → `AGENTS.md` (or `CLAUDE.md` if that is what the project uses), under the most fitting heading.
   - Guidance for one language or file type → a short rule file the hosts load for those paths (see the Kete Loom rules format: `kete-loom/paths` globs).
   - Something that must be enforced, not just remembered → suggest `/hookify` instead.
3. Check it doesn't duplicate or contradict an existing line; update the existing line if it does.
4. Show the exact text and location, and **write it only after the user agrees**. Don't commit.

Lesson: $ARGUMENTS
