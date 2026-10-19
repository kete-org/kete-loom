'use strict';

// The spec rules for a single item (docs/SKILL_SPEC.md). Shipped with the CLI so `kete-loom check` can
// lint skills, agents, commands, rules and hooks you write yourself; scripts/lint-skills.js adds the
// repository-wide checks on top.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { TOOLS } = require('./render');
const { loadBehavior } = require('./behavior');

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const TOP_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata']);
const CATEGORIES = ['coding', 'testing', 'security', 'integrations', 'devops', 'data', 'ai', 'docs', 'business', 'compliance', 'meta'];
const RISKS = ['read-only', 'writes-files', 'runs-commands', 'network'];
const MAX_LINES = 300;
const MIN_EVALS = 3;
const HOOK_EVENTS = ['pre-shell', 'pre-edit', 'post-edit', 'session-start', 'stop', 'stop-gate', 'post-read', 'post-tool'];
const MAX_RULE_LINES = 80;
// Tool names that only exist in one host. Skills should describe the action instead.
const HOST_SPECIFIC = /\b(Bash tool|Read tool|Edit tool|Write tool|Grep tool|Glob tool|TodoWrite|apply_patch|str_replace_editor)\b/;

function words(s) {
  return new Set(String(s).toLowerCase().match(/[a-z]{4,}/g) || []);
}

function jaccard(a, b) {
  const inter = [...a].filter((x) => b.has(x)).length;
  return inter / (a.size + b.size - inter || 1);
}

