'use strict';

// Registers kete-loom hooks with each host (verified against host docs and Kete Code's source,
// Oct 2026). User scope only. Every host calls `"<node>" "~/.kete-loom/hooks/run.js" <host> <hook>
// <event>`; that command string is how we recognise our own entries, so we never touch anyone else's.
//
// Shared settings files (Claude Code, Gemini CLI, Kete Code) are edited in place: parsed as strict
// JSON, backed up to `<file>.kete-loom-backup`, written atomically, and refused (with a snippet to
// paste) when they contain comments, since rewriting would drop them.

const fs = require('fs');
const path = require('path');

const RUNNER_RE = /\.kete-loom[\\/]hooks[\\/]run\.js"?\s+([a-z]+)\s+([a-z0-9-]+)(?:\s+([a-z-]+))?\s*$/;
// Seconds. A formatter run after an edit gets longer than a check before one.
const TIMEOUT_S = { 'pre-shell': 10, 'pre-edit': 10, 'post-edit': 60, 'session-start': 10, stop: 10, 'stop-gate': 180, 'post-read': 10, 'post-tool': 10 };

const runtimeDir = (home) => path.join(home, '.kete-loom', 'hooks');
const command = (home, host, hook, event = 'pre-shell', node = process.execPath) =>
  `"${node}" "${path.join(runtimeDir(home), 'run.js')}" ${host} ${hook} ${event}`;

function ours(cmd, hook) {
  const m = typeof cmd === 'string' && RUNNER_RE.exec(cmd);
  return Boolean(m) && (!hook || m[2] === hook);
}

// Host event name and tool matcher for each kete-loom event; a missing entry means the host can't
// run that event (Cursor has no documented pre-edit hook; OpenCode can't add context at session start).
// stop-gate needs a stop hook that can make the agent continue: Kete Code's Stop can only notify, and
// OpenCode's session.idle can't do either from a command. post-read needs a host that reports what a
// file or web read returned and can add a note after it; post-tool also needs a transcript with
// token usage, which only Claude Code and Codex write.
const EVENTS = {
  claude: { 'pre-shell': ['PreToolUse', 'Bash'], 'pre-edit': ['PreToolUse', 'Edit|Write|NotebookEdit'], 'post-edit': ['PostToolUse', 'Edit|Write|NotebookEdit'], 'session-start': ['SessionStart'], stop: ['Stop'], 'stop-gate': ['Stop'], 'post-read': ['PostToolUse', 'Read|WebFetch|WebSearch'], 'post-tool': ['PostToolUse'] },
  codex: { 'pre-shell': ['PreToolUse', 'Bash'], 'pre-edit': ['PreToolUse', 'apply_patch'], 'post-edit': ['PostToolUse', 'apply_patch'], 'session-start': ['SessionStart'], stop: ['Stop'], 'stop-gate': ['Stop'], 'post-tool': ['PostToolUse'] },
  gemini: { 'pre-shell': ['BeforeTool', 'run_shell_command'], 'pre-edit': ['BeforeTool', 'write_file|replace'], 'post-edit': ['AfterTool', 'write_file|replace'], 'session-start': ['SessionStart'], stop: ['AfterAgent'], 'stop-gate': ['AfterAgent'], 'post-read': ['AfterTool', 'read_file|read_many_files|web_fetch|google_web_search'] },
  kete: { 'pre-shell': ['PreToolUse', 'shell'], 'pre-edit': ['PreToolUse', 'edit|write|patch'], 'post-edit': ['PostToolUse', 'edit|write|patch'], 'session-start': ['SessionStart'], stop: ['Stop'], 'post-read': ['PostToolUse', 'read|webfetch|websearch'] },
  cursor: { 'pre-shell': ['beforeShellExecution'], 'post-edit': ['afterFileEdit'], 'session-start': ['sessionStart'], stop: ['stop'], 'stop-gate': ['stop'] },
  copilot: { 'pre-shell': ['preToolUse'], 'pre-edit': ['preToolUse'], 'post-edit': ['postToolUse'], 'session-start': ['sessionStart'], stop: ['agentStop'], 'stop-gate': ['agentStop'] },
  opencode: { 'pre-shell': ['tool.execute.before'], 'pre-edit': ['tool.execute.before'], 'post-edit': ['tool.execute.after'] },
};

