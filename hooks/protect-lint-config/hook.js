'use strict';

// Blocks edits to existing linter, formatter and type-checker configs, so the agent fixes the code
// instead of weakening the rule. New configs are allowed. check({ files: [{ path }], cwd }) -> verdict.

const fs = require('fs');
const path = require('path');

const CONFIG = /^(?:\.eslintrc(?:\.[a-z]+)?|eslint\.config\.[cm]?[jt]s|biome\.jsonc?|\.prettierrc(?:\.[a-z]+)?|prettier\.config\.[cm]?[jt]s|\.stylelintrc(?:\.[a-z]+)?|stylelint\.config\.[cm]?js|\.?ruff\.toml|\.flake8|\.pylintrc|\.?mypy\.ini|\.golangci\.(?:ya?ml|toml|json)|\.?clippy\.toml|\.?rustfmt\.toml|\.rubocop\.yml|phpstan\.neon(?:\.dist)?)$/;

function check(event) {
  const cwd = event.cwd || process.cwd();
  for (const f of event.files || []) {
    if (!f || typeof f.path !== 'string') continue;
    const base = path.basename(f.path);
    if (!CONFIG.test(base) || !fs.existsSync(path.resolve(cwd, f.path))) continue;
    return {
      block: true,
      reason: `Blocked by kete-loom (protect-lint-config): \`${f.path}\` configures a linter or formatter. Fix the code that breaks the rule instead of changing the rule. If the user asked for this config change, tell them this hook blocks it so they can make the edit themselves.`,
    };
  }
  return { block: false };
}

module.exports = { check };
