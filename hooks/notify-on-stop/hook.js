'use strict';

// Desktop notification when the agent finishes its turn. Never blocks. check({ cwd }) -> {}

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function notifier(platform = process.platform, env = process.env) {
  if (platform === 'darwin') return (title, body) => ['osascript', ['-e', `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`]];
  if (platform === 'linux' && (env.PATH || '').split(path.delimiter).some((d) => d && fs.existsSync(path.join(d, 'notify-send')))) return (title, body) => ['notify-send', [title, body]];
  return null; // shortcut: no Windows toast (it needs a PowerShell module); add one if Windows users ask
}

function check(event) {
  const make = notifier();
  if (!make) return {};
  const [program, args] = make('Agent finished', `${path.basename(path.resolve(event.cwd || process.cwd()))}: your turn`);
  try {
    execFileSync(program, args, { stdio: 'ignore', timeout: 3000 });
  } catch {
    // a notification that can't be shown is not worth failing over
  }
  return {};
}

module.exports = { check, notifier };
