#!/usr/bin/env node
'use strict';

// Writes catalog.json (machine-readable index used by the Kete Code portal and
// installers), refreshes the skills, agents and commands tables in README.md
// between markers, and lists the agents in the Claude Code plugin manifest.

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, SKILLS_DIR, listSkills, listAgents, listCommands } = require('./lib/skills');
const { pluginAgents } = require('./lint-skills');

const skills = listSkills(SKILLS_DIR);
const agents = listAgents();
const commands = listCommands();
const version = require(path.join(REPO_ROOT, 'package.json')).version;

const entry = (s, rel) => ({
  name: s.dir,
  version: s.version,
  category: s.category,
  risk: s.risk,
  requires: s.requires,
  ...(s.tools ? { tools: s.tools } : {}),
  description: s.description,
  path: rel,
});

const catalog = {
  name: 'kete-loom',
  version,
  skills: skills.map((s) => entry(s, `skills/${s.dir}`)),
  agents: agents.map((a) => entry(a, `agents/${a.dir}`)),
  commands: commands.map((c) => entry(c, `commands/${c.dir}.md`)),
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
};

const readmePath = path.join(REPO_ROOT, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
for (const [key, body] of Object.entries(sections)) {
  const re = new RegExp(`<!-- ${key}:start -->[\\s\\S]*<!-- ${key}:end -->`);
  if (!re.test(readme)) throw new Error(`README.md is missing the <!-- ${key}:start --> / <!-- ${key}:end --> markers`);
  readme = readme.replace(re, `<!-- ${key}:start -->\n${body}\n<!-- ${key}:end -->`);
}
fs.writeFileSync(readmePath, readme);

const pluginPath = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');
const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
plugin.agents = pluginAgents();
fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');

console.log(`catalog.json, README tables and Claude plugin agents updated (${skills.length} skills, ${agents.length} agents, ${commands.length} commands)`);
