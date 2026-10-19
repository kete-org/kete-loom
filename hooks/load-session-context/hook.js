'use strict';

// At session start, tells the agent where things stand: the branch, uncommitted work, and the
// latest session handoff note (written by the session-handoff skill). check({ cwd }) -> { context }

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MAX_NOTE_LINES = 60;
const MAX_NOTE_CHARS = 3000;
const MAX_STATE_LINES = 30;

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

// The skill observation log (kete-loom observe): status lines only, never bodies. Hooks ship as one
// file, so this reads the few frontmatter lines it needs itself rather than loading the CLI library.
function observations() {
  const dir = path.resolve(process.env.KETE_LOOM_OBSERVATIONS_DIR || path.join(require('os').homedir(), '.kete-loom', 'observations'));
  const log = path.join(dir, 'log');
  let files;
  try {
    files = fs.readdirSync(log).filter((f) => /^\d+-.*\.md$/.test(f));
  } catch {
    return null;
  }
  let open = 0;
  const rules = {};
  const unquote = (v) => {
    try {
      return v && v.startsWith('"') ? JSON.parse(v) : v;
    } catch {
      return v;
    }
  };
  for (const f of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(log, f), 'utf8');
    } catch {
      continue; // unreadable entry: kete-loom observe scan reports it; context must still load
    }
    const head = (/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(text) || [, ''])[1];
    const status = unquote(((/^status:[ \t]*(.*?)\s*$/m.exec(head) || [])[1] || '').trim());
    if (status && status !== 'open') continue;
    open++;
    const rule = /^kind:[ \t]*"?violation"?/m.test(head) && unquote(((/^rule:[ \t]*(.*?)\s*$/m.exec(head) || [])[1] || '').trim());
    if (rule) rules[rule] = (rules[rule] || 0) + 1;
  }
  let last = 'never';
  try {
    last = fs.readFileSync(path.join(dir, 'last-review.txt'), 'utf8').trim() || 'never';
  } catch {
    // no review yet
  }
  const days = /^\d{4}-\d{2}-\d{2}$/.test(last) ? Math.floor((Date.now() - Date.parse(last)) / 86400000) : null;
  const due = open > 0 && (days === null || days >= 7);
  const barriers = Object.entries(rules).filter(([, n]) => n >= 2).map(([r]) => r);
  return `- Skill observations: ${open} open${due ? `, review due (last: ${last}); offer /skill-review once, in one line, and carry on with the user's task` : ''}.${barriers.length ? ` Rules broken twice with no fix: ${barriers.map((r) => `"${r}"`).join(', ')}; the fix is a barrier (/hookify), not new wording.` : ''} Log new findings with the skill-observations skill.`;
}

function check(event) {
  const cwd = event.cwd || process.cwd();
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  if (!root) return {};
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const changes = (git(root, ['status', '--porcelain']) || '').split('\n').filter(Boolean).length;
  const lines = [`Session context from kete-loom (load-session-context):`, `- Branch: ${branch || 'unknown'}, ${changes} uncommitted change(s).`];
  const state = path.join(root, '.planning', 'STATE.md');
  if (fs.existsSync(state)) {
    const head = fs.readFileSync(state, 'utf8').split('\n').slice(0, MAX_STATE_LINES).join('\n').slice(0, MAX_NOTE_CHARS);
    lines.push(`- Project state from .planning/STATE.md (first ${MAX_STATE_LINES} lines; read the full file before acting on it):`, '', head, '');
  }
  const note = findNote(root, branch);
  if (note) {
    let text = fs.readFileSync(note, 'utf8').split('\n').slice(0, MAX_NOTE_LINES).join('\n');
    if (text.length > MAX_NOTE_CHARS) text = `${text.slice(0, MAX_NOTE_CHARS)}\n…`;
    lines.push(`- Handoff note ${path.relative(root, note)} (check it against the repository before acting on it):`, '', text);
  }
  const obs = observations();
  if (obs) lines.push(obs);
  return { context: lines.join('\n') };
}

module.exports = { check };
