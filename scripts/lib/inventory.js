'use strict';

// What kete-loom has installed, where, and at which version, read from the markers it writes:
// `.kete-loom.json` in skill folders, `kete-loom name@version` comments in agents, commands and rules,
// and the host configs for hooks, linked rules and MCP servers. `update` and `outdated` build on it.

const fs = require('fs');
const path = require('path');
const { TARGETS, KINDS, resolveTarget } = require('./targets');
const Hooks = require('./hooks-install');
const Rules = require('./rules-install');
const Mcp = require('./mcp-install');

const FILE_MARKER = /^(?:# |<!-- )kete-loom ([a-z0-9-]+)@([^\s>]+)/m;

function head(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(512);
    const n = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    return buf.toString('utf8', 0, n);
  } catch {
    return '';
  }
}

function skillEntry(dir, entry) {
  const p = path.join(dir, entry);
  let stat;
  try {
    stat = fs.lstatSync(p);
  } catch {
    return null;
  }
  if (stat.isSymbolicLink()) return { name: entry, version: null, linked: true, path: p };
  try {
    const marker = JSON.parse(fs.readFileSync(path.join(p, '.kete-loom.json'), 'utf8'));
    return { name: entry, version: marker.version || null, path: p };
  } catch {
    return null; // not installed by kete-loom
  }
}

// Rows of { target, kind, name, version, path, linked? } for one scope.
function inventory({ scope = 'user', home, cwd = process.cwd(), mcpAll = Mcp.listMcp(), hookNames = [] }) {
  const rows = [];
  for (const target of Object.keys(TARGETS)) {
    for (const kind of KINDS) {
      const dir = resolveTarget(target, { scope, home, cwd, kind });
      if (!dir || !fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        if (kind === 'skills') {
          const s = skillEntry(dir, entry);
          if (s) rows.push({ target, kind, ...s });
          continue;
        }
        const m = FILE_MARKER.exec(head(path.join(dir, entry)));
        if (m) rows.push({ target, kind, name: m[1], version: m[2], path: path.join(dir, entry) });
      }
    }
  }
  if (scope === 'user') {
    for (const host of Rules.RULE_HOSTS) {
      const dir = Rules.HOSTS[host].dir(home);
      for (const name of Rules.installedNames(dir)) {
        const m = FILE_MARKER.exec(head(path.join(dir, `${name}.md`)));
        rows.push({ target: host, kind: 'rules', name, version: m ? m[2] : null, path: path.join(dir, `${name}.md`) });
      }
    }
    for (const host of Hooks.HOOK_HOSTS) for (const name of Hooks.registered(host, { home, names: hookNames })) rows.push({ target: host, kind: 'hooks', name, version: null });
  }
  for (const host of Mcp.MCP_HOSTS) for (const name of Mcp.registeredMcp(host, mcpAll, { scope, home, cwd })) rows.push({ target: host, kind: 'mcp', name, version: null });
  return rows;
}

// -1, 0 or 1 for two x.y.z versions.
function compare(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0) ? -1 : 1;
  return 0;
}

module.exports = { inventory, compare };
