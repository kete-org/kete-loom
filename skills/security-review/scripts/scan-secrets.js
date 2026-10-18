#!/usr/bin/env node
'use strict';

// Lightweight secret scanner. Read-only.
//   node scan-secrets.js         changed + staged + untracked files (vs HEAD)
//   node scan-secrets.js --all   every tracked file
//   node scan-secrets.js <file>  specific files
// Exit code 1 if anything is found. Values are masked in the output.

const fs = require('fs');
const { execFileSync } = require('child_process');

const RULES = [
  ['AWS access key', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ['OpenAI API key', /\bsk-(proj-)?[A-Za-z0-9_-]{32,}\b/],
  ['Paystack secret key', /\bsk_(live|test)_[a-f0-9]{40}\b/],
  ['Stripe live key', /\b(sk|rk)_live_[A-Za-z0-9]{20,}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Private key block', /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['Connection string with password', /\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]{3,}@/i],
  ['Hard-coded secret assignment', /\b(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["'][^"'\s]{8,}["']/i],
];

const PLACEHOLDER = /(example|placeholder|changeme|your[_-]|xxxx|dummy|fake|<[^>]+>|\$\{|process\.env|os\.environ)/i;
const SKIP_FILE = /(\.lock$|lock\.json$|\.min\.js$|\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf)$)/i;

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function files(argv) {
  const explicit = argv.filter((a) => !a.startsWith('--'));
  if (explicit.length) return explicit;
  if (argv.includes('--all')) return git(['ls-files']).split('\n').filter(Boolean);
  const changed = [
    // --relative: diff paths are repo-root based by default; ls-files is cwd based
    ...git(['diff', '--name-only', '--relative', 'HEAD']).split('\n'),
    ...git(['diff', '--name-only', '--relative', '--cached']).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ];
  return [...new Set(changed.filter(Boolean))];
}

function mask(s) {
  return s.length <= 8 ? '****' : `${s.slice(0, 4)}…${s.slice(-2)} (${s.length} chars)`;
}

const hits = [];
for (const file of files(process.argv.slice(2))) {
  if (SKIP_FILE.test(file) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
  if (fs.statSync(file).size > 1_000_000) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const seen = new Set();
    for (const [label, re] of RULES) {
      const m = re.exec(line);
      // Check the match, not the line: `process.env.KEY || "sk_live_..."` is still a leak.
      if (!m || PLACEHOLDER.test(m[0]) || seen.has(m[0])) continue;
      seen.add(m[0]); // most specific rule wins (rules are ordered specific-first)
      hits.push({ file, line: i + 1, rule: label, match: mask(m[0]) });
    }
  });
}

if (!hits.length) {
  console.log('No likely secrets found.');
} else {
  for (const h of hits) console.log(`${h.file}:${h.line}  ${h.rule}  ${h.match}`);
  console.log(`\n${hits.length} possible secret(s). Confirm each; rotate any real secret that was committed.`);
  process.exitCode = 1;
}
