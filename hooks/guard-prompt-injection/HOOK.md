---
name: guard-prompt-injection
description: Stops the agent from writing planted instructions, such as "ignore previous instructions", hidden Unicode or "don't tell the user", into AGENTS.md, rules, skills, agent files or .planning/, where every later session would obey them.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: read-only
  kete-loom/event: "pre-edit"
  kete-loom/opt-in: "true"
  kete-loom/owner: "Kete-org"
---

# Guard prompt injection

Agents load some files as instructions in every session:
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` and Copilot's instruction files;
- rules, skills and agent files;
- host folders such as `.claude/`, `.cursor/` and `.kiro/`;
- planning state in `.planning/`.

Text from a web page, an issue or a tool's output that ends up in one of those files is a lasting prompt injection. This hook runs before every write to them and blocks text that:

- tells the agent to ignore or override its instructions, or gives it a new identity;
- imitates a system prompt (`<system>`, "new system prompt");
- asks it to hide something from the user;
- asks it to send secrets, tokens or `.env` contents somewhere;
- tells it to skip approvals or bypass the sandbox;
- contains hidden characters (zero-width spaces, bidirectional overrides, Unicode tag characters).

Phrases inside code spans, fenced blocks, quotes or blockquotes are treated as examples, so documentation about prompt injection can still be written. Other files are not checked.

It reads only the text being written and runs no commands. It is a seatbelt: a reworded injection can get past patterns, so treat it as one layer beside reviewing what agents write into these files.

Opt-in: `--hooks` leaves it out; install it with `--hook guard-prompt-injection`, `--profile security` or `--profile strict`. Not available in Cursor, which has no documented hook before an edit.
