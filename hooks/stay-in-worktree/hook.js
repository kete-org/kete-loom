'use strict';

// In a linked git worktree, blocks edits to files outside that worktree, so an agent working on a
// feature branch can't change the main checkout (or another worktree) by following an absolute path
// or ../ out of it. Outside linked worktrees it does nothing. Reads the .git file only; runs no
// commands. check({ files: [{ path }], cwd }) -> verdict.

const fs = require('fs');
const os = require('os');
const path = require('path');

// The root of the linked worktree containing `dir`, or null. A linked worktree's .git is a file
// pointing into the main repository's .git/worktrees/<name>.
function worktreeRoot(dir) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    const git = path.join(d, '.git');
    let stat;
    try {
      stat = fs.statSync(git);
    } catch {
      stat = null;
    }
    if (stat) {
      if (!stat.isFile()) return null;
      const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(git, 'utf8'));
      return m && /[\\/]worktrees[\\/][^\\/]+[\\/]?$/.test(m[1].trim()) ? d : null;
    }
    if (d === path.dirname(d)) return null;
  }
}

const inside = (root, p) => {
  const rel = path.relative(root, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

function check(event) {
  const cwd = path.resolve(event.cwd || process.cwd());
  const root = worktreeRoot(cwd);
  if (!root) return { block: false };
  const tmp = fs.realpathSync.native ? fs.realpathSync.native(os.tmpdir()) : os.tmpdir();
  for (const f of event.files || []) {
    if (!f || typeof f.path !== 'string') continue;
    const target = path.resolve(cwd, f.path);
    if (inside(root, target) || inside(os.tmpdir(), target) || inside(tmp, target)) continue;
    return {
      block: true,
      reason: `Blocked by kete-loom (stay-in-worktree): this session works in the worktree at \`${root}\`, but \`${target}\` is outside it, perhaps in the main checkout or another worktree. Make the change inside this worktree (the same relative path), or ask the user if it really belongs elsewhere.`,
    };
  }
  return { block: false };
}

module.exports = { check, worktreeRoot };
