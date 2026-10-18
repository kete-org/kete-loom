---
name: i18n-check
description: Check the current UI changes for internationalisation problems such as hard-coded strings, concatenation, plurals, and date or currency formatting.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "git"
  kete-loom/argument-hint: "[files, commit range or locale]"
  kete-loom/owner: "Kete-org"
---

Check the current UI changes for internationalisation problems. Report only; do not edit files.

If the `i18n-reviewer` agent is available, delegate to it with the scope below. Otherwise, if the `i18n-localization` skill is available, use it as the checklist. If neither is available:

1. Take the change set from the scope below, or `git diff HEAD` plus untracked files from `git status --short`, or the branch diff against the default branch. Keep only UI code, templates and message catalogs.
2. Find the project's i18n library and message files, and check the diff for:
   - user-visible strings not passed through the translation function;
   - sentences built by concatenating translated pieces instead of one message with placeholders;
   - plurals done with `count === 1` instead of the library's plural or ICU `plural` support;
   - dates, numbers and currency formatted by hand instead of `Intl` or the library's formatters;
   - keys used in code but missing from the source catalog, or keys added to one locale only;
   - layout that breaks for right-to-left scripts (physical `left`/`right` instead of logical properties) or longer text;
   - text in images, and `alt` or `aria-label` strings left untranslated.
3. Confirm each finding by reading the line. Drop anything you cannot point to.
4. Report:

```
## i18n check: <scope>
- [blocking|should fix|nit] path:line: problem. Fix.
Catalog: missing keys ... | none
Verdict: ready | needs changes
```

If there are no UI changes, say so and stop.

Scope, if any: $ARGUMENTS
