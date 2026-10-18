'use strict';

// Registers kete-loom hooks with each host (verified against host docs, Oct 2026). User scope only.
// Every host calls `"<node>" "~/.kete-loom/hooks/run.js" <host> <hook>`; that command string is how we
// recognise our own entries, so we never touch anyone else's hooks.
//
// Shared settings files (Claude Code, Gemini CLI, Kete Code) are edited in place: parsed as strict
// JSON, backed up to `<file>.kete-loom-backup`, written atomically, and refused (with a snippet to
// paste) when they contain comments, since rewriting would drop them.

const fs = require('fs');
const path = require('path');

const RUNNER_RE = /\.kete-loom[\\/]hooks[\\/]run\.js"?\s+([a-z]+)\s+([a-z0-9-]+)\s*$/;
const TIMEOUT_S = 10;

const runtimeDir = (home) => path.join(home, '.kete-loom', 'hooks');
const command = (home, host, hook, node = process.execPath) => `"${node}" "${path.join(runtimeDir(home), 'run.js')}" ${host} ${hook}`;

// Is this hook entry (or command string) one of ours, optionally for a given hook?
function ours(cmd, hook) {
  const m = typeof cmd === 'string' && RUNNER_RE.exec(cmd);
  return Boolean(m) && (!hook || m[2] === hook);
}

// Claude-style `{ <event>: [{ matcher, hooks: [entry] }] }` maps (Claude Code, Codex, Gemini CLI).
function addGrouped(map, event, matcher, entry) {
  const groups = (map[event] ||= []);
  groups.push({ matcher, hooks: [entry] });
}

function removeGrouped(map, hook) {
  let removed = 0;
  for (const event of Object.keys(map || {})) {
    if (!Array.isArray(map[event])) continue;
    map[event] = map[event].filter((group) => {
      if (!group || !Array.isArray(group.hooks)) return true;
      const before = group.hooks.length;
      group.hooks = group.hooks.filter((h) => !ours(h && h.command, hook));
      removed += before - group.hooks.length;
      return group.hooks.length > 0 || before === 0;
    });
    if (!map[event].length) delete map[event];
  }
  return removed;
}

function removeFlat(list, hook, key = 'command') {
  if (!Array.isArray(list)) return { list, removed: 0 };
  const kept = list.filter((h) => !ours(h && h[key], hook));
  return { list: kept, removed: list.length - kept.length };
}

