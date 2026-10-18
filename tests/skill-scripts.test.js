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

const MOMO = require(path.join(SKILLS, 'mtn-momo-integration', 'scripts', 'sandbox-setup.js'));

function fakeFetch(responses) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const [status, body] = responses.shift();
    return { status, text: async () => (body === undefined ? '' : JSON.stringify(body)) };
  };
  return { calls, fetchImpl };
}

test('momo sandbox-setup creates a user and key, then checks the token', async () => {
  const { calls, fetchImpl } = fakeFetch([[201], [201, { apiKey: 'k123' }], [200, { access_token: 't', expires_in: 3600 }]]);
  const r = await MOMO.setup({ subscriptionKey: 'sub', callbackHost: 'pay.example.com', fetchImpl, uuid: () => 'u-1' });
  assert.deepStrictEqual(r, { apiUser: 'u-1', apiKey: 'k123', expiresIn: 3600 });
  assert.strictEqual(calls[0].url, 'https://sandbox.momodeveloper.mtn.com/v1_0/apiuser');
  assert.strictEqual(calls[0].init.headers['x-reference-id'], 'u-1');
  assert.deepStrictEqual(JSON.parse(calls[0].init.body), { providerCallbackHost: 'pay.example.com' });
  assert.strictEqual(calls[1].url, 'https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/u-1/apikey');
  assert.strictEqual(calls[2].url, 'https://sandbox.momodeveloper.mtn.com/collection/token/');
  assert.strictEqual(calls[2].init.headers.authorization, `Basic ${Buffer.from('u-1:k123').toString('base64')}`);
  assert.strictEqual(calls[2].init.body, undefined, 'token call must have no body');
});

test('momo sandbox-setup reports API errors and rejects bad input', async () => {
  const { fetchImpl } = fakeFetch([[401, { message: 'Access denied due to invalid subscription key' }]]);
  await assert.rejects(MOMO.setup({ subscriptionKey: 'bad', callbackHost: 'pay.example.com', fetchImpl }), /returned 401: .*invalid subscription key/);
  await assert.rejects(MOMO.setup({ callbackHost: 'pay.example.com', fetchImpl }), /MOMO_SUBSCRIPTION_KEY/);
  for (const host of ['https://pay.example.com', 'pay.example.com/cb', '10.0.0.1', 'localhost']) {
    assert.throws(() => MOMO.parseArgs(['--callback-host', host]), /bare hostname/, host);
  }
  assert.throws(() => MOMO.parseArgs(['--callback-host', 'pay.example.com', '--product', 'loans']), /--product/);
});
