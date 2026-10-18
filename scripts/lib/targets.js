'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Where each host looks for skills, agents and commands (verified against host docs, Oct 2026).
// `agents` is the shared open-standard folder: Codex, OpenCode, Cursor, Gemini CLI, GitHub Copilot
// and Kete Code all read its skills. It defines nothing for agents or commands.
// Claude Code reads only its own folders; Cursor and VS Code Copilot also read `.claude/agents`.
// So the default install is `agents` + `claude`, plus agents and commands for hosts that need their
// own copy (`auto`, including Kete Code) when that host is detected. The other targets exist for people who want one host only.
// Kinds a target doesn't list are not supported there: Codex prompts are deprecated, Copilot CLI has
// no prompt files and Cursor commands are beta, so commands go to Claude, OpenCode and Gemini only.
const TARGETS = {
  agents: {
    label: 'Shared .agents folder (Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code)',
    user: { skills: ['.agents', 'skills'] },
    project: { skills: ['.agents', 'skills'] },
    default: true,
  },
  claude: {
    label: 'Claude Code (its agents are also read by Cursor and VS Code Copilot)',
    user: { skills: ['.claude', 'skills'], agents: ['.claude', 'agents'], commands: ['.claude', 'commands'] },
    project: { skills: ['.claude', 'skills'], agents: ['.claude', 'agents'], commands: ['.claude', 'commands'] },
    default: true,
  },
  codex: {
    label: 'Codex (agents only; skills come from .agents)',
    user: { agents: ['.codex', 'agents'] },
    project: { agents: ['.codex', 'agents'] },
    detect: { user: ['.codex'], project: ['.codex'] },
    auto: true,
  },
  opencode: {
    label: 'OpenCode',
    user: { skills: ['.config', 'opencode', 'skills'], agents: ['.config', 'opencode', 'agents'], commands: ['.config', 'opencode', 'commands'] },
    project: { skills: ['.opencode', 'skills'], agents: ['.opencode', 'agents'], commands: ['.opencode', 'commands'] },
    detect: { user: ['.config', 'opencode'], project: ['.opencode'] },
    auto: true,
  },
  // Kete Code (an OpenCode fork) reads skills from .agents and .claude, but agents and commands only from its own folders.
  // shortcut: user paths assume XDG_CONFIG_HOME is ~/.config (as for opencode); honour it if users report custom roots.
  kete: {
    label: 'Kete Code',
    user: { skills: ['.config', 'kete', 'skills'], agents: ['.config', 'kete', 'agents'], commands: ['.config', 'kete', 'commands'] },
    project: { skills: ['.kete', 'skills'], agents: ['.kete', 'agents'], commands: ['.kete', 'commands'] },
    detect: { user: ['.config', 'kete'], project: ['.kete'] },
    auto: true,
  },
  cursor: {
    label: 'Cursor only',
    user: { skills: ['.cursor', 'skills'], agents: ['.cursor', 'agents'] },
    project: { skills: ['.cursor', 'skills'], agents: ['.cursor', 'agents'] },
  },
  gemini: {
    label: 'Gemini CLI',
    user: { skills: ['.gemini', 'skills'], agents: ['.gemini', 'agents'], commands: ['.gemini', 'commands'] },
    project: { skills: ['.gemini', 'skills'], agents: ['.gemini', 'agents'], commands: ['.gemini', 'commands'] },
    detect: { user: ['.gemini'], project: ['.gemini'] },
    auto: true,
  },
  copilot: {
    label: 'GitHub Copilot only',
    user: { skills: ['.copilot', 'skills'], agents: ['.copilot', 'agents'] },
    project: { skills: ['.github', 'skills'], agents: ['.github', 'agents'] },
  },
};

const KINDS = ['skills', 'agents', 'commands'];

// Which folders each host reads skills from, used by `doctor` to show where a skill is visible.
const HOST_READS = {
  'Claude Code': ['claude'],
  Codex: ['agents'],
  OpenCode: ['agents', 'claude', 'opencode'],
  Cursor: ['agents', 'claude', 'cursor'],
  'Gemini CLI': ['agents', 'gemini'],
  'GitHub Copilot': ['agents', 'claude', 'copilot'],
  'Kete Code': ['agents', 'claude', 'kete'],
};

function baseDir({ scope = 'user', home = os.homedir(), cwd = process.cwd() } = {}) {
  return scope === 'project' ? cwd : home;
}

// Returns the folder for one kind, or null when the target doesn't support that kind.
function resolveTarget(name, { scope = 'user', home = os.homedir(), cwd = process.cwd(), kind = 'skills' } = {}) {
  const t = TARGETS[name];
  if (!t) throw new Error(`unknown target "${name}". Known: ${Object.keys(TARGETS).join(', ')}`);
  const segments = t[scope === 'project' ? 'project' : 'user'][kind];
  return segments ? path.join(baseDir({ scope, home, cwd }), ...segments) : null;
}

function detected(name, opts = {}) {
  const t = TARGETS[name];
  const segments = t.detect && t.detect[opts.scope === 'project' ? 'project' : 'user'];
  return Boolean(segments) && fs.existsSync(path.join(baseDir(opts), ...segments));
}

module.exports = { TARGETS, KINDS, HOST_READS, resolveTarget, detected };
