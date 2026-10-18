'use strict';

// Blocks agent edits to files that should never be hand-edited: secrets (.env), lockfiles,
// git internals and private keys. check({ files: [{ path, content }], cwd }) -> verdict.

const path = require('path');

const RULES = [
  {
    test: (rel, base) => /^\.env(?:\..+)?$/.test(base) && !/\.(?:example|sample|template|dist|defaults)$/.test(base),
    reason: 'is an environment file that holds secrets. Edit .env.example and tell the user which values to set.',
  },
  {
    test: (rel, base) => /^(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|go\.sum|pubspec\.lock|Podfile\.lock|mix\.lock|packages\.lock\.json|gradle\.lockfile|flake\.lock)$/.test(base),
    reason: "is a lockfile. Change the dependency with the package manager (it rewrites the lockfile) instead of editing it.",
  },
  {
    test: (rel) => /(?:^|\/)\.git\//.test(rel) || rel === '.git',
    reason: "is inside .git. Use git commands; editing git's internals can corrupt the repository.",
  },
  {
    test: (rel, base) => /^(?:id_(?:rsa|dsa|ecdsa|ed25519)|.*\.(?:pem|key|p12|pfx|jks|keystore))$/.test(base) && !/\.pub$/.test(base),
    reason: 'looks like a private key or keystore. Keys are generated and stored outside the repository.',
  },
];

function check(event) {
  const cwd = event.cwd || process.cwd();
  for (const file of event.files || []) {
    if (!file || typeof file.path !== 'string') continue;
    const rel = path.relative(cwd, path.resolve(cwd, file.path)).split(path.sep).join('/');
    const base = path.basename(file.path);
    const rule = RULES.find((r) => r.test(rel, base));
    if (rule) return { block: true, reason: `Blocked by kete-loom (protect-files): \`${rel}\` ${rule.reason}` };
  }
  return { block: false };
}

module.exports = { check };