// Each host: where its file is, and how to add or remove our entry in the parsed JSON.
// `own: true` hosts get a file of their own per hook, so removal deletes the file.
const HOSTS = {
  claude: {
    file: (home) => path.join(home, '.claude', 'settings.json'),
    add: (data, cmd) => addGrouped((data.hooks ||= {}), 'PreToolUse', 'Bash', { type: 'command', command: cmd, timeout: TIMEOUT_S }),
    remove: (data, hook) => removeGrouped(data.hooks, hook),
  },
  codex: {
    standalone: true,
    file: (home) => path.join(home, '.codex', 'hooks.json'),
    add: (data, cmd) => addGrouped((data.hooks ||= {}), 'PreToolUse', 'Bash', { type: 'command', command: cmd, timeout: TIMEOUT_S }),
    remove: (data, hook) => removeGrouped(data.hooks, hook),
    note: 'Codex runs a new or changed hook only after you trust it: open Codex and run /hooks.',
  },
  gemini: {
    file: (home) => path.join(home, '.gemini', 'settings.json'),
    // Gemini CLI timeouts are milliseconds.
    add: (data, cmd, hook) => addGrouped((data.hooks ||= {}), 'BeforeTool', 'run_shell_command', { type: 'command', name: `kete-loom-${hook}`, command: cmd, timeout: TIMEOUT_S * 1000 }),
    remove: (data, hook) => removeGrouped(data.hooks, hook),
  },
  kete: {
    // Kete Code reads kete.json and kete.jsonc; edit the one that exists, preferring .jsonc like Kete does.
    file: (home) => {
      const dir = path.join(home, '.config', 'kete');
      const jsonc = path.join(dir, 'kete.jsonc');
      return fs.existsSync(jsonc) ? jsonc : path.join(dir, 'kete.json');
    },
    add: (data, cmd) => {
      const hooks = ((data.kete ||= {}).hooks ||= {});
      (hooks.PreToolUse ||= []).push({ match: 'shell', command: cmd, timeout: TIMEOUT_S });
    },
    remove: (data, hook) => {
      const hooks = data.kete && data.kete.hooks;
      if (!hooks) return 0;
      const { list, removed } = removeFlat(hooks.PreToolUse, hook);
      if (list && list.length) hooks.PreToolUse = list;
      else delete hooks.PreToolUse;
      return removed;
    },
  },
  cursor: {
    standalone: true,
    file: (home) => path.join(home, '.cursor', 'hooks.json'),
    add: (data, cmd) => {
      data.version ||= 1;
      ((data.hooks ||= {}).beforeShellExecution ||= []).push({ command: cmd, timeout: TIMEOUT_S });
    },
    remove: (data, hook) => {
      if (!data.hooks) return 0;
      const { list, removed } = removeFlat(data.hooks.beforeShellExecution, hook);
      if (list && list.length) data.hooks.beforeShellExecution = list;
      else delete data.hooks.beforeShellExecution;
      return removed;
    },
  },
  copilot: {
    own: true,
    file: (home, hook) => path.join(process.env.COPILOT_HOME || path.join(home, '.copilot'), 'hooks', `kete-loom-${hook}.json`),
    content: (cmd) =>
      JSON.stringify({ version: 1, hooks: { preToolUse: [{ type: 'command', bash: cmd, powershell: `& ${cmd}`, timeoutSec: TIMEOUT_S }] } }, null, 2) + '\n',
    isOurs: (text, hook) => {
      try {
        return ours(JSON.parse(text).hooks.preToolUse[0].bash, hook);
      } catch {
        return false;
      }
    },
  },
  opencode: {
    own: true,
    file: (home, hook) => path.join(home, '.config', 'opencode', 'plugins', `kete-loom-${hook}.js`),
    // OpenCode hooks are plugins: run the shared runner and throw to block.
    content: (cmd, hook, home, node = process.execPath) => `// kete-loom hook ${hook}: generated by \`npx @ketecode/loom install --hook ${hook}\`; remove with uninstall.
// runner: ${cmd}
import { spawnSync } from "node:child_process"

export const KeteLoom${hook.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())} = async ({ directory }) => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "bash") return
    const r = spawnSync(${JSON.stringify(node)}, [${JSON.stringify(path.join(runtimeDir(home), 'run.js'))}, "opencode", ${JSON.stringify(hook)}], {
      input: JSON.stringify({ command: output.args && output.args.command, cwd: directory }),
      encoding: "utf8",
      timeout: ${TIMEOUT_S * 1000},
    })
    if (r.status === 2) throw new Error((r.stderr || "").trim() || "Blocked by kete-loom")
  },
})
`,
    isOurs: (text, hook) => ours((/^\/\/ runner: (.*)$/m.exec(text) || [])[1], hook),
  },
};

const HOOK_HOSTS = Object.keys(HOSTS);

class CommentedFileError extends Error {}

// After removing our entries, drop the containers they leave empty (`hooks: {}`, `kete: {}`).
function prune(data) {
  const empty = (v) => v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length;
  if (data.kete && empty(data.kete.hooks)) delete data.kete.hooks;
  if (empty(data.kete)) delete data.kete;
  if (empty(data.hooks)) delete data.hooks;
  return data;
}

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) return {};
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('top level is not an object');
    return data;
  } catch (e) {
    // shortcut: comment detection is a strip-and-retry, not a JSONC parser; fine for telling the cases apart.
    const stripped = text.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str || '');
    try {
      JSON.parse(stripped.replace(/,(\s*[}\]])/g, '$1'));
    } catch {
      throw new Error(`${file} isn't valid JSON (${e.message}); not touching it`);
    }
    throw new CommentedFileError(`${file} has comments, and rewriting it would drop them`);
  }
}

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.kete-loom-backup`);
  const tmp = `${file}.kete-loom-tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

