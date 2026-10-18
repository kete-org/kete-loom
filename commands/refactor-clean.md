---
name: refactor-clean
description: Find and remove dead code, unused exports and unused dependencies, verifying with the build and tests after each removal.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/argument-hint: "[directory or package]"
  kete-loom/owner: "Kete-org"
---

Remove dead code without changing behaviour.

If the `refactor-cleaner` agent is available, delegate to it with the scope below. Otherwise:

1. Confirm the working tree is clean or committed, so every removal can be reverted. If it is not, ask the user before continuing.
2. Run the project's tests once to get a green baseline. If they already fail, stop and report that.
3. Find candidates with the language's own tools where the project has them (for example `knip` for TypeScript and JavaScript files, exports and dependencies, `vulture` for Python, `staticcheck` (check U1000) or `deadcode` for Go, `go mod tidy` for unused Go modules, compiler and linter unused warnings), and confirm each by searching the whole repository for references.
4. Treat as not dead, and leave alone unless the user says otherwise: public API of a published package, anything loaded by name (reflection, dependency injection, routes, plugins, CLI entry points, config files), and code used only by tests or scripts. For unused dependencies, also check build config, scripts and dynamic imports before removing them.
5. Remove in small batches. After each batch run the build and tests; revert the batch if anything fails.
6. Report: what was removed (path and symbol), what was kept as uncertain and why, and the final build and test result.

Scope from the user, if any: $ARGUMENTS
