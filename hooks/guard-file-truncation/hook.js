'use strict';

// Blocks the first whole-file write in a session that would shrink an existing file of 40+ lines to
// under half its length: the usual sign that the agent read only part of the file and is about to
// overwrite the rest. Writing the same file again goes through, so a deliberate rewrite costs one
// retry. Partial edits are never checked. check({ files: [{ path, content, whole }], cwd, session }).

const fs = require('fs');
const os = require('os');
const path = require('path');

const MIN_LINES = 40;
const KEEP_RATIO = 0.5;
const KEEP_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 5 * 1024 * 1024;

const stateFile = () => path.join(process.env.KETE_LOOM_STATE_DIR || path.join(os.homedir(), '.kete-loom', 'state'), 'guard-file-truncation.json');
const lineCount = (s) => (s ? s.replace(/\n$/, '').split('\n').length : 0);

function check(event, now = Date.now()) {
  const cwd = path.resolve(event.cwd || process.cwd());
  const shrinking = [];
  for (const f of event.files || []) {
    if (!f || !f.whole || typeof f.path !== 'string' || typeof f.content !== 'string') continue;
    const abs = path.resolve(cwd, f.path);
    let before;
    try {
      if (fs.statSync(abs).size > MAX_BYTES) continue;
      before = lineCount(fs.readFileSync(abs, 'utf8'));
    } catch {
      continue; // new file
    }
    const after = lineCount(f.content);
    if (before >= MIN_LINES && after < before * KEEP_RATIO) shrinking.push({ abs, rel: path.relative(cwd, abs) || abs, before, after });
  }
  if (!shrinking.length) return { block: false };
  const file = stateFile();
  let warned = {};
  try {
    warned = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // first run
  }
  for (const k of Object.keys(warned)) if (!(now - warned[k] < KEEP_MS)) delete warned[k];
  const scope = event.session || `${cwd}@${new Date(now).toISOString().slice(0, 10)}`;
  const fresh = shrinking.filter((s) => !warned[`${scope}\n${s.abs}`]);
  for (const s of shrinking) warned[`${scope}\n${s.abs}`] = now;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(warned));
  } catch {
    return { block: false }; // can't remember the warning, so blocking would block forever
  }
  if (!fresh.length) return { block: false };
  return {
    block: true,
    reason: `Blocked by kete-loom (guard-file-truncation): this whole-file write would cut ${fresh.map((s) => `\`${s.rel}\` from ${s.before} to ${s.after} lines`).join(', ')}. If you read only part of the file, read all of it and make a targeted edit instead. If replacing it is really intended, write it again and it will go through.`,
  };
}

module.exports = { check };