// Claude-style `{ <event>: [{ matcher, hooks: [entry] }] }` (Claude Code, Codex, Gemini CLI).
function removeGrouped(map, hook) {
  let removed = 0;
  for (const ev of Object.keys(map || {})) {
    if (!Array.isArray(map[ev])) continue;
    map[ev] = map[ev].filter((group) => {
      if (!group || !Array.isArray(group.hooks)) return true;
      const before = group.hooks.length;
      group.hooks = group.hooks.filter((h) => !ours(h && h.command, hook));
      removed += before - group.hooks.length;
      return group.hooks.length > 0 || before === 0;
    });
    if (!map[ev].length) delete map[ev];
  }
  return removed;
}

// `{ <event>: [entry] }` (Kete Code, Cursor).
function removeFlat(map, hook) {
  let removed = 0;
  for (const ev of Object.keys(map || {})) {
    if (!Array.isArray(map[ev])) continue;
    const kept = map[ev].filter((h) => !ours(h && h.command, hook));
    removed += map[ev].length - kept.length;
    if (kept.length) map[ev] = kept;
    else delete map[ev];
  }
  return removed;
}

function grouped(host, timeoutUnit = 1) {
  return {
    add: (data, cmd, hook, event) => {
      const [ev, matcher] = EVENTS[host][event];
      const entry = { type: 'command', command: cmd, timeout: TIMEOUT_S[event] * timeoutUnit };
      if (host === 'gemini') entry.name = `kete-loom-${hook}`;
      ((data.hooks ||= {})[ev] ||= []).push({ ...(matcher ? { matcher } : {}), hooks: [entry] });
    },
    remove: (data, hook) => removeGrouped(data.hooks, hook),
  };
}

const pascal = (s) => s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());

const HOSTS = {
  claude: { file: (home) => path.join(home, '.claude', 'settings.json'), ...grouped('claude') },
  codex: {
    standalone: true,
    file: (home) => path.join(home, '.codex', 'hooks.json'),
    ...grouped('codex'),
    note: 'Codex runs a new or changed hook only after you trust it: open Codex and run /hooks.',
  },
  // Gemini CLI timeouts are milliseconds.
  gemini: { file: (home) => path.join(home, '.gemini', 'settings.json'), ...grouped('gemini', 1000) },
  kete: {
    // Kete Code reads kete.json and kete.jsonc; edit the one that exists, preferring .jsonc.
    file: (home) => {
      const dir = path.join(home, '.config', 'kete');
      const jsonc = path.join(dir, 'kete.jsonc');
      return fs.existsSync(jsonc) ? jsonc : path.join(dir, 'kete.json');
    },
    add: (data, cmd, hook, event) => {
      const [ev, match] = EVENTS.kete[event];
      (((data.kete ||= {}).hooks ||= {})[ev] ||= []).push({ ...(match ? { match } : {}), command: cmd, timeout: TIMEOUT_S[event] });
    },
    remove: (data, hook) => removeFlat(data.kete && data.kete.hooks, hook),
  },
  cursor: {
    standalone: true,
    file: (home) => path.join(home, '.cursor', 'hooks.json'),
    add: (data, cmd, hook, event) => {
      data.version ||= 1;
      ((data.hooks ||= {})[EVENTS.cursor[event][0]] ||= []).push({ command: cmd, timeout: TIMEOUT_S[event] });
    },
    remove: (data, hook) => removeFlat(data.hooks, hook),
  },
  copilot: {
    own: true,
    file: (home, hook) => path.join(process.env.COPILOT_HOME || path.join(home, '.copilot'), 'hooks', `kete-loom-${hook}.json`),
    content: (cmd, hook, event) =>
      JSON.stringify({ version: 1, hooks: { [EVENTS.copilot[event][0]]: [{ type: 'command', bash: cmd, powershell: `& ${cmd}`, timeoutSec: TIMEOUT_S[event] }] } }, null, 2) + '\n',
    isOurs: (text, hook) => {
      try {
        return Object.values(JSON.parse(text).hooks).some((list) => list.some((h) => ours(h.bash, hook)));
      } catch {
        return false;
      }
    },
  },
  opencode: {
    own: true,
    file: (home, hook) => path.join(home, '.config', 'opencode', 'plugins', `kete-loom-${hook}.js`),
    // OpenCode hooks are plugins: hand the raw call to the shared runner, and throw to block.
    content: (cmd, hook, event, home, node = process.execPath) => {
      const key = EVENTS.opencode[event][0];
      const before = key === 'tool.execute.before';
      return `// kete-loom hook ${hook} (${event}): generated by \`npx @ketecode/loom install --hook ${hook}\`; remove with uninstall.
// runner: ${cmd}
import { spawnSync } from "node:child_process"

export const KeteLoom${pascal(hook)} = async ({ directory }) => ({
  ${JSON.stringify(key)}: async (input, output) => {
    const r = spawnSync(${JSON.stringify(node)}, [${JSON.stringify(path.join(runtimeDir(home), 'run.js'))}, "opencode", ${JSON.stringify(hook)}, ${JSON.stringify(event)}], {
      input: JSON.stringify({ tool: input && input.tool, args: (output && output.args) || (input && input.args), cwd: directory }),
      encoding: "utf8",
      timeout: ${TIMEOUT_S[event] * 1000},
    })${before ? '\n    if (r.status === 2) throw new Error((r.stderr || "").trim() || "Blocked by kete-loom")' : ''}
  },
})
`;
    },
    isOurs: (text, hook) => ours((/^\/\/ runner: (.*)$/m.exec(text) || [])[1], hook),
  },
};

