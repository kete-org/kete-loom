#!/usr/bin/env node
'use strict';

// Enforces docs/SKILL_SPEC.md. Exit code 1 on any error; warnings don't fail.

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, SKILLS_DIR, AGENTS_DIR, listSkills, listAgents, listCommands } = require('./lib/skills');
const { TOOLS } = require('./lib/render');

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const TOP_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata']);
const CATEGORIES = ['coding', 'testing', 'security', 'integrations', 'devops', 'docs', 'meta'];
const RISKS = ['read-only', 'writes-files', 'runs-commands', 'network'];
const MAX_LINES = 300;
const MIN_EVALS = 3;
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
  else if (item.kind === 'command') {
    // Users pick commands by name; the description is the one-line menu text.
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

  // Hosts route to skills and agents by description, so both need trigger evals. Commands are invoked by name.
  const evalFile = item.kind === 'command' ? null : path.join(item.path, 'evals', 'triggers.json');
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

  const hostHit = HOST_SPECIFIC.exec(item.body);
  if (hostHit) warnings.push(`mentions host-specific tool "${hostHit[1]}"; describe the action instead so every host can follow it`);

  return { errors, warnings };
}

function lintManifests() {
  const errors = [];
  const version = require(path.join(REPO_ROOT, 'package.json')).version;
  const files = {
    '.claude-plugin/plugin.json': (j) => j.version,
    '.claude-plugin/marketplace.json': (j) => j.plugins[0].version,
    '.codex-plugin/plugin.json': (j) => j.version,
    '.agents/plugins/marketplace.json': (j) => j.plugins[0].version,
    'gemini-extension.json': (j) => j.version,
  };
  for (const [file, get] of Object.entries(files)) {
    const p = path.join(REPO_ROOT, file);
    if (!fs.existsSync(p)) {
      errors.push(`${file}: missing`);
      continue;
    }
    try {
      const v = get(JSON.parse(fs.readFileSync(p, 'utf8')));
      if (v !== version) errors.push(`${file}: version ${v} does not match package.json ${version}`);
    } catch (e) {
      errors.push(`${file}: ${e.message}`);
    }
  }
  const pluginPath = path.join(REPO_ROOT, '.claude-plugin/plugin.json');
  if (fs.existsSync(pluginPath)) {
    const claude = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
    if (!Array.isArray(claude.skills)) errors.push('.claude-plugin/plugin.json: "skills" must be an array');
    // Claude Code only auto-discovers agents/*.md; ours live in folders, so the plugin lists them.
    const want = JSON.stringify(pluginAgents());
    if (JSON.stringify(claude.agents || []) !== want) errors.push(`.claude-plugin/plugin.json: "agents" must be ${want}. Run "npm run catalog".`);
  }
  return errors;
}

const pluginAgents = () => listAgents().map((a) => `./agents/${a.dir}/AGENT.md`);

function strayFolders(root, file) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && !fs.existsSync(path.join(root, d.name, file))).map((d) => `${d.name}  folder has no ${file}`);
}

function overlaps(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sim = jaccard(words(items[i].description), words(items[j].description));
      if (sim > 0.45) out.push(`${items[i].dir} / ${items[j].dir}  descriptions overlap (${Math.round(sim * 100)}%); sharpen them so hosts can tell them apart`);
    }
  }
  return out;
}

function main() {
  const skills = listSkills(SKILLS_DIR);
  const agents = listAgents();
  const commands = listCommands();
  let errorCount = 0;
  let warnCount = 0;
  const error = (msg) => (console.log(`✗ ${msg}`), errorCount++);
  const warn = (msg) => (console.log(`! ${msg}`), warnCount++);

  for (const e of lintManifests()) error(`manifest  ${e}`);
  for (const e of [...strayFolders(SKILLS_DIR, 'SKILL.md'), ...strayFolders(AGENTS_DIR, 'AGENT.md')]) error(e);

  for (const item of [...skills, ...agents, ...commands]) {
    const { errors, warnings } = lintItem(item);
    if (!errors.length && !warnings.length) console.log(`✓ ${item.kind.padEnd(7)} ${item.dir}`);
    for (const e of errors) error(`${item.kind.padEnd(7)} ${item.dir}  ${e}`);
    for (const w of warnings) warn(`${item.kind.padEnd(7)} ${item.dir}  ${w}`);
  }

  // Overlapping descriptions make hosts pick the wrong skill or agent.
  for (const w of [...overlaps(skills), ...overlaps(agents)]) warn(w);
  // Claude Code serves commands and skills from one namespace.
  for (const c of commands) if (skills.some((s) => s.dir === c.dir)) error(`command ${c.dir}  has the same name as a skill`);

  console.log(`\n${skills.length} skill(s), ${agents.length} agent(s), ${commands.length} command(s), ${errorCount} error(s), ${warnCount} warning(s)`);
  return errorCount ? 1 : 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { lintItem, lintSkill: lintItem, lintManifests, pluginAgents };
