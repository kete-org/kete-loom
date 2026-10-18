'use strict';

// Rules for hosts that can't scope instructions to file paths (verified against host docs and Kete
// Code's source, Oct 2026). User scope only. Each rule is written to a kete-loom folder that is the
// source of truth, and the host's instructions are pointed at that folder:
//   Kete Code   `@kete-loom/rules/<name>.md` imports in ~/.config/kete/AGENTS.md (relative to that file)
//   Gemini CLI  `@./kete-loom/rules/<name>.md` imports in ~/.gemini/GEMINI.md
//   OpenCode    one `<folder>/*.md` entry in the `instructions` array of ~/.config/opencode/opencode.json
//   Codex       no imports: the rule text inline in ~/.codex/AGENTS.md, kept under its 32 KiB limit
// Shared files are only changed between our markers, backed up and written atomically.

const fs = require('fs');
const path = require('path');
const { render } = require('./render');
const { readJson, writeAtomic, CommentedFileError } = require('./hooks-install');

const START = '<!-- kete-loom:rules:start (managed by kete-loom: edit outside this block) -->';
const END = '<!-- kete-loom:rules:end -->';
const BLOCK_RE = /\n*<!-- kete-loom:rules:start[^\n]*-->[\s\S]*?<!-- kete-loom:rules:end -->\n?/;
const CODEX_MAX_BYTES = 32768;

const HOSTS = {
  kete: { dir: (h) => path.join(h, '.config', 'kete', 'kete-loom', 'rules'), file: (h) => path.join(h, '.config', 'kete', 'AGENTS.md'), mode: 'import', ref: (n) => `@kete-loom/rules/${n}.md` },
  gemini: { dir: (h) => path.join(h, '.gemini', 'kete-loom', 'rules'), file: (h) => path.join(h, '.gemini', 'GEMINI.md'), mode: 'import', ref: (n) => `@./kete-loom/rules/${n}.md` },
  opencode: { dir: (h) => path.join(h, '.config', 'opencode', 'kete-loom', 'rules'), file: (h) => path.join(h, '.config', 'opencode', 'opencode.json'), mode: 'instructions' },
  codex: { dir: (h) => path.join(h, '.codex', 'kete-loom', 'rules'), file: (h) => path.join(h, '.codex', 'AGENTS.md'), mode: 'inline' },
};
const RULE_HOSTS = Object.keys(HOSTS);

const installedNames = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort() : []);

// Replaces our block in a Markdown file (or appends one); an empty block is removed.
function withBlock(text, lines) {
  const rest = text.replace(BLOCK_RE, '\n').replace(/\n{3,}$/, '\n\n');
  if (!lines.length) return rest.trim() ? `${rest.trimEnd()}\n` : '';
  return `${rest.trimEnd() ? `${rest.trimEnd()}\n\n` : ''}${START}\n${lines.join('\n')}\n${END}\n`;
}

// Points the host at whatever is in its kete-loom rules folder now. Returns a skip reason or null.
function sync(host, home, dryRun) {
  const h = HOSTS[host];
  const dir = h.dir(home);
  const names = installedNames(dir);
  const file = h.file(home);
  if (h.mode === 'instructions') {
    let data;
    try {
      data = readJson(file);
    } catch (e) {
      return e instanceof CommentedFileError ? `${e.message}. Add "${path.join(dir, '*.md')}" to its "instructions" array yourself.` : e.message;
    }
    const entry = path.join(dir, '*.md');
    const list = (Array.isArray(data.instructions) ? data.instructions : []).filter((i) => i !== entry);
    if (names.length) list.push(entry);
    if (list.length) data.instructions = list;
    else delete data.instructions;
    if (!dryRun) {
      if (Object.keys(data).length) writeAtomic(file, JSON.stringify(data, null, 2) + '\n');
      else if (fs.existsSync(file)) fs.rmSync(file);
    }
    return null;
  }
  const lines = h.mode === 'import'
    ? names.map(h.ref)
    : names.map((n) => fs.readFileSync(path.join(dir, `${n}.md`), 'utf8').replace(/^<!--[^\n]*-->\n/, '').trimEnd());
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const next = withBlock(old, h.mode === 'inline' ? [lines.join('\n\n')].filter(Boolean) : lines);
  if (h.mode === 'inline' && Buffer.byteLength(next) > CODEX_MAX_BYTES) {
    return `~/.codex/AGENTS.md would be ${Buffer.byteLength(next)} bytes, over Codex's ${CODEX_MAX_BYTES}-byte limit; install fewer rules for Codex`;
  }
  if (!dryRun && next !== old) {
    if (next) writeAtomic(file, next);
    else fs.rmSync(file);
  }
  return null;
}

// Installs rules for one host. Returns result rows like the main installer's.
function installRules(host, rules, { home, dryRun = false }) {
  const h = HOSTS[host];
  const dir = h.dir(home);
  const before = installedNames(dir);
  const rows = rules.map((r) => ({ target: host, kind: 'rule', name: r.dir, action: before.includes(r.dir) ? 'updated' : 'installed', dest: h.file(home) }));
  if (dryRun) return rows;
  fs.mkdirSync(dir, { recursive: true });
  const previous = new Map(before.map((n) => [n, fs.readFileSync(path.join(dir, `${n}.md`), 'utf8')]));
  for (const r of rules) fs.writeFileSync(path.join(dir, `${r.dir}.md`), render(r, 'plain').content);
  const reason = sync(host, home, false);
  if (reason) {
    // Leave the folder as it was so it keeps matching what the host loads.
    for (const r of rules) {
      if (previous.has(r.dir)) fs.writeFileSync(path.join(dir, `${r.dir}.md`), previous.get(r.dir));
      else fs.rmSync(path.join(dir, `${r.dir}.md`), { force: true });
    }
    return rows.map((row) => ({ ...row, action: 'skipped', reason }));
  }
  return rows;
}

// Removes the named rules (or all kete-loom rules) for one host.
function uninstallRules(host, names, { home, dryRun = false }) {
  const h = HOSTS[host];
  const dir = h.dir(home);
  const gone = installedNames(dir).filter((n) => !names || names.includes(n));
  if (!gone.length) return [];
  if (!dryRun) {
    for (const n of gone) fs.rmSync(path.join(dir, `${n}.md`));
    sync(host, home, false);
    if (!installedNames(dir).length) {
      fs.rmSync(dir, { recursive: true, force: true });
      const parent = path.dirname(dir);
      if (fs.existsSync(parent) && !fs.readdirSync(parent).length) fs.rmdirSync(parent);
    }
  }
  return gone.map((n) => ({ target: host, kind: 'rule', name: n, action: 'removed', dest: h.file(home) }));
}

module.exports = { RULE_HOSTS, HOSTS, installRules, uninstallRules, installedNames, withBlock };
