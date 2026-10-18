---
name: loom
description: Find the Kete Loom skills, agents, commands, rules, hooks or MCP servers that fit what you are doing, and show how to install them.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: meta
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[what you are trying to do]"
  kete-loom/owner: "Kete-org"
---

Help the user find the right Kete Loom items for their task. Do not install anything without asking.

1. Read what they want to do (below). If it is empty, use the current repository and conversation as the context.
2. See what exists: run `npx @ketecode/loom list --json` (or read `catalog.json` if this is the Kete Loom repository). See what is already installed: run `npx @ketecode/loom doctor`.
3. Pick at most five items that clearly fit, preferring one skill or agent per job. For each, say in one line why it fits. Say plainly if nothing fits.
4. If the task is "set up this project", run `npx @ketecode/loom audit` and `npx @ketecode/loom profiles` instead, and recommend a profile.
5. Show the exact install command, for example `npx @ketecode/loom install --skill a,b --agent c`, and ask before running it. Hooks and MCP servers change host configuration, so say so when you suggest them.

What the user is trying to do: $ARGUMENTS