// The JSON a user can paste by hand when we won't edit their file.
function snippet(host, cmd, hook) {
  const data = {};
  HOSTS[host].add(data, cmd, hook);
  return JSON.stringify(data, null, 2);
}

// Registers one hook with one host. Returns { action, dest, reason?, note? }.
function register(host, hook, { home, dryRun = false, node = process.execPath }) {
  const h = HOSTS[host];
  const cmd = command(home, host, hook, node);
  const file = h.file(home, hook);
  if (h.own) {
    const exists = fs.existsSync(file);
    if (exists && !h.isOurs(fs.readFileSync(file, 'utf8'), hook)) return { action: 'skipped', dest: file, reason: 'a file with this name exists and was not written by kete-loom' };
    if (!dryRun) writeAtomic(file, h.content(cmd, hook, home, node));
    return { action: exists ? 'updated' : 'installed', dest: file, note: h.note };
  }
  let data;
  try {
    data = readJson(file);
  } catch (e) {
    const reason = e instanceof CommentedFileError ? `${e.message}. Add this yourself:\n${snippet(host, cmd, hook)}` : e.message;
    return { action: 'skipped', dest: file, reason };
  }
  const existed = h.remove(data, hook) > 0;
  h.add(data, cmd, hook);
  if (!dryRun) writeAtomic(file, JSON.stringify(data, null, 2) + '\n');
  return { action: existed ? 'updated' : 'installed', dest: file, note: h.note };
}

// Removes one hook (or every kete-loom hook when `hook` is null) from one host.
function unregister(host, hook, { home, dryRun = false, names = [] }) {
  const h = HOSTS[host];
  if (h.own) {
    const removed = [];
    for (const name of hook ? [hook] : names) {
      const file = h.file(home, name);
      if (fs.existsSync(file) && h.isOurs(fs.readFileSync(file, 'utf8'), name)) {
        if (!dryRun) fs.rmSync(file);
        removed.push({ name, dest: file });
      }
    }
    return removed;
  }
  const file = h.file(home, hook);
  if (!fs.existsSync(file)) return [];
  let data;
  try {
    data = readJson(file);
  } catch {
    return []; // not ours to fix; doctor reports unreadable files
  }
  const before = registered(host, { home });
  const n = h.remove(data, hook);
  if (!n) return [];
  prune(data);
  if (!dryRun) {
    // A standalone hooks file holding nothing but its version is deleted rather than left behind.
    const rest = Object.keys(data).filter((k) => k !== 'version');
    if (h.standalone && !rest.length) fs.rmSync(file);
    else writeAtomic(file, JSON.stringify(data, null, 2) + '\n');
  }
  return before.filter((name) => !hook || name === hook).map((name) => ({ name, dest: file }));
}

// Names of kete-loom hooks registered with a host.
function registered(host, { home, names = [] }) {
  const h = HOSTS[host];
  if (h.own) return names.filter((n) => fs.existsSync(h.file(home, n)) && h.isOurs(fs.readFileSync(h.file(home, n), 'utf8'), n));
  let data;
  try {
    data = readJson(h.file(home));
  } catch {
    return [];
  }
  const found = new Set();
  (function walk(v) {
    if (typeof v === 'string') {
      const m = RUNNER_RE.exec(v);
      if (m) found.add(m[2]);
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  })(data);
  return [...found];
}

// Copies run.js and each hook's hook.js into ~/.kete-loom/hooks.
function installRuntime(hooks, { home, dryRun = false, sourceDir }) {
  if (dryRun) return;
  const dir = runtimeDir(home);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(sourceDir, 'run.js'), path.join(dir, 'run.js'));
  for (const hook of hooks) {
    fs.mkdirSync(path.join(dir, hook.dir), { recursive: true });
    fs.copyFileSync(path.join(hook.path, 'hook.js'), path.join(dir, hook.dir, 'hook.js'));
  }
}

module.exports = { HOSTS, HOOK_HOSTS, register, unregister, registered, installRuntime, runtimeDir, command, ours };
