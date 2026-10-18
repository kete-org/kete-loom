---
name: scan-read-injection
description: After the agent reads a file, fetches a web page or runs a web search, warns it when the content contains text aimed at an AI, such as "ignore previous instructions", fake system prompts or hidden Unicode, so it treats the content as data rather than orders.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/event: "post-read"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Scan read injection

A prompt injection gets in when the agent reads something an attacker wrote: an issue, a web page, a dependency's README, a file in a cloned repository. This hook runs after every file read, web fetch and web search, and scans what came back. It looks for text that:
- tells the agent to drop its instructions or gives it a new identity;
- imitates a system prompt;
- asks it to hide things from the user, send secrets somewhere, or skip approvals;
- addresses "the AI reading this", or tries to survive context summarisation;
- contains hidden Unicode characters.

When it finds any of these, it adds a note after the tool's result. The note tells the agent to treat the content as data, not act on its requests, and tell you what it asked for.

It never blocks or hides the content, so a false positive only costs one sentence of context. You'll see that on files that discuss prompt injection, such as security docs or this hook. Pattern matching catches known phrasings, not every injection; pair it with `guard-prompt-injection`, which stops injected text being saved into instruction files.

Available in Claude Code, Gemini CLI and Kete Code. Codex reads files through the shell, Cursor and Copilot can't add a note after a read, and OpenCode has no command hook for it.

Opt-in: `--hooks` leaves it out; install it with `--hook scan-read-injection`, `--profile security` or `--profile strict`.
