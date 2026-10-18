---
name: codemap
description: Write or refresh a short architecture map of the codebase (entry points, modules, data flow, commands) at docs/CODEMAP.md, so agents can orient without reading everything.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "[area to focus on]"
  kete-loom/owner: "Kete-org"
---

Create or update `docs/CODEMAP.md` (or the project's existing map if it has one). If the `codebase-onboarding` skill is available, use its exploration steps.

1. Find the entry points (main files, servers, CLIs, workers), the build, test and run commands, and the top-level modules. Read enough of each module to describe it accurately; don't guess from names.
2. Write the map, under 150 lines:
   - **Run it**: the commands, one line each.
   - **Entry points**: `path` and what starts there.
   - **Modules**: one line per module, `path/` and what it owns; group by layer if the project has layers.
   - **Data flow**: how a typical request or job moves through the modules, as a short list.
   - **Where to change things**: common tasks mapped to the files to touch.
3. If a map already exists, update the parts that are out of date and keep what is still right. Keep paths exact so they stay greppable.
4. Suggest linking it from AGENTS.md if it isn't already. Don't commit.

Focus, if any: $ARGUMENTS
