'use strict';

// After the agent edits files, formats each one with the formatter the project already uses.
// Never formats with a tool the project hasn't chosen, never touches files outside the project,
// never fails the edit. check({ files: [{ path }], cwd }) -> {}

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TIMEOUT_MS = 15000;
const WEB = /\.(?:[cm]?[jt]sx?|json|jsonc|css|scss|less|html|vue|svelte|astro|md|mdx|ya?ml|graphql)$/;

const exists = (p) => fs.existsSync(p);
const read = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

function onPath(bin) {
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD').split(';') : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of exts) if (dir && exists(path.join(dir, bin + ext))) return path.join(dir, bin + ext);
  }
  return null;
}

// Nearest folder at or above `from` (but not above `root`) that contains `marker`.
function nearest(from, root, marker) {
  for (let dir = from; ; dir = path.dirname(dir)) {
    if (exists(path.join(dir, marker))) return dir;
    if (dir === root || dir === path.dirname(dir)) return null;
  }
}

function localBin(from, root, name) {
  const dir = nearest(from, root, path.join('node_modules', '.bin', name));
  return dir && path.join(dir, 'node_modules', '.bin', name);
}

// Returns [program, args] for the project's formatter for this file, or null.
function formatterFor(file, root) {
  const dir = path.dirname(file);
  if (WEB.test(file)) {
    const biomeDir = nearest(dir, root, 'biome.json') || nearest(dir, root, 'biome.jsonc');
    const biome = biomeDir && localBin(dir, root, 'biome');
    if (biome) return [biome, ['format', '--write', file]];
    const prettier = localBin(dir, root, 'prettier');
    if (prettier) return [prettier, ['--write', '--log-level', 'warn', file]];
    return null;
  }
  if (file.endsWith('.py')) {
    const pyproject = read(path.join(nearest(dir, root, 'pyproject.toml') || '', 'pyproject.toml'));
    const ruffConfig = /\[tool\.ruff/.test(pyproject) || nearest(dir, root, 'ruff.toml') || nearest(dir, root, '.ruff.toml');
    if (ruffConfig && onPath('ruff')) return [onPath('ruff'), ['format', file]];
    if (/\[tool\.black/.test(pyproject) && onPath('black')) return [onPath('black'), ['-q', file]];
    return null;
  }
  if (file.endsWith('.go') && onPath('gofmt')) return [onPath('gofmt'), ['-w', file]];
  if (file.endsWith('.rs') && onPath('rustfmt')) {
    const cargo = nearest(dir, root, 'Cargo.toml');
    const edition = (/^\s*edition\s*=\s*"(\d{4})"/m.exec(read(path.join(cargo || '', 'Cargo.toml'))) || [])[1];
    return [onPath('rustfmt'), [...(edition ? ['--edition', edition] : []), file]];
  }
  return null;
}

function check(event) {
  const root = path.resolve(event.cwd || process.cwd());
  for (const f of event.files || []) {
    if (!f || typeof f.path !== 'string') continue;
    const file = path.resolve(root, f.path);
    const rel = path.relative(root, file);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !exists(file)) continue;
    const fmt = formatterFor(file, root);
    if (!fmt) continue;
    try {
      execFileSync(fmt[0], fmt[1], { cwd: root, stdio: 'ignore', timeout: TIMEOUT_MS });
    } catch {
      // A formatter error (syntax error mid-edit, missing plugin) must never fail the edit.
    }
  }
  return {};
}

module.exports = { check, formatterFor };
