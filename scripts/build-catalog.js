#!/usr/bin/env node
'use strict';

// Writes catalog.json (machine-readable index used by the Kete Code portal and
// installers), refreshes the skills, agents and commands tables in README.md
// between markers, and lists the agents in the Claude Code plugin manifest.

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, SKILLS_DIR, listSkills, listAgents, listCommands, listHooks, listRules } = require('./lib/skills');
const { pluginAgents } = require('./lint-skills');
const { switcher, translations, SWITCHER_RE } = require('./lib/i18n');
const { listMcp } = require('./lib/mcp-install');

const skills = listSkills(SKILLS_DIR);
const agents = listAgents();
const commands = listCommands();
const hooks = listHooks();
const rules = listRules();
const mcp = listMcp();
const version = require(path.join(REPO_ROOT, 'package.json')).version;

const entry = (s, rel) => ({
  name: s.dir,
  version: s.version,
  category: s.category,
  risk: s.risk,
  requires: s.requires,
  ...(s.tools ? { tools: s.tools } : {}),
  ...(s.event ? { event: s.event } : {}),
  ...(s.kind === 'rule' ? { paths: s.paths } : {}),
  description: s.description,
  path: rel,
});

const catalog = {
  name: 'kete-loom',
  version,
  skills: skills.map((s) => entry(s, `skills/${s.dir}`)),
  agents: agents.map((a) => entry(a, `agents/${a.dir}`)),
  commands: commands.map((c) => entry(c, `commands/${c.dir}.md`)),
  rules: rules.map((r) => entry(r, `rules/${r.dir}.md`)),
  hooks: hooks.map((h) => entry(h, `hooks/${h.dir}`)),
  mcp: mcp.map((m) => ({ name: m.dir, version: m.version, category: m.category, risk: m.risk, transport: m.transport, auth: m.auth, description: m.description, homepage: m.homepage, path: `mcp/${m.dir}.json` })),
};
fs.writeFileSync(path.join(REPO_ROOT, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');

const firstSentence = (d) => d.split(/(?<=\.)\s/)[0];
const table = (items, link, label) =>
  [
    '| Name | Category | Risk | What it does |',
    '|---|---|---|---|',
    ...items.map((s) => `| [\`${label(s)}\`](${link(s)}) | ${s.category} | ${s.risk} | ${firstSentence(s.description)} |`),
  ].join('\n');

const sections = {
  catalog: table(skills, (s) => `skills/${s.dir}/SKILL.md`, (s) => s.dir),
  agents: table(agents, (a) => `agents/${a.dir}/AGENT.md`, (a) => a.dir),
  commands: table(commands, (c) => `commands/${c.dir}.md`, (c) => `/${c.dir}`),
  rules: table(rules, (r) => `rules/${r.dir}.md`, (r) => r.dir),
  hooks: table(hooks, (h) => `hooks/${h.dir}/HOOK.md`, (h) => h.dir),
  mcp: [
    '| Server | Kind | Sign-in | What it does |',
    '|---|---|---|---|',
    ...mcp.map((m) => `| [\`${m.dir}\`](mcp/${m.dir}.json) | ${m.transport === 'http' ? 'remote' : 'local'} | ${m.auth === 'oauth' ? 'OAuth' : 'none'} | ${m.description} |`),
  ].join('\n'),
};

const readmePath = path.join(REPO_ROOT, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
for (const [key, body] of Object.entries(sections)) {
  const re = new RegExp(`<!-- ${key}:start -->[\\s\\S]*<!-- ${key}:end -->`);
  if (!re.test(readme)) throw new Error(`README.md is missing the <!-- ${key}:start --> / <!-- ${key}:end --> markers`);
  readme = readme.replace(re, `<!-- ${key}:start -->\n${body}\n<!-- ${key}:end -->`);
}
if (SWITCHER_RE.test(readme)) readme = readme.replace(SWITCHER_RE, switcher());
fs.writeFileSync(readmePath, readme);
for (const t of translations()) {
  const text = fs.readFileSync(t.file, 'utf8');
  if (SWITCHER_RE.test(text)) fs.writeFileSync(t.file, text.replace(SWITCHER_RE, switcher('docs/i18n')));
}

const pluginPath = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');
const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
plugin.agents = pluginAgents();
fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');

console.log(`catalog.json, README tables and Claude plugin agents updated (${skills.length} skills, ${agents.length} agents, ${commands.length} commands, ${rules.length} rules, ${hooks.length} hooks, ${mcp.length} MCP servers)`);
