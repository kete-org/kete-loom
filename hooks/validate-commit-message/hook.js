'use strict';

// In repositories that enforce Conventional Commits (a commitlint or commitizen config is present),
// blocks `git commit -m` messages whose subject doesn't follow `type(scope)!: subject`, so the agent
// fixes the message before the commit hook or CI rejects it. Elsewhere it does nothing.
// check({ command, cwd }) -> verdict.

const fs = require('fs');
const path = require('path');

const DEFAULT_TYPES = ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'];
const MAX_HEADER = 100; // commitlint config-conventional's header-max-length
const CONFIGS = ['commitlint.config.js', 'commitlint.config.cjs', 'commitlint.config.mjs', 'commitlint.config.ts', '.commitlintrc', '.commitlintrc.json', '.commitlintrc.yml', '.commitlintrc.yaml', '.commitlintrc.js', '.commitlintrc.cjs', '.cz.json', '.czrc', '.cz.toml', 'cz.yaml', 'cz.json'];

const read = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

// The config text when the repository at or above `dir` enforces Conventional Commits, else null.
function conventionalConfig(dir) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    for (const name of CONFIGS) if (fs.existsSync(path.join(d, name))) return read(path.join(d, name));
    const pkg = read(path.join(d, 'package.json'));
    if (/"commitlint"\s*:|"cz-conventional-changelog"/.test(pkg)) return pkg;
    if (/\[tool\.commitizen\]/.test(read(path.join(d, 'pyproject.toml')))) return '';
    if (fs.existsSync(path.join(d, '.git')) || d === path.dirname(d)) return null;
  }
}

// Allowed types: a type-enum list in the config when one is written out, else the conventional set.
function typesFrom(config) {
  const m = /type-enum['"]?\s*:\s*\[[^\]]*?\[([^\]]+)\]/.exec(config || '');
  const listed = m && [...m[1].matchAll(/['"]([a-z][\w-]*)['"]/g)].map((x) => x[1]);
  return listed && listed.length ? listed : DEFAULT_TYPES;
}

// The commit message's first line from `git commit` arguments, or null when there is no -m.
function subject(command) {
  if (!/\bgit\b(?:\s+-[cC]\s+\S+)*\s+commit\b/.test(command)) return null;
  const heredoc = /(?:-m|--message(?:=|\s+))\s*"?\$\(cat\s+<<-?\s*['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\s*\1\b/.exec(command);
  if (heredoc) return heredoc[2].split('\n').find((l) => l.trim()) || '';
  const m = /(?:\s-[a-zA-Z]*m\s*|\s--message(?:=|\s+))(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+))/.exec(command);
  if (!m) return null;
  return (m[1] !== undefined ? m[1].replace(/\\(.)/g, '$1') : m[2] !== undefined ? m[2] : m[3]).split('\n')[0];
}

function check(event) {
  const command = String(event.command || '');
  const line = subject(command);
  if (line === null) return { block: false };
  if (/^(?:Merge|Revert|fixup!|squash!|amend!)\b/.test(line)) return { block: false };
  const config = conventionalConfig(event.cwd || process.cwd());
  if (config === null) return { block: false };
  const types = typesFrom(config);
  const m = /^([a-z][\w-]*)(\([^()\n]+\))?(!)?: (\S.*)$/.exec(line);
  let problem = null;
  if (!m) problem = `"${line}" isn't in the form \`type(scope): subject\``;
  else if (!types.includes(m[1])) problem = `"${m[1]}" isn't an allowed type (${types.join(', ')})`;
  else if (line.length > MAX_HEADER) problem = `the first line is ${line.length} characters; the limit is ${MAX_HEADER}`;
  if (!problem) return { block: false };
  return {
    block: true,
    reason: `Blocked by kete-loom (validate-commit-message): this repository enforces Conventional Commits and ${problem}. Rewrite the message, for example \`fix(api): handle empty cart\`, with a body after a blank line if needed, and commit again.`,
  };
}

module.exports = { check, subject, typesFrom };