const HOOK_HOSTS = Object.keys(HOSTS);
const supports = (host, event) => Boolean(EVENTS[host] && EVENTS[host][event]);

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

function snippet(host, cmd, hook, event) {
  const data = {};
  HOSTS[host].add(data, cmd, hook, event);
  return JSON.stringify(data, null, 2);
}

// Registers one hook with one host. Returns { action, dest, reason?, note? }.
function register(host, hook, event, { home, dryRun = false, node = process.execPath }) {
  const h = HOSTS[host];
  if (!supports(host, event)) return { action: 'skipped', dest: h.file(home, hook), reason: `${host} has no ${event} hook` };
  const cmd = command(home, host, hook, event, node);
  const file = h.file(home, hook);
  if (h.own) {
    const exists = fs.existsSync(file);
    if (exists && !h.isOurs(fs.readFileSync(file, 'utf8'), hook)) return { action: 'skipped', dest: file, reason: 'a file with this name exists and was not written by kete-loom' };
    if (!dryRun) writeAtomic(file, h.content(cmd, hook, event, home, node));
    return { action: exists ? 'updated' : 'installed', dest: file, note: h.note };
  }
  let data;
  try {
    data = readJson(file);
  } catch (e) {
    const reason = e instanceof CommentedFileError ? `${e.message}. Add this yourself:\n${snippet(host, cmd, hook, event)}` : e.message;
    return { action: 'skipped', dest: file, reason };
  }
  const existed = h.remove(data, hook) > 0;
  h.add(data, cmd, hook, event);
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
    return []; // not ours to fix
  }
  const before = registered(host, { home });
  if (!h.remove(data, hook)) return [];
  prune(data);
  if (!dryRun) {
    // A standalone hooks file holding nothing but its version is deleted rather than left behind.
    if (h.standalone && !Object.keys(data).filter((k) => k !== 'version').length) fs.rmSync(file);
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

module.exports = { HOSTS, HOOK_HOSTS, EVENTS, supports, register, unregister, registered, installRuntime, runtimeDir, command, ours, readJson, writeAtomic, CommentedFileError };
