---
name: update-docs
description: Update the README, API docs, changelog and code comments that the current change made stale, without touching unrelated docs.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "[files or docs to focus on]"
  kete-loom/owner: "Kete-org"
---

Bring the documentation in line with the current change.

If the `doc-updater` agent is available, delegate to it with the scope below. Otherwise:

1. Take the change set from the diff against `HEAD`, or the branch diff against the default branch.
2. Search the docs for anything the change affects: renamed or removed functions, flags, config keys, environment variables, endpoints, commands and examples. Check the README, `docs/`, API references, docstrings and the changelog.
3. Update only what the change made wrong or incomplete. Keep each doc's existing tone and structure. Do not rewrite unrelated sections.
4. If the project keeps a changelog, add an entry under the unreleased section in its format.
5. Check examples you changed still match the code: commands exist, option names are right, code snippets compile or run where practical. If the project has a docs build or link checker, run it.
6. If the intended behaviour is unclear from the code, ask the user instead of guessing.
7. Report each file changed with a one-line reason, and any docs you think need a human decision.

Focus from the user, if any: $ARGUMENTS
