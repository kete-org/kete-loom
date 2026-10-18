'use strict';

// After each tool call, works out how full the context window is from the session transcript and,
// once per level, tells the agent: at 70% to finish the current step and save state soon, at 85% to
// stop starting new work and write a handoff note now. check({ transcript, session, cwd }) -> { context }

const fs = require('fs');
const os = require('os');
const path = require('path');

const LEVELS = [
  { at: 0.85, name: 'critical', say: (p) => `Context is about ${p}% full and will be compacted soon. Don't start anything new: write a session handoff note now (the session-handoff skill: goal, state, decisions, exact next steps), then finish only the step you are on.` },
  { at: 0.7, name: 'warning', say: (p) => `Context is about ${p}% full. Finish the current step, keep reads small, and save progress (a handoff note or the plan's state file) before starting anything big.` },
];
const TAIL_BYTES = 512 * 1024;
const CLAUDE_WINDOW = 200000;

const stateFile = () => path.join(process.env.KETE_LOOM_STATE_DIR || path.join(os.homedir(), '.kete-loom', 'state'), 'context-monitor.json');

function tail(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8').split('\n').slice(size > len ? 1 : 0);
  } finally {
    fs.closeSync(fd);
  }
}

// Share of the context window in use, from the newest usage record: Codex writes token_count events
// with the window size; Claude Code writes usage on each assistant message.
function usage(lines, env = process.env) {
  for (let i = lines.length - 1; i >= 0; i--) {
    let j;
    try {
      j = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const info = j && j.payload && j.payload.type === 'token_count' && j.payload.info;
    if (info && info.last_token_usage && info.model_context_window) return (info.last_token_usage.total_tokens || info.last_token_usage.input_tokens || 0) / info.model_context_window;
    const u = j && j.type === 'assistant' && j.message && j.message.usage;
    if (u && !j.isSidechain) {
      const used = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
      // shortcut: Claude Code transcripts don't record the window; 200k unless usage proves a 1M window or KETE_LOOM_CONTEXT_WINDOW says otherwise.
      const window = Number(env.KETE_LOOM_CONTEXT_WINDOW) || (used > CLAUDE_WINDOW ? 1000000 : CLAUDE_WINDOW);
      return used / window;
    }
  }
  return null;
}

function check(event) {
  if (!event.transcript || !fs.existsSync(event.transcript)) return {};
  const share = usage(tail(event.transcript));
  if (share === null) return {};
  const level = LEVELS.find((l) => share >= l.at);
  const file = stateFile();
  let seen = {};
  try {
    seen = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // first run
  }
  const key = event.session || event.transcript;
  const before = seen[key] && seen[key].level;
  const rank = (name) => (name ? LEVELS.length - LEVELS.findIndex((l) => l.name === name) : 0);
  // Announce each level once; a drop below a level (after compaction) re-arms it.
  const next = { level: level ? level.name : null, at: Date.now() };
  const say = level && rank(level.name) > rank(before);
  if (next.level !== before) {
    seen[key] = next;
    for (const k of Object.keys(seen)) if (Date.now() - seen[k].at > 7 * 24 * 3600 * 1000) delete seen[k];
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(seen));
    } catch {
      return {}; // without the record it would repeat on every tool call
    }
  }
  return say ? { context: `kete-loom (context-monitor): ${level.say(Math.round(share * 100))}` } : {};
}

module.exports = { check, usage };
