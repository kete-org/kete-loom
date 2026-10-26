#!/usr/bin/env node
'use strict';

// Enforces docs/SKILL_SPEC.md. Exit code 1 on any error; warnings don't fail.

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, SKILLS_DIR, AGENTS_DIR, HOOKS_DIR, listSkills, listAgents, listCommands, listHooks, listRules } = require('./lib/skills');
const { lintItem, words, jaccard, NAME_RE, SEMVER_RE, CATEGORIES, RISKS } = require('./lib/lint');
const { loadProfiles, resolveProfiles, DETECT } = require('./lib/profiles');
const { translations } = require('./lib/i18n');
const { listMcp } = require('./lib/mcp-install');
const { pluginHooks: hookConfig } = require('./lib/hooks-install');

// profiles.json: known keys, existing names, valid categories, and extends that resolve.
function lintProfiles(items) {
  const errors = [];
  let profiles;
  try {
    profiles = loadProfiles();
  } catch (e) {
    return [`profiles.json: ${e.message}`];
  }
  const KEYS = new Set(['description', 'extends', 'skills', 'agents', 'commands', 'rules', 'hooks', 'mcp', 'categories', 'detect', 'all']);
  for (const [name, p] of Object.entries(profiles)) {
    if (!NAME_RE.test(name)) errors.push(`profiles.json: profile name "${name}" must match ${NAME_RE}`);
    for (const k of Object.keys(p)) if (!KEYS.has(k)) errors.push(`profiles.json: ${name} has unknown key "${k}"`);
    if (typeof p.description !== 'string' || p.description.length < 20) errors.push(`profiles.json: ${name} needs a description of at least 20 characters`);
    for (const parent of p.extends || []) if (!profiles[parent]) errors.push(`profiles.json: ${name} extends unknown profile "${parent}"`);
    for (const c of p.categories || []) if (!CATEGORIES.includes(c)) errors.push(`profiles.json: ${name} has unknown category "${c}"`);
    for (const k of ['skills', 'agents', 'commands', 'rules', 'hooks', 'mcp']) {
      for (const n of p[k] || []) if (!items[k].some((i) => i.dir === n)) errors.push(`profiles.json: ${name} lists unknown ${k.slice(0, -1)} "${n}"`);
    }
  }
  // Every item project detection can add must exist.
  for (const d of DETECT) {
    for (const k of ['skills', 'agents', 'rules']) for (const n of d[k] || []) if (!items[k].some((i) => i.dir === n)) errors.push(`profile detection (${d.what}) names unknown ${k.slice(0, -1)} "${n}"`);
  }
  return errors;
}

