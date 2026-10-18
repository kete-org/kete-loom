'use strict';

// Registers curated MCP servers (mcp/<name>.json) with each host (verified against host docs and Kete
// Code's source, Oct 2026). Servers carry no secrets: remote ones sign in with the host's own OAuth
// flow, local ones need no tokens. Each host gets the server in its own shape:
//   Claude Code  user: `claude mcp add-json --scope user` (never edits ~/.claude.json); project: .mcp.json
//   Codex        [mcp_servers.<name>] tables in a marked block of config.toml
//   Gemini CLI   settings.json `mcpServers` (httpUrl = streamable HTTP)
//   Cursor       mcp.json `mcpServers`
//   Copilot CLI  ~/.copilot/mcp-config.json `mcpServers`; local servers only (its OAuth isn't documented)
//   OpenCode     opencode.json `mcp` (command is an array)
//   Kete Code    kete.json `mcp.servers`
// An entry is ours when it equals what we would write, so a server you configured yourself under the
// same name is never touched. Claude Code's CLI-managed servers are tracked in ~/.kete-loom/mcp.json.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readJson, writeAtomic, CommentedFileError } = require('./hooks-install');

const MCP_DIR = path.join(__dirname, '..', '..', 'mcp');
const listMcp = (dir = MCP_DIR) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => ({ kind: 'mcp', dir: f.slice(0, -5), file: path.join(dir, f), ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }))
    : [];

const http = (s) => s.transport === 'http';
// Each host's JSON for one server, or null when that host can't run it.
const RENDER = {
  claude: (s) => (http(s) ? { type: 'http', url: s.url } : { type: 'stdio', command: s.command, args: s.args }),
  cursor: (s) => (http(s) ? { url: s.url } : { type: 'stdio', command: s.command, args: s.args }),
  gemini: (s) => (http(s) ? { httpUrl: s.url } : { command: s.command, args: s.args }),
  copilot: (s) => (http(s) ? null : { type: 'local', command: s.command, args: s.args, tools: ['*'] }),
  opencode: (s) => (http(s) ? { type: 'remote', url: s.url, enabled: true } : { type: 'local', command: [s.command, ...s.args], enabled: true }),
  kete: (s) => (http(s) ? { type: 'remote', url: s.url } : { type: 'local', command: [s.command, ...s.args] }),
};

const SIGN_IN = {
  claude: (n) => `run /mcp in Claude Code to sign in to ${n}`,
  codex: (n) => `codex mcp login ${n}`,
  gemini: (n) => `run /mcp auth ${n} in Gemini CLI`,
  cursor: (n) => `Cursor asks you to sign in to ${n} the first time it connects`,
  opencode: (n) => `opencode mcp auth ${n}`,
  kete: (n) => `kete mcp auth ${n}`,
};

const keteFile = (dir) => (fs.existsSync(path.join(dir, 'kete.jsonc')) ? path.join(dir, 'kete.jsonc') : path.join(dir, 'kete.json'));

// JSON hosts: file per scope, and the object that holds the servers.
const JSON_HOSTS = {
  claude: { file: { project: (cwd) => path.join(cwd, '.mcp.json') }, holder: (d) => (d.mcpServers ||= {}), standalone: true },
  cursor: { file: { user: (h) => path.join(h, '.cursor', 'mcp.json'), project: (cwd) => path.join(cwd, '.cursor', 'mcp.json') }, holder: (d) => (d.mcpServers ||= {}), standalone: true },
  gemini: { file: { user: (h) => path.join(h, '.gemini', 'settings.json'), project: (cwd) => path.join(cwd, '.gemini', 'settings.json') }, holder: (d) => (d.mcpServers ||= {}) },
  copilot: { file: { user: (h) => path.join(process.env.COPILOT_HOME || path.join(h, '.copilot'), 'mcp-config.json') }, holder: (d) => (d.mcpServers ||= {}), standalone: true },
  opencode: { file: { user: (h) => path.join(h, '.config', 'opencode', 'opencode.json'), project: (cwd) => path.join(cwd, 'opencode.json') }, holder: (d) => (d.mcp ||= {}) },
  kete: { file: { user: (h) => keteFile(path.join(h, '.config', 'kete')), project: (cwd) => keteFile(path.join(cwd, '.kete')) }, holder: (d) => ((d.mcp ||= {}).servers ||= {}) },
};
const MCP_HOSTS = ['claude', 'codex', 'gemini', 'cursor', 'copilot', 'opencode', 'kete'];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function pruneJson(data) {
  const empty = (v) => v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length;
  if (data.mcp && empty(data.mcp.servers)) delete data.mcp.servers;
  for (const k of ['mcpServers', 'mcp']) if (empty(data[k])) delete data[k];
  return data;
}

