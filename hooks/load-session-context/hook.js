'use strict';

// At session start, tells the agent where things stand: the branch, uncommitted work, and the
// latest session handoff note (written by the session-handoff skill). check({ cwd }) -> { context }

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MAX_NOTE_LINES = 60;
const MAX_NOTE_CHARS = 3000;

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim();
  } catch {
    return null;
  }
}

function newest(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
      .map((f) => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
  } catch {
    return null;
  }
}

// The note for this branch first, then HANDOFF.md, then the newest note in the usual folders.
function findNote(root, branch) {
  const candidates = [];
  if (branch) for (const name of [branch, branch.replace(/\//g, '-')]) candidates.push(path.join(root, '.handoff', `${name}.md`));
  candidates.push(path.join(root, 'HANDOFF.md'));
  const direct = candidates.find((p) => fs.existsSync(p));
  return direct || newest(path.join(root, '.handoff')) || newest(path.join(root, 'docs', 'handoff'));
}

function check(event) {
  const cwd = event.cwd || process.cwd();
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  if (!root) return {};
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const changes = (git(root, ['status', '--porcelain']) || '').split('\n').filter(Boolean).length;
  const lines = [`Session context from kete-loom (load-session-context):`, `- Branch: ${branch || 'unknown'}, ${changes} uncommitted change(s).`];
  const note = findNote(root, branch);
  if (note) {
    let text = fs.readFileSync(note, 'utf8').split('\n').slice(0, MAX_NOTE_LINES).join('\n');
    if (text.length > MAX_NOTE_CHARS) text = `${text.slice(0, MAX_NOTE_CHARS)}\n…`;
    lines.push(`- Handoff note ${path.relative(root, note)} (check it against the repository before acting on it):`, '', text);
  }
  return { context: lines.join('\n') };
}

module.exports = { check };