// mcp/<name>.json: no secrets anywhere, HTTPS remotes that sign in with OAuth, or a local command.
const MCP_KEYS = new Set(['name', 'description', 'version', 'category', 'risk', 'transport', 'url', 'command', 'args', 'auth', 'requires', 'homepage']);
function lintMcp(server) {
  const errors = [];
  for (const k of Object.keys(server)) if (!MCP_KEYS.has(k) && !['kind', 'dir', 'file'].includes(k)) errors.push(`unknown key "${k}" (servers carry no headers, env or tokens)`);
  if (server.name !== server.dir) errors.push(`name "${server.name}" must equal the file name "${server.dir}"`);
  if (!NAME_RE.test(server.dir)) errors.push(`file name must match ${NAME_RE}`);
  if (typeof server.description !== 'string' || server.description.length < 20 || server.description.length > 300) errors.push('description must be 20-300 characters');
  if (!SEMVER_RE.test(server.version || '')) errors.push('version must be semver');
  if (!CATEGORIES.includes(server.category)) errors.push(`category must be one of ${CATEGORIES.join(', ')}`);
  if (!RISKS.includes(server.risk)) errors.push(`risk must be one of ${RISKS.join(', ')}`);
  if (!/^https:\/\//.test(server.homepage || '')) errors.push('homepage must be an https URL');
  if (server.transport === 'http') {
    if (!/^https:\/\//.test(server.url || '')) errors.push('url must be https');
    if (server.auth !== 'oauth' && server.auth !== 'none') errors.push('auth must be oauth or none');
  } else if (server.transport === 'stdio') {
    if (typeof server.command !== 'string' || !Array.isArray(server.args)) errors.push('stdio servers need command and args');
  } else errors.push('transport must be http or stdio');
  if (/(token|secret|password|api[_-]?key|bearer)\s*[=:]/i.test(JSON.stringify(server.args || []) + (server.url || ''))) errors.push('looks like a secret in args or url; servers must not carry secrets');
  return errors;
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
    if (claude.hooks !== PLUGIN_HOOKS_FILE) errors.push(`.claude-plugin/plugin.json: "hooks" must be "${PLUGIN_HOOKS_FILE}". Run "npm run catalog".`);
    const hooksPath = path.join(REPO_ROOT, PLUGIN_HOOKS_FILE);
    const current = fs.existsSync(hooksPath) ? fs.readFileSync(hooksPath, 'utf8') : '';
    if (current !== pluginHooksText()) errors.push(`${PLUGIN_HOOKS_FILE.slice(2)} is out of date with the developer profile. Run "npm run catalog".`);
    if (fs.existsSync(path.join(REPO_ROOT, 'hooks', 'hooks.json'))) errors.push('hooks/hooks.json must not exist: Gemini CLI and Codex would read it as their own hooks file.');
  }
  return errors;
}

const pluginAgents = () => listAgents().map((a) => `./agents/${a.dir}/AGENT.md`);
// The plugin turns on the developer profile's hooks (read-only checks that only block risky commands and
// edits), resolved like the installer's `--profile developer` so `extends` and `categories` count too.
// Not hooks/hooks.json: Gemini CLI and Codex read that path in their own format from this same folder.
const PLUGIN_HOOKS_FILE = './hooks/claude-code.json';
const pluginHooks = () => {
  const hooks = listHooks();
  const names = resolveProfiles(['developer'], { catalog: { hooks } }).hooks;
  return hookConfig(hooks.filter((h) => names.has(h.dir)));
};
const pluginHooksText = () => JSON.stringify(pluginHooks(), null, 2) + '\n';

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
  const hooks = listHooks();
  const rules = listRules();
  let errorCount = 0;
  let warnCount = 0;
  const error = (msg) => (console.log(`✗ ${msg}`), errorCount++);
  const warn = (msg) => (console.log(`! ${msg}`), warnCount++);

  for (const e of lintManifests()) error(`manifest  ${e}`);
  for (const e of lintProfiles({ skills, agents, commands, rules, hooks, mcp: listMcp() })) error(e);
  for (const e of [...strayFolders(SKILLS_DIR, 'SKILL.md'), ...strayFolders(AGENTS_DIR, 'AGENT.md'), ...strayFolders(HOOKS_DIR, 'HOOK.md')]) error(e);

  const mcp = listMcp();
  for (const s of mcp) {
    const errs = lintMcp(s);
    if (!errs.length) console.log(`✓ mcp     ${s.dir}`);
    for (const e of errs) error(`mcp     ${s.dir}  ${e}`);
  }
  for (const item of [...skills, ...agents, ...commands, ...rules, ...hooks]) {
    const { errors, warnings } = lintItem(item);
    if (!errors.length && !warnings.length) console.log(`✓ ${item.kind.padEnd(7)} ${item.dir}`);
    for (const e of errors) error(`${item.kind.padEnd(7)} ${item.dir}  ${e}`);
    for (const w of warnings) warn(`${item.kind.padEnd(7)} ${item.dir}  ${w}`);
  }

  // Overlapping descriptions make hosts pick the wrong skill or agent.
  for (const w of [...overlaps(skills), ...overlaps(agents)]) warn(w);
  // A translation made from older English prose is a warning: it lags, but it isn't broken.
  for (const t of translations()) {
    if (!t.source) error(`docs/i18n/README.${t.code}.md  is missing its "translated from README.md, source <hash>" line`);
    else if (!t.current) warn(`docs/i18n/README.${t.code}.md  was translated from older README prose (${t.source}); update it`);
  }
  // Claude Code serves commands and skills from one namespace.
  for (const c of commands) if (skills.some((s) => s.dir === c.dir)) error(`command ${c.dir}  has the same name as a skill`);

  console.log(`\n${skills.length} skill(s), ${agents.length} agent(s), ${commands.length} command(s), ${rules.length} rule(s), ${hooks.length} hook(s), ${errorCount} error(s), ${warnCount} warning(s)`);
  return errorCount ? 1 : 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { lintItem, lintSkill: lintItem, lintManifests, pluginAgents, pluginHooks, pluginHooksText, PLUGIN_HOOKS_FILE };