function jsonRegister(host, servers, { file, dryRun }) {
  let data;
  try {
    data = readJson(file);
  } catch (e) {
    const reason = e instanceof CommentedFileError ? `${e.message}; add the servers yourself` : e.message;
    return servers.map((s) => ({ name: s.dir, action: 'skipped', reason, dest: file }));
  }
  const holder = JSON_HOSTS[host].holder(data);
  const rows = servers.map((s) => {
    const want = RENDER[host](s);
    if (!want) return { name: s.dir, action: 'skipped', reason: `${host} can't sign in to remote MCP servers yet; add ${s.dir} there yourself`, dest: file };
    const have = holder[s.dir];
    if (have && !same(have, want)) return { name: s.dir, action: 'skipped', reason: `a server named ${s.dir} already exists there and wasn't installed by kete-loom`, dest: file };
    holder[s.dir] = want;
    return { name: s.dir, action: have ? 'updated' : 'installed', dest: file };
  });
  pruneJson(data);
  if (!dryRun && rows.some((r) => r.action !== 'skipped')) writeAtomic(file, JSON.stringify(data, null, 2) + '\n');
  return rows;
}

function jsonUnregister(host, servers, { file, dryRun }) {
  if (!fs.existsSync(file)) return [];
  let data;
  try {
    data = readJson(file);
  } catch {
    return [];
  }
  const holder = JSON_HOSTS[host].holder(data);
  const gone = servers.filter((s) => holder[s.dir] && RENDER[host](s) && same(holder[s.dir], RENDER[host](s)));
  if (!gone.length) return [];
  for (const s of gone) delete holder[s.dir];
  pruneJson(data);
  if (!dryRun) {
    if (JSON_HOSTS[host].standalone && !Object.keys(data).length) fs.rmSync(file);
    else writeAtomic(file, JSON.stringify(data, null, 2) + '\n');
  }
  return gone.map((s) => ({ name: s.dir, action: 'removed', dest: file }));
}

// Codex: TOML tables in a block we own. Strings and arrays are written as JSON, which is valid TOML.
const TOML_START = '# kete-loom:mcp:start (managed by kete-loom: edit outside this block)';
const TOML_END = '# kete-loom:mcp:end';
const TOML_BLOCK_RE = /\n*# kete-loom:mcp:start[^\n]*\n[\s\S]*?# kete-loom:mcp:end\n?/;
const codexFile = (scope, home, cwd) => (scope === 'project' ? path.join(cwd, '.codex', 'config.toml') : path.join(home, '.codex', 'config.toml'));
const tomlTable = (s) =>
  [`[mcp_servers.${s.dir}]`, ...(http(s) ? [`url = ${JSON.stringify(s.url)}`] : [`command = ${JSON.stringify(s.command)}`, `args = ${JSON.stringify(s.args)}`])].join('\n');
const blockNames = (text) => [...((TOML_BLOCK_RE.exec(text) || [''])[0].matchAll(/^\[mcp_servers\.([a-z0-9-]+)\]$/gm))].map((m) => m[1]);

function codexWrite(file, text, names, all, dryRun) {
  const rest = text.replace(TOML_BLOCK_RE, '\n').trimEnd();
  const tables = all.filter((s) => names.includes(s.dir)).map(tomlTable);
  const next = tables.length ? `${rest ? `${rest}\n\n` : ''}${TOML_START}\n${tables.join('\n\n')}\n${TOML_END}\n` : rest ? `${rest}\n` : '';
  if (dryRun || next === text) return;
  if (next) writeAtomic(file, next);
  else fs.rmSync(file);
}

function codexRegister(servers, all, { file, dryRun }) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const outside = text.replace(TOML_BLOCK_RE, '\n');
  const ours = blockNames(text);
  const rows = servers.map((s) => {
    // A table or dotted key for this name outside our block would make config.toml invalid TOML.
    if (new RegExp(`(^|\\n)\\s*\\[mcp_servers\\.(?:"${s.dir}"|${s.dir})\\]|mcp_servers\\.(?:"${s.dir}"|${s.dir})\\.`).test(outside)) {
      return { name: s.dir, action: 'skipped', reason: `config.toml already defines mcp_servers.${s.dir}`, dest: file };
    }
    return { name: s.dir, action: ours.includes(s.dir) ? 'updated' : 'installed', dest: file };
  });
  const names = [...new Set([...ours, ...rows.filter((r) => r.action !== 'skipped').map((r) => r.name)])];
  codexWrite(file, text, names, all, dryRun);
  return rows;
}

function codexUnregister(servers, all, { file, dryRun }) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const ours = blockNames(text);
  const gone = ours.filter((n) => servers.some((s) => s.dir === n));
  if (!gone.length) return [];
  codexWrite(file, text, ours.filter((n) => !gone.includes(n)), all, dryRun);
  return gone.map((name) => ({ name, action: 'removed', dest: file }));
}

