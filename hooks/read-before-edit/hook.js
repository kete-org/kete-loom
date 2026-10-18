'use strict';

// Refuses the first edit of each existing file per session, telling the agent to read it and search for
// its callers, then allows the retry. check({ files: [{ path }], cwd, session }) -> verdict.

const fs = require('fs');
const os = require('os');
const path = require('path');

const KEEP_MS = 2 * 24 * 60 * 60 * 1000;

const stateFile = () => path.join(process.env.KETE_LOOM_STATE_DIR || path.join(os.homedir(), '.kete-loom', 'state'), 'read-before-edit.json');

function load(file, now) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const k of Object.keys(data)) if (!(now - data[k] < KEEP_MS)) delete data[k];
    return data;
  } catch {
    return {};
  }
}

function check(event, now = Date.now()) {
  const cwd = path.resolve(event.cwd || process.cwd());
  const scope = event.session || `${cwd}@${new Date(now).toISOString().slice(0, 10)}`;
  const file = stateFile();
  const seen = load(file, now);
  const fresh = [];
  for (const f of event.files || []) {
    if (!f || typeof f.path !== 'string') continue;
    const abs = path.resolve(cwd, f.path);
    const key = `${scope}\n${abs}`;
    if (!seen[key] && fs.existsSync(abs)) fresh.push(path.relative(cwd, abs) || abs);
    seen[key] = now;
  }
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(seen));
  } catch {
    return { block: false }; // can't remember the refusal, so refusing would block forever
  }
  if (!fresh.length) return { block: false };
  return {
    block: true,
    reason: `kete-loom (read-before-edit): before changing ${fresh.map((p) => `\`${p}\``).join(', ')}, read the whole file and search the codebase for what imports, calls or configures it. Then make the same edit again; it will go through.`,
  };
}

module.exports = { check };
