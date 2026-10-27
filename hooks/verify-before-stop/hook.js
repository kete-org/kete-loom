'use strict';

// When the agent ends its turn with changed code, runs the project's own lint and type-check commands
// and sends it back to fix failures. check({ cwd, again }) -> verdict.

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const TIMEOUT_MS = 75000;
const CODE = /\.(?:[cm]?[jt]sx?|vue|svelte|astro|py|go|json)$/;

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
  } catch {
    return null;
  }
};

// Package managers are .cmd shims on Windows, which Node only starts through a shell. Their args are
// fixed; ruff and go get file names, which cmd.exe would parse (`x&calc&.py`), so they never use one.
const SHIMS = new Set(['npm', 'pnpm', 'yarn', 'bun']);
const needsShell = (program, platform = process.platform) => platform === 'win32' && SHIMS.has(program);

function onPath(bin) {
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD').split(';') : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) for (const ext of exts) if (dir && fs.existsSync(path.join(dir, bin + ext))) return true;
  return false;
}

// [label, program, args] for each check the project defines.
function checksFor(root, changed) {
  const checks = [];
  const has = (f) => fs.existsSync(path.join(root, f));
  let pkg = null;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch {
    // no package.json
  }
  const scripts = (pkg && pkg.scripts) || {};
  const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lock') || has('bun.lockb') ? 'bun' : 'npm';
  for (const name of [['typecheck', 'type-check', 'check-types'].find((s) => scripts[s]), scripts.lint && 'lint'].filter(Boolean)) {
    checks.push([`${pm} run ${name}`, pm, ['run', name]]);
  }
  const py = changed.filter((f) => f.endsWith('.py'));
  const ruffConfigured = has('ruff.toml') || has('.ruff.toml') || /\[tool\.ruff/.test(has('pyproject.toml') ? fs.readFileSync(path.join(root, 'pyproject.toml'), 'utf8') : '');
  if (py.length && ruffConfigured && onPath('ruff')) checks.push([`ruff check ${py.join(' ')}`, 'ruff', ['check', ...py]]);
  if (changed.some((f) => f.endsWith('.go')) && has('go.mod') && onPath('go')) checks.push(['go vet ./...', 'go', ['vet', './...']]);
  return checks;
}

function check(event) {
  if (event.again) return { block: false };
  const cwd = event.cwd || process.cwd();
  const root = (git(cwd, ['rev-parse', '--show-toplevel']) || '').trim();
  if (!root) return { block: false };
  const changed = (git(root, ['status', '--porcelain', '--untracked-files=all']) || '')
    .split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''))
    .filter((f) => CODE.test(f) && fs.existsSync(path.join(root, f)));
  if (!changed.length) return { block: false };
  for (const [label, program, args] of checksFor(root, changed)) {
    const r = spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: TIMEOUT_MS, shell: needsShell(program) });
    if (r.error || r.status === 0) continue; // a check that can't start or times out says nothing about the code
    const tail = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-30).join('\n').slice(-2500);
    return {
      block: true,
      reason: `kete-loom (verify-before-stop): \`${label}\` fails with your changes. Fix the cause in the code (don't weaken the check), run it again, and only then finish.\n\n${tail}`,
    };
  }
  return { block: false };
}

module.exports = { check, checksFor, needsShell };
