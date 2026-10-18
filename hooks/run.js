#!/usr/bin/env node
'use strict';

// kete-loom hook runner. The installer copies it with each hook's hook.js to ~/.kete-loom/hooks/ and
// registers `node run.js <host> <hook> <event>` with each host. It turns that host's stdin payload into
// one normalized event, calls the hook's check(), and answers in the host's own dialect. Zero
// dependencies.
//
// Events: pre-shell { command, cwd }, pre-edit { files: [{ path, content }], cwd },
// post-edit { files: [{ path }], cwd }, session-start { cwd }.
//
// Blocking (pre-*): exit 2 with the reason on stderr works on every host; Cursor and Copilot also get
// their JSON verdict. Internal errors fail OPEN (exit 0): Copilot and Kete Code deny on a crashed hook,
// so a runner bug must never block every tool call. post-edit and session-start never block.

const fs = require('fs');
const path = require('path');

const pick = (o, ...keys) => {
  for (const k of keys) if (o && typeof o[k] === 'string') return o[k];
  return undefined;
};
const parseMaybe = (v) => (typeof v === 'string' ? JSON.parse(v) : v || {});

// `*** Add File: p` / `*** Update File: p` (apply_patch) and `+++ b/p` (unified diff); added lines are
// the new content.
function parsePatch(text) {
  const files = [];
  let current = null;
  for (const line of String(text || '').split('\n')) {
    const header = /^\*\*\* (?:Add|Update) File: (.+)$/.exec(line) || /^\*\*\* Move to: (.+)$/.exec(line) || /^\+\+\+ (?:b\/)?(.+)$/.exec(line);
    if (header && header[1] !== '/dev/null') {
      current = { path: header[1].trim(), content: '' };
      files.push(current);
    } else if (current && line.startsWith('+') && !line.startsWith('+++')) current.content += `${line.slice(1)}\n`;
  }
  return files;
}

// A Claude-style tool_input -> [{ path, content }].
const claudeFiles = (input) => {
  const p = pick(input, 'file_path', 'notebook_path', 'path', 'filePath');
  return p ? [{ path: p, content: pick(input, 'content', 'new_string', 'new_source') || '' }] : [];
};

// Tolerant reader for hosts whose edit arguments aren't fully documented (Copilot, OpenCode).
const looseFiles = (args) => {
  if (pick(args, 'patchText', 'patch', 'input')) return parsePatch(pick(args, 'patchText', 'patch', 'input'));
  const p = pick(args, 'path', 'filePath', 'file_path');
  return p ? [{ path: p, content: pick(args, 'file_text', 'content', 'new_str', 'newString', 'new_string') || '' }] : [];
};

const SHELL_TOOLS = { kete: ['shell'], copilot: ['bash', 'powershell', 'shell'], opencode: ['bash'] };
const EDIT_TOOLS = { kete: ['edit', 'write', 'patch'], copilot: ['edit', 'create', 'str_replace_editor', 'apply_patch'], opencode: ['edit', 'write', 'apply_patch'] };

// Each host's payload -> the normalized event, or null when the call isn't one this event handles.
// Claude, Codex and Gemini filter tools with matchers at registration; the rest are filtered here.
function normalize(host, event, j) {
  const cwd = pick(j, 'cwd') || (Array.isArray(j.workspace_roots) && j.workspace_roots[0]) || process.env.CURSOR_PROJECT_DIR || process.cwd();
  const tool = j.tool || j.toolName || j.tool_name;
  const toolArgs = () => (host === 'copilot' ? parseMaybe(j.toolArgs) : j.tool_input || j.args || {});
  if (event === 'session-start') return { cwd };
  if (SHELL_TOOLS[host] && event === 'pre-shell' && tool && !SHELL_TOOLS[host].includes(tool)) return null;
  if (EDIT_TOOLS[host] && event !== 'pre-shell' && tool && !EDIT_TOOLS[host].includes(tool)) return null;

  if (event === 'pre-shell') {
    const command = host === 'cursor' ? j.command : pick(toolArgs(), 'command');
    return typeof command === 'string' ? { command, cwd } : null;
  }
  let files;
  if (host === 'codex') files = parsePatch(pick(j.tool_input, 'command', 'input', 'patch'));
  else if (host === 'cursor') files = j.file_path ? [{ path: j.file_path, content: '' }] : [];
  else if (host === 'claude' || host === 'gemini') files = claudeFiles(j.tool_input);
  else files = looseFiles(toolArgs());
  return files.length ? { files, cwd } : null;
}

const SESSION_JSON = {
  claude: (c) => ({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: c } }),
  codex: (c) => ({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: c } }),
  gemini: (c) => ({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: c } }),
  kete: (c) => ({ context: c }),
  cursor: (c) => ({ additional_context: c }),
  copilot: (c) => ({ additionalContext: c }),
};
const ALLOW_JSON = { cursor: { permission: 'allow' } };
const DENY_JSON = {
  cursor: (reason) => ({ permission: 'deny', user_message: reason, agent_message: reason }),
  copilot: (reason) => ({ permissionDecision: 'deny', permissionDecisionReason: reason }),
};

const EVENTS = ['pre-shell', 'pre-edit', 'post-edit', 'session-start'];
const allow = (host, event) => ({ code: 0, stdout: event.startsWith('pre-') && ALLOW_JSON[host] ? JSON.stringify(ALLOW_JSON[host]) : '', stderr: '' });

// Returns { code, stdout, stderr } so tests can drive it without a process.
function respond(host, hookName, input, hooksDir = __dirname, event = 'pre-shell') {
  let verdict;
  try {
    if (!Object.prototype.hasOwnProperty.call(SESSION_JSON, host) && host !== 'opencode') throw new Error(`unknown host "${host}"`);
    if (!EVENTS.includes(event)) throw new Error(`unknown event "${event}"`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(hookName || '')) throw new Error(`bad hook name "${hookName}"`);
    const normalized = normalize(host, event, input ? JSON.parse(input) : {});
    if (!normalized) return allow(host, event);
    const { check } = require(path.join(hooksDir, hookName, 'hook.js'));
    verdict = check(normalized) || {};
  } catch (e) {
    const r = allow(host, event);
    return { ...r, stderr: `kete-loom hook ${hookName}: ${e.message} (allowed)\n` };
  }
  if (event === 'session-start') {
    return verdict.context && SESSION_JSON[host] ? { code: 0, stdout: JSON.stringify(SESSION_JSON[host](String(verdict.context))), stderr: '' } : allow(host, event);
  }
  if (!event.startsWith('pre-') || !verdict.block) return allow(host, event);
  const reason = String(verdict.reason || `Blocked by kete-loom hook ${hookName}`);
  return { code: 2, stdout: DENY_JSON[host] ? JSON.stringify(DENY_JSON[host](reason)) : '', stderr: `${reason}\n` };
}

if (require.main === module) {
  const [host, hookName, event = 'pre-shell'] = process.argv.slice(2);
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    // no stdin: treated as an empty event
  }
  const r = respond(host, hookName, input, __dirname, event);
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  process.exitCode = r.code;
}

module.exports = { respond, normalize, parsePatch, EVENTS };
