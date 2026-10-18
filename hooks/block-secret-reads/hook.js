'use strict';

// Blocks shell commands that print or copy secret files into the agent's context: .env files,
// private keys, .netrc, .npmrc, .pgpass and cloud credential files. Loading them without showing
// them (source .env, --env-file, dotenv runners) and naming them (ls, git check-ignore, rm) stay
// allowed. check({ command }) -> verdict.

const NON_SECRET_ENV = /\.(?:example|sample|template|dist|defaults|schema)$/i;
const SECRET = [
  (b) => (b === '.env' || /^\.env\..+/.test(b)) && !NON_SECRET_ENV.test(b),
  (b) => /^\.?secrets?(?:\.(?:json|ya?ml|toml|env))?$/i.test(b),
  (b) => /^id_(?:rsa|dsa|ecdsa|ed25519)$/.test(b) || (/\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(b) && !/\.pub$/.test(b)),
  (b) => /^\.(?:netrc|pgpass|npmrc|pypirc)$/.test(b),
];
const SECRET_PATH = /(?:^|\/)\.aws\/credentials$|(?:^|\/)\.config\/gcloud\/.*credentials.*\.json$|(?:^|\/)\.docker\/config\.json$|(?:^|\/)\.kube\/config$|(?:^|\/)\.ssh\/(?!.*\.pub$)[^/]+$/;

// Commands that name a file without reading it into the output, or load it without printing it.
const HARMLESS = new Set(['ls', 'stat', 'test', '[', '[[', 'touch', 'rm', 'chmod', 'chown', 'mkdir', 'basename', 'dirname', 'realpath', 'file', 'source', '.', 'dotenv', 'env-cmd', 'dotenvx', 'export', 'unset', 'trash']);
const PREFIX = new Set(['sudo', 'env', 'command', 'nice', 'nohup', 'time', 'doas', 'exec']);
const GIT_HARMLESS = new Set(['check-ignore', 'ls-files', 'rm', 'mv', 'status', 'add', 'restore']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish']);

const unquote = (w) => w.replace(/^(['"])(.*)\1$/s, '$2');
const words = (segment) => (segment.match(/'[^']*'|"(?:[^"\\]|\\.)*"|[^\s'"]+/g) || []).map(unquote);
// `git show HEAD:.env` and `<.env` redirections name the file inside a token.
const named = (w) => {
  const last = (p) => p.split(/[\\/]/).pop();
  const candidates = [w, w.replace(/^</, ''), w.slice(w.lastIndexOf(':') + 1), w.replace(/^--?[\w-]+=/, '')];
  return candidates.some((c) => c && (SECRET.some((t) => t(last(c))) || SECRET_PATH.test(c)));
};

// Splits on ; | & && || and newlines outside quotes.
function segments(command) {
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === '\\' && quote === '"') cur += ch + (command[++i] || '');
      else {
        if (ch === quote) quote = null;
        cur += ch;
      }
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (/[;|&\n]/.test(ch)) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function readsSecret(command, depth = 0) {
  if (depth > 3) return null;
  for (const segment of segments(command)) {
    let ws = words(segment.trim());
    while (ws.length && (PREFIX.has(ws[0]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(ws[0]))) ws = ws.slice(1);
    if (!ws.length) continue;
    const [verb, ...args] = ws;
    const base = verb.split('/').pop();
    if (SHELLS.has(base)) {
      const i = args.indexOf('-c');
      if (i >= 0 && args[i + 1]) {
        const inner = readsSecret(args[i + 1], depth + 1);
        if (inner) return inner;
      }
      continue;
    }
    if (HARMLESS.has(base)) continue;
    if (base === 'git' && GIT_HARMLESS.has(args.find((a) => !a.startsWith('-')))) continue;
    // Container runtimes load env files into the container without printing them.
    const checked = ['docker', 'podman', 'docker-compose', 'nerdctl'].includes(base) ? args.filter((a, i) => !/^--env-file(=|$)/.test(a) && !/^--env-file$/.test(args[i - 1] || '')) : ['cp', 'mv', 'install'].includes(base) ? args.slice(0, -1) : args;
    const hit = checked.find(named);
    if (hit) return { verb: base, file: hit };
  }
  return null;
}

function check(event) {
  const hit = readsSecret(String(event.command || ''));
  if (!hit) return { block: false };
  return {
    block: true,
    reason: `Blocked by kete-loom (block-secret-reads): \`${hit.verb}\` would put the contents of \`${hit.file}\`, a secrets file, into this conversation. Don't read it. To learn which settings exist, read the matching .env.example (or the code that loads them) or ask the user; to use the values, load them without printing them (for example \`source .env\` before the command, or the tool's --env-file option).`,
  };
}

module.exports = { check, readsSecret };