// Claude Code user scope goes through its CLI; ~/.kete-loom/mcp.json records which servers we added.
const stateFile = (home) => path.join(home, '.kete-loom', 'mcp.json');
const readState = (home) => {
  try {
    return JSON.parse(fs.readFileSync(stateFile(home), 'utf8'));
  } catch {
    return {};
  }
};
function writeState(home, state) {
  const file = stateFile(home);
  if (Object.values(state).some((v) => v.length)) {
    // Our own state file: atomic, but no backup (backups are for files that belong to you).
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(state, null, 2) + '\n');
    fs.renameSync(`${file}.tmp`, file);
  }
  else if (fs.existsSync(file)) {
    fs.rmSync(file);
    if (!fs.readdirSync(path.dirname(file)).length) fs.rmdirSync(path.dirname(file));
  }
}
const claudeBin = () => process.env.KETE_LOOM_CLAUDE_BIN || 'claude';
const claude = (args) => execFileSync(claudeBin(), args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 30000 });

function claudeUserRegister(servers, { home, dryRun }) {
  const state = readState(home);
  const mine = new Set(state['claude-user'] || []);
  const rows = servers.map((s) => {
    const json = JSON.stringify(RENDER.claude(s));
    const dest = `claude mcp (user scope)`;
    try {
      if (mine.has(s.dir)) {
        if (!dryRun) {
          claude(['mcp', 'remove', s.dir, '--scope', 'user']);
          claude(['mcp', 'add-json', s.dir, json, '--scope', 'user']);
        }
        return { name: s.dir, action: 'updated', dest };
      }
      let exists = true;
      try {
        claude(['mcp', 'get', s.dir]);
      } catch (e) {
        if (e.code === 'ENOENT') throw e;
        exists = false;
      }
      if (exists) return { name: s.dir, action: 'skipped', reason: `Claude Code already has a server named ${s.dir}, not installed by kete-loom`, dest };
      if (!dryRun) claude(['mcp', 'add-json', s.dir, json, '--scope', 'user']);
      mine.add(s.dir);
      return { name: s.dir, action: 'installed', dest };
    } catch (e) {
      const reason = e.code === 'ENOENT' ? `the claude CLI isn't on your PATH; run: claude mcp add-json ${s.dir} '${json}' --scope user` : `claude mcp failed: ${(e.stderr || e.message).trim().slice(0, 200)}`;
      return { name: s.dir, action: 'skipped', reason, dest };
    }
  });
  if (!dryRun) writeState(home, { ...state, 'claude-user': [...mine].sort() });
  return rows;
}

function claudeUserUnregister(servers, { home, dryRun }) {
  const state = readState(home);
  const mine = state['claude-user'] || [];
  const gone = mine.filter((n) => servers.some((s) => s.dir === n));
  const removed = [];
  for (const name of gone) {
    try {
      if (!dryRun) claude(['mcp', 'remove', name, '--scope', 'user']);
      removed.push(name);
    } catch (e) {
      // Already removed by hand: forget it either way.
      if (e.code !== 'ENOENT') removed.push(name);
    }
  }
  if (!dryRun) writeState(home, { ...state, 'claude-user': mine.filter((n) => !removed.includes(n)) });
  return removed.map((name) => ({ name, action: 'removed', dest: 'claude mcp (user scope)' }));
}

function fileFor(host, scope, home, cwd) {
  if (host === 'codex') return codexFile(scope, home, cwd);
  const f = JSON_HOSTS[host].file[scope];
  return f ? f(scope === 'project' ? cwd : home) : null;
}

// Registers servers with one host. Returns rows { target, kind, name, action, dest, reason?, note? }.
function installMcp(host, servers, all, { scope = 'user', home, cwd = process.cwd(), dryRun = false }) {
  let rows;
  if (host === 'claude' && scope === 'user') rows = claudeUserRegister(servers, { home, dryRun });
  else {
    const file = fileFor(host, scope, home, cwd);
    if (!file) {
      const reason = host === 'copilot' ? "Copilot CLI reads the project's .mcp.json, which kete-loom writes for Claude Code" : `${host} has no ${scope} MCP config`;
      return servers.map((s) => ({ target: host, kind: 'mcp', name: s.dir, action: 'skipped', reason, dest: '' }));
    }
    rows = host === 'codex' ? codexRegister(servers, all, { file, dryRun }) : jsonRegister(host, servers, { file, dryRun });
  }
  return rows.map((r) => {
    const s = servers.find((x) => x.dir === r.name);
    const note = r.action !== 'skipped' && s && http(s) && SIGN_IN[host] ? `Remote MCP servers sign in with OAuth. ${host}: ${SIGN_IN[host]('<server>')}.` : undefined;
    return { target: host, kind: 'mcp', ...r, ...(note ? { note } : {}) };
  });
}

function uninstallMcp(host, servers, all, { scope = 'user', home, cwd = process.cwd(), dryRun = false }) {
  let rows;
  if (host === 'claude' && scope === 'user') rows = claudeUserUnregister(servers, { home, dryRun });
  else {
    const file = fileFor(host, scope, home, cwd);
    if (!file) return [];
    rows = host === 'codex' ? codexUnregister(servers, all, { file, dryRun }) : jsonUnregister(host, servers, { file, dryRun });
  }
  return rows.map((r) => ({ target: host, kind: 'mcp', ...r }));
}

module.exports = { MCP_HOSTS, MCP_DIR, listMcp, RENDER, installMcp, uninstallMcp, tomlTable };
