#!/usr/bin/env node
'use strict';

// kete-loom hook runner. The installer copies it with each hook's hook.js to ~/.kete-loom/hooks/ and
// registers `node run.js <host> <hook>` with each host. It reads that host's stdin payload, calls the
// hook's check({ command, cwd }), and answers in the host's own dialect. Zero dependencies.
//
// Blocking: exit 2 with the reason on stderr works on every host; Cursor and Copilot also get their
// JSON verdict on stdout. Internal errors fail OPEN (exit 0): Copilot and Kete Code deny on a crashed
// hook, so a runner bug must never block every shell command.

const fs = require('fs');
const path = require('path');

// Each host's payload -> { command, cwd }, or null when the event isn't a shell command.
const READ = {
  claude: (j) => ({ command: j.tool_input && j.tool_input.command, cwd: j.cwd }),
  codex: (j) => ({ command: j.tool_input && j.tool_input.command, cwd: j.cwd }),
  gemini: (j) => ({ command: j.tool_input && j.tool_input.command, cwd: j.cwd }),
  kete: (j) => (j.tool && j.tool !== 'shell' ? null : { command: j.tool_input && j.tool_input.command, cwd: j.cwd }),
  cursor: (j) => ({ command: j.command, cwd: j.cwd }),
  copilot: (j) => {
    if (j.toolName && !['bash', 'powershell', 'shell'].includes(j.toolName)) return null;
    const args = typeof j.toolArgs === 'string' ? JSON.parse(j.toolArgs) : j.toolArgs || {};
    return { command: args.command, cwd: j.cwd };
  },
  // The generated OpenCode plugin sends the normalized shape itself.
  opencode: (j) => ({ command: j.command, cwd: j.cwd }),
};

const ALLOW_JSON = { cursor: { permission: 'allow' } };
const DENY_JSON = {
  cursor: (reason) => ({ permission: 'deny', user_message: reason, agent_message: reason }),
  copilot: (reason) => ({ permissionDecision: 'deny', permissionDecisionReason: reason }),
};

function decide(host, hookName, input, hooksDir = __dirname) {
  if (!READ[host]) throw new Error(`unknown host "${host}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(hookName)) throw new Error(`bad hook name "${hookName}"`);
  const event = READ[host](input ? JSON.parse(input) : {});
  if (!event || typeof event.command !== 'string') return { block: false };
  const { check } = require(path.join(hooksDir, hookName, 'hook.js'));
  return check({ command: event.command, cwd: event.cwd || process.cwd() });
}

// Returns { code, stdout, stderr } so tests can drive it without a process.
function respond(host, hookName, input, hooksDir) {
  let verdict;
  try {
    verdict = decide(host, hookName, input, hooksDir);
  } catch (e) {
    return { code: 0, stdout: ALLOW_JSON[host] ? JSON.stringify(ALLOW_JSON[host]) : '', stderr: `kete-loom hook ${hookName}: ${e.message} (allowed)\n` };
  }
  if (!verdict || !verdict.block) return { code: 0, stdout: ALLOW_JSON[host] ? JSON.stringify(ALLOW_JSON[host]) : '', stderr: '' };
  const reason = String(verdict.reason || `Blocked by kete-loom hook ${hookName}`);
  return { code: 2, stdout: DENY_JSON[host] ? JSON.stringify(DENY_JSON[host](reason)) : '', stderr: `${reason}\n` };
}

if (require.main === module) {
  const [host, hookName] = process.argv.slice(2);
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    // no stdin: treated as an empty event
  }
  const r = respond(host, hookName, input);
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  process.exitCode = r.code;
}

module.exports = { respond, READ };
