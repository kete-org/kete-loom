---
name: hookify
description: Turn a rule the agent must never break into an enforced hook: write it in the portable Kete Loom hook format, test it with cases, and show how to register it.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: writes-files
  kete-loom/argument-hint: "<the rule to enforce>"
  kete-loom/owner: "Kete-org"
---

Turn the rule below into a hook that blocks the action, instead of a note that can be forgotten.

1. **Pin down the rule.** Which event it guards (before a shell command, or before a file edit) and exactly what must be blocked. Write 3 or more examples that must be blocked and 3 or more near misses that must be allowed. Confirm them with the user.
2. **Write the hook** in the Kete Loom format, in `.kete-loom/hooks/<name>/` unless the user picks another folder:
   - `HOOK.md`: frontmatter with `name`, `description`, `license`, and `metadata` (`kete-loom/version`, `kete-loom/category`, `kete-loom/risk: read-only`, `kete-loom/event`: `pre-shell` or `pre-edit`), plus a short explanation.
   - `hook.js`: `module.exports = { check }`, where `check({ command, cwd })` or `check({ files: [{ path, content }], cwd })` returns `{ block: true, reason }` or `{ block: false }`. Pure: no network, no writes, no child processes.
   - `cases.json`: `should_block` and `should_allow` lists from step 1.
3. **Test it:** run `npx @ketecode/loom check .kete-loom/hooks/<name>` and fix until every case passes.
4. **Register it** with the current host: show the exact config change for its hook settings (for example a PreToolUse entry in `.claude/settings.json` or `kete.hooks` in `kete.json`) and **apply it only after the user agrees**. Mention that a hook that should help others can be contributed to Kete Loom.

Rule: $ARGUMENTS
