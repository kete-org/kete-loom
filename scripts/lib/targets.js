'use strict';

const os = require('os');
const path = require('path');

// Where each host looks for skills (verified against host docs, Oct 2026).
// `agents` is the shared open-standard folder: Codex, OpenCode, Cursor,
// Gemini CLI, GitHub Copilot and Kete Code all read it. Claude Code reads
// only its own folder, so the default install is `agents` + `claude`.
// The host-specific targets exist for people who want one host only.
const TARGETS = {
  agents: {
    label: 'Shared .agents folder (Codex, OpenCode, Cursor, Gemini CLI, Copilot, Kete Code)',
    user: ['.agents', 'skills'],
    project: ['.agents', 'skills'],
    detect: [],
    default: true,
  },
  claude: {
    label: 'Claude Code',
    user: ['.claude', 'skills'],
    project: ['.claude', 'skills'],
    detect: ['.claude'],
    default: true,
  },
  opencode: {
    label: 'OpenCode only',
    user: ['.config', 'opencode', 'skills'],
    project: ['.opencode', 'skills'],
    detect: ['.config/opencode'],
  },
  cursor: {
    label: 'Cursor only',
    user: ['.cursor', 'skills'],
    project: ['.cursor', 'skills'],
    detect: ['.cursor'],
  },
  gemini: {
    label: 'Gemini CLI only',
    user: ['.gemini', 'skills'],
    project: ['.gemini', 'skills'],
    detect: ['.gemini'],
  },
  copilot: {
    label: 'GitHub Copilot only',
    user: ['.copilot', 'skills'],
    project: ['.github', 'skills'],
    detect: ['.copilot'],
  },
};

// Which folders each host reads, used by `doctor` to show where a skill is visible.
const HOST_READS = {
  'Claude Code': ['claude'],
  Codex: ['agents'],
  OpenCode: ['agents', 'claude', 'opencode'],
  Cursor: ['agents', 'claude', 'cursor'],
  'Gemini CLI': ['agents', 'gemini'],
  'GitHub Copilot': ['agents', 'claude', 'copilot'],
  'Kete Code': ['agents', 'claude', 'opencode'],
};

function resolveTarget(name, { scope = 'user', home = os.homedir(), cwd = process.cwd() } = {}) {
  const t = TARGETS[name];
  if (!t) throw new Error(`unknown target "${name}". Known: ${Object.keys(TARGETS).join(', ')}`);
  const base = scope === 'project' ? cwd : home;
  return path.join(base, ...(scope === 'project' ? t.project : t.user));
}

module.exports = { TARGETS, HOST_READS, resolveTarget };
