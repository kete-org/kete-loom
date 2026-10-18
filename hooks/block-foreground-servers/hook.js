'use strict';

// Blocks shell commands that start a dev server or watcher in the foreground (they never return and
// hang the agent's shell) unless they are already backgrounded. check({ command, background }) -> verdict.

const SERVER = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:dev|start|serve|watch)\b(?!:)/,
  /\bnext\s+dev\b/,
  /(?:^|[\s;&|(])(?:npx\s+)?vite(?:\s+(?:dev|serve|--\S+|\.)|\s*$)/,
  /\bng\s+serve\b/,
  /\bwebpack(?:-dev-server|\s+serve)\b/,
  /\bnodemon\b/,
  /\brails\s+s(?:erver)?\b/,
  /\bartisan\s+serve\b/,
  /\bflask\s+run\b/,
  /\buvicorn\b/,
  /\bpython3?\s+-m\s+http\.server\b/,
  /\bmanage\.py\s+runserver\b/,
  /\bdocker[\s-]compose\s+(?:\S+\s+)*?up\b(?![^;&|]*\s(?:-d|--detach)\b)/,
  /\bhugo\s+server\b/,
  /\bjekyll\s+serve\b/,
  /\btsc\b[^;&|]*\s(?:--watch|-w)\b/,
  /\b(?:vitest|jest)\b[^;&|]*\s--watch\b/,
];
const BACKGROUNDED = /(?:^|\s)(?:nohup|setsid|tmux|screen|pm2|timeout)\s|&\s*(?:disown\s*)?$|&\s*(?:;|$)/;

function check(event) {
  const command = String(event.command || '');
  if (event.background) return { block: false };
  if (BACKGROUNDED.test(command.trim())) return { block: false };
  // shortcut: quoted text is ignored (so `grep 'npm run dev'` passes), which also lets `sh -c "npm run dev"` through.
  const bare = command.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
  const hit = SERVER.find((re) => re.test(bare));
  if (!hit) return { block: false };
  return {
    block: true,
    reason: 'Blocked by kete-loom (block-foreground-servers): this starts a server or watcher that never exits and would hang the shell. Run it in the background with output in a log, e.g. `npm run dev > .dev-server.log 2>&1 &`, poll the log or the port until it is ready, and stop it when you are done.',
  };
}

module.exports = { check };