function lintItem(item) {
  const errors = [...item.parseErrors];
  const warnings = [];
  const d = item.data;
  const meta = d.metadata && typeof d.metadata === 'object' ? d.metadata : null;

  for (const key of Object.keys(d)) if (!TOP_KEYS.has(key)) errors.push(`unknown top-level key "${key}" (put host-specific keys under metadata)`);

  if (!d.name) errors.push('missing "name"');
  else {
    if (!NAME_RE.test(d.name)) errors.push(`name "${d.name}" must match ${NAME_RE}`);
    if (d.name.length > 64) errors.push('name longer than 64 characters');
    if (d.name !== item.dir) errors.push(`name "${d.name}" must equal ${item.kind === 'command' ? 'file' : 'folder'} name "${item.dir}"`);
  }

  if (!d.description) errors.push('missing "description"');
  else if (item.kind === 'command' || item.kind === 'hook' || item.kind === 'rule') {
    // Commands are picked by name and hooks run on events; the description is one line for menus and the catalog.
    const len = d.description.length;
    if (len < 20 || len > 300) errors.push(`description is ${len} chars; must be 20-300`);
  } else {
    const len = d.description.length;
    if (len < 80 || len > 1024) errors.push(`description is ${len} chars; must be 80-1024`);
    if (!/\buse when\b/i.test(d.description)) errors.push(`description must say when to use the ${item.kind} ("Use when ...")`);
  }

  if (!d.license) errors.push('missing "license"');
  if (d.compatibility && d.compatibility.length > 500) errors.push('compatibility longer than 500 characters');

  if (!meta) errors.push('missing "metadata" map');
  else {
    const v = meta['kete-loom/version'];
    if (!v) errors.push('missing metadata.kete-loom/version');
    else if (!SEMVER_RE.test(v)) errors.push(`kete-loom/version "${v}" is not semver`);
    const c = meta['kete-loom/category'];
    if (!CATEGORIES.includes(c)) errors.push(`kete-loom/category must be one of ${CATEGORIES.join(', ')}`);
    const r = meta['kete-loom/risk'];
    if (!RISKS.includes(r)) errors.push(`kete-loom/risk must be one of ${RISKS.join(', ')}`);
    if (item.tools) {
      const bad = item.tools.filter((t) => !TOOLS.includes(t));
      if (bad.length || !item.tools.length) errors.push(`kete-loom/tools must be a comma list of ${TOOLS.join(', ')}`);
    }
  }

  const lines = item.text.replace(/\r?\n$/, '').split('\n').length;
  if (lines > MAX_LINES) errors.push(`${path.basename(item.file)} is ${lines} lines; limit is ${MAX_LINES}. Move detail into references/.`);

  // Every relative file the body points at must exist.
  const refs = new Set();
  for (const m of item.body.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) refs.add(m[1]);
  for (const m of item.body.matchAll(/`((?:references|scripts|assets|templates)\/[^`\s]+)`/g)) refs.add(m[1]);
  for (const ref of refs) {
    if (!fs.existsSync(path.join(item.kind === 'command' ? path.dirname(item.path) : item.path, ref.split('#')[0]))) errors.push(`referenced file not found: ${ref}`);
  }

  const scriptsDir = path.join(item.path, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      const p = path.join(scriptsDir, f);
      const head = fs.readFileSync(p, 'utf8').slice(0, 2);
      if (head === '#!' && !(fs.statSync(p).mode & 0o111) && process.platform !== 'win32') errors.push(`scripts/${f} has a shebang but is not executable (chmod +x)`);
    }
  }

  if (item.kind === 'hook') errors.push(...lintHook(item));
  // Rules load into every matching session, so they stay short: the always-on cost is paid on every turn.
  if (item.kind === 'rule' && lines > MAX_RULE_LINES) errors.push(`rule is ${lines} lines; rules are loaded into context automatically, keep them under ${MAX_RULE_LINES}`);
  if (item.kind === 'rule' && item.paths.some((p) => /\s/.test(p) || p.startsWith('/'))) errors.push('kete-loom/paths must be relative globs without spaces, comma separated (e.g. "**/*.py, **/*.pyi")');

  // Hosts route to skills and agents by description, so both need trigger evals. Commands and hooks aren't routed.
  const evalFile = ['command', 'hook', 'rule'].includes(item.kind) ? null : path.join(item.path, 'evals', 'triggers.json');
  if (evalFile && !fs.existsSync(evalFile)) errors.push('missing evals/triggers.json');
  else if (evalFile) {
    try {
      const ev = JSON.parse(fs.readFileSync(evalFile, 'utf8'));
      for (const k of ['should_trigger', 'should_not_trigger']) {
        if (!Array.isArray(ev[k]) || ev[k].length < MIN_EVALS) errors.push(`evals/triggers.json needs at least ${MIN_EVALS} "${k}" prompts`);
      }
    } catch (e) {
      errors.push(`evals/triggers.json is not valid JSON: ${e.message}`);
    }
  }

  // Behaviour evals are optional; when present they must be runnable.
  if (item.kind === 'skill' || item.kind === 'agent') {
    const behavior = loadBehavior(item);
    if (behavior) errors.push(...behavior.problems);
  }

  const hostHit = HOST_SPECIFIC.exec(item.body);
  if (hostHit) warnings.push(`mentions host-specific tool "${hostHit[1]}"; describe the action instead so every host can follow it`);

  return { errors, warnings };
}

// A hook ships hook.js (exports check). Blocking (pre-*) hooks also ship cases.json, and every case must
// give the expected verdict; a case is a command string or an event object such as { files: [...] }.
function lintHook(hook) {
  const errors = [];
  if (!HOOK_EVENTS.includes(hook.event)) errors.push(`kete-loom/event must be one of ${HOOK_EVENTS.join(', ')}`);
  let check;
  try {
    ({ check } = require(path.join(hook.path, 'hook.js')));
  } catch (e) {
    return [...errors, `hook.js failed to load: ${e.message}`];
  }
  if (typeof check !== 'function') return [...errors, 'hook.js must export a check(event) function'];
  if (!String(hook.event).startsWith('pre-')) return errors;
  let cases;
  try {
    // Fake secrets are written as {{repeat:c:n}} so the repository never holds key-shaped strings.
    cases = JSON.parse(fs.readFileSync(path.join(hook.path, 'cases.json'), 'utf8').replace(/\{\{repeat:(.):(\d+)\}\}/g, (_, c, n) => c.repeat(Number(n))));
  } catch (e) {
    return [...errors, `cases.json missing or invalid: ${e.message}`];
  }
  // Hooks that remember what they've seen keep it under KETE_LOOM_STATE_DIR; give each lint run a fresh one.
  const prevState = process.env.KETE_LOOM_STATE_DIR;
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kete-loom-lint-'));
  process.env.KETE_LOOM_STATE_DIR = stateDir;
  const fixtures = withFixtures(hook, cases);
  try {
    lintCases(check, fixtures.cases, errors);
  } finally {
    if (prevState === undefined) delete process.env.KETE_LOOM_STATE_DIR;
    else process.env.KETE_LOOM_STATE_DIR = prevState;
    fs.rmSync(stateDir, { recursive: true, force: true });
    if (fixtures.dir) fs.rmSync(fixtures.dir, { recursive: true, force: true });
  }
  return errors;
}

// Cases may run against files in the hook's fixtures/ folder. Git can't store a file named .git, so a
// fixture saved as `dot-git` becomes `.git` in a temporary copy, and cases' cwd is pointed at it.
function withFixtures(hook, cases) {
  const src = path.join(hook.path, 'fixtures');
  if (!fs.existsSync(src)) return { cases };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kete-loom-fixtures-'));
  fs.cpSync(src, dir, { recursive: true });
  (function rename(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) rename(p);
      else if (e.name === 'dot-git') fs.renameSync(p, path.join(d, '.git'));
    }
  })(dir);
  const remap = (c) => {
    if (typeof c === 'string' || typeof c.cwd !== 'string') return c;
    const rel = path.relative(src, path.resolve(c.cwd));
    return rel.startsWith('..') || path.isAbsolute(rel) ? c : { ...c, cwd: path.join(dir, rel) };
  };
  return { dir, cases: { ...cases, should_block: (cases.should_block || []).map(remap), should_allow: (cases.should_allow || []).map(remap) } };
}

function lintCases(check, cases, errors) {
  for (const [key, want] of [['should_block', true], ['should_allow', false]]) {
    if (!Array.isArray(cases[key]) || cases[key].length < MIN_EVALS) errors.push(`cases.json needs at least ${MIN_EVALS} "${key}" cases`);
    for (const c of cases[key] || []) {
      const event = typeof c === 'string' ? { command: c, cwd: process.cwd() } : { cwd: process.cwd(), ...c };
      let got;
      try {
        got = Boolean(check(event).block);
      } catch (e) {
        errors.push(`check() threw on ${JSON.stringify(c)}: ${e.message}`);
        continue;
      }
      if (got !== want) errors.push(`case ${JSON.stringify(c)} should ${want ? 'block' : 'be allowed'}`);
    }
  }
}

module.exports = { lintItem, lintHook, words, jaccard, NAME_RE, SEMVER_RE, CATEGORIES, RISKS, MAX_LINES, HOOK_EVENTS };
