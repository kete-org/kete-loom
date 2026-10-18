'use strict';

// Blocks agent edits that would write a secret (API key, token, private key, password) into a file.
// check({ files: [{ path, content }], cwd }) -> verdict. Content is the new text being written.

// Same rules as skills/security-review/scripts/scan-secrets.js; tests/hooks.test.js keeps them in sync.
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
  ['Hard-coded secret assignment', /\b(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i],
];

const PLACEHOLDER = /(example|placeholder|changeme|your[_-]|xxxx|dummy|fake|<[^>]+>|\$\{|process\.env|os\.environ)/i;

const mask = (s) => (s.length <= 8 ? '****' : `${s.slice(0, 4)}…${s.slice(-2)} (${s.length} chars)`);

function check(event) {
  for (const file of event.files || []) {
    if (!file || typeof file.content !== 'string') continue;
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const [label, re] of RULES) {
        const m = re.exec(lines[i]);
        if (!m || PLACEHOLDER.test(m[0])) continue;
        return {
          block: true,
          reason: `Blocked by kete-loom (guard-secrets): this edit writes a ${label} (${mask(m[0])}) into ${file.path || 'a file'}. Read it from an environment variable or secret store instead, and if it is real, tell the user to rotate it.`,
        };
      }
    }
  }
  return { block: false };
}

module.exports = { check, RULES };
