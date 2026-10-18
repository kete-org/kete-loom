'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');
const COMMANDS_DIR = path.join(REPO_ROOT, 'commands');
const HOOKS_DIR = path.join(REPO_ROOT, 'hooks');

const csv = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

// Reads one markdown item (SKILL.md, AGENT.md or a command file). `dir` is the item's name.
function loadDoc(file, extra) {
  const text = fs.readFileSync(file, 'utf8');
  const { data, body, errors } = parseFrontmatter(text);
  const meta = (data && data.metadata) || {};
  return {
    file,
    text,
    body,
    data: data || {},
    parseErrors: errors,
    name: data && data.name,
    description: data && data.description,
    version: meta['kete-loom/version'],
    category: meta['kete-loom/category'],
    risk: meta['kete-loom/risk'],
    requires: csv(meta['kete-loom/requires']),
    tools: meta['kete-loom/tools'] === undefined ? null : csv(meta['kete-loom/tools']),
    argumentHint: meta['kete-loom/argument-hint'],
    event: meta['kete-loom/event'],
    ...extra,
  };
}

function listFolders(root, file, load) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, file)))
    .map((d) => load(path.join(root, d.name)))
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

function loadSkill(skillPath) {
  return loadDoc(path.join(skillPath, 'SKILL.md'), { kind: 'skill', dir: path.basename(skillPath), path: skillPath });
}

function loadAgent(agentPath) {
  return loadDoc(path.join(agentPath, 'AGENT.md'), { kind: 'agent', dir: path.basename(agentPath), path: agentPath });
}

function loadHook(hookPath) {
  return loadDoc(path.join(hookPath, 'HOOK.md'), { kind: 'hook', dir: path.basename(hookPath), path: hookPath });
}

function loadCommand(file) {
  return loadDoc(file, { kind: 'command', dir: path.basename(file, '.md'), path: file });
}

const listSkills = (root = SKILLS_DIR) => listFolders(root, 'SKILL.md', loadSkill);
const listAgents = (root = AGENTS_DIR) => listFolders(root, 'AGENT.md', loadAgent);
const listHooks = (root = HOOKS_DIR) => listFolders(root, 'HOOK.md', loadHook);

function listCommands(root = COMMANDS_DIR) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith('.md'))
    .map((f) => loadCommand(path.join(root, f)))
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

module.exports = { REPO_ROOT, SKILLS_DIR, AGENTS_DIR, COMMANDS_DIR, HOOKS_DIR, listSkills, listAgents, listCommands, listHooks, loadSkill, loadAgent, loadCommand, loadHook };
