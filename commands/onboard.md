---
name: onboard
description: Get oriented in an unfamiliar codebase: what it does, how it is laid out, how to build, test and run it, and where to start.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[area or question to focus on]"
  kete-loom/owner: "Kete-org"
---

Orient in this codebase and give the user a short map of it. Do not change any files.

If the `codebase-onboarding` skill is available, follow it. Otherwise:

1. Read the README, contributing guide, agent instruction files (such as `AGENTS.md` or `CLAUDE.md`) and the main manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml` and similar).
2. Map the top-level layout and find the entry points: main binaries, servers, CLI commands, route definitions.
3. Find the build, test, lint and run commands from CI workflows, package scripts or the Makefile. Run the test command only if it is fast and safe; never run deploy, migration or release commands.
4. Trace one representative request or command end to end through the code.
5. Report:

```
## <project name>
What it does: one or two sentences.
Stack: languages, frameworks, datastores.
Layout: top-level folders and what each holds.
Commands: build, test, lint, run (and whether you ran them).
How a request flows: entry point -> ... -> result, with file paths.
Conventions: patterns and rules to follow here.
Start here: three files to read first.
Unknowns: what you could not determine.
```

Area or question from the user, if any: $ARGUMENTS
