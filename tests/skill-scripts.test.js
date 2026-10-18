'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const SKILLS = path.join(__dirname, '..', 'skills');
const SCAN = path.join(SKILLS, 'security-review', 'scripts', 'scan-secrets.js');
const DETECT = path.join(SKILLS, 'verification-loop', 'scripts', 'detect-checks.js');
const KEY = `sk_live_${'a'.repeat(40)}`;

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kl-scripts-'));
}

function scan(args, cwd) {
  return spawnSync(process.execPath, [SCAN, ...args], { cwd, encoding: 'utf8' });
}

test('scanner flags a key behind a process.env fallback', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'a.js'), `const k = process.env.PAYSTACK_SECRET || "${KEY}";\n`);
  const r = scan(['a.js'], dir);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.match(r.stdout, /Paystack secret key/);
});

test('scanner still ignores placeholders', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'a.js'), 'const password = "<your-password>";\nconst api_key = "${API_KEY}";\n');
  assert.strictEqual(scan(['a.js'], dir).status, 0);
});

test('scanner finds modified tracked files when run from a subfolder', () => {
  const repo = tmp();
  const git = (...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: repo });
  fs.mkdirSync(path.join(repo, 'sub'));
  fs.writeFileSync(path.join(repo, 'sub', 'a.js'), 'x\n');
  git('init', '-q');
  git('add', '.');
  git('commit', '-qm', 'init');
  fs.writeFileSync(path.join(repo, 'sub', 'a.js'), `k = "${KEY}"\n`);
  const r = scan([], path.join(repo, 'sub'));
  assert.strictEqual(r.status, 1, r.stdout);
});

test('detect-checks runs bun scripts with "bun run"', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { build: 'tsc', test: 'vitest' } }));
  fs.writeFileSync(path.join(dir, 'bun.lock'), '');
  const out = JSON.parse(spawnSync(process.execPath, [DETECT, dir], { encoding: 'utf8' }).stdout);
  assert.deepStrictEqual(out.checks.map((c) => c.command), ['bun run build', 'bun run test']);
});
