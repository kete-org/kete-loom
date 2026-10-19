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

const CONTRAST = path.join(SKILLS, 'design-system', 'scripts', 'contrast.js');
const AUDIT = path.join(SKILLS, 'design-system', 'scripts', 'token-audit.js');
const Contrast = require(CONTRAST);
const node = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

test('contrast gives the WCAG ratio for black on white and flags #777 on white', () => {
  const r = node(CONTRAST, ['--json', '#000/#fff', '#777777/#ffffff']);
  assert.strictEqual(r.status, 1, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepStrictEqual(out.results.map((x) => x.ratio), [21, 4.47]);
  assert.strictEqual(out.failing, 1);
});

test('contrast reads oklch, hsl triples and translucent colours', () => {
  const hex = (c) => Contrast.parseColor(c).rgb.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  assert.strictEqual(hex('oklch(0.627 0.194 149.214)'), '00a63e'); // Tailwind 4 green-600
  assert.strictEqual(hex('0 0% 100%'), 'ffffff');
  const half = Contrast.ratio(Contrast.parseColor('rgb(0 0 0 / 50%)'), Contrast.parseColor('#fff'));
  assert.ok(half > 3.9 && half < 4.1, String(half));
  assert.strictEqual(Contrast.parseColor('#zz'), null);
});

test('contrast resolves token pairs from a CSS file and its dark scope', () => {
  const dir = tmp();
  const css = path.join(dir, 't.css');
  fs.writeFileSync(css, ':root{--gray-900:#111827;--bg:#fff;--text:var(--gray-900)}\n.dark{--bg:#111827;--text:#f9fafb}\n@media (prefers-color-scheme: dark){:root{--bg:#000;--text:var(--missing, #fff)}}\n');
  const light = JSON.parse(node(CONTRAST, ['--json', '--css', css, '--text/--bg']).stdout).results[0];
  assert.deepStrictEqual([light.fg, light.bg], ['#111827', '#fff']);
  const dark = JSON.parse(node(CONTRAST, ['--json', '--css', css, '--scope', '.dark', '--text/--bg']).stdout).results[0];
  assert.deepStrictEqual([dark.fg, dark.bg], ['#f9fafb', '#111827']);
  const media = JSON.parse(node(CONTRAST, ['--json', '--css', css, '--scope', '@media (prefers-color-scheme: dark) :root', '--text/--bg']).stdout).results[0];
  assert.deepStrictEqual([media.fg, media.bg], ['#fff', '#000']);
});

test('contrast exits 2 on an unknown token, scope or option', () => {
  const dir = tmp();
  const css = path.join(dir, 't.css');
  fs.writeFileSync(css, ':root{--bg:#fff}\n');
  assert.strictEqual(node(CONTRAST, ['--css', css, '--nope/--bg']).status, 2);
  assert.strictEqual(node(CONTRAST, ['--css', css, '--scope', '.dark', '#000/--bg']).status, 2);
  assert.strictEqual(node(CONTRAST, ['--bogus', '#000/#fff']).status, 2);
  assert.strictEqual(node(CONTRAST, []).status, 2);
});

test('every accent in the product-directions table passes 4.5:1 with white', () => {
  const table = fs.readFileSync(path.join(SKILLS, 'design-system', 'references', 'product-directions.md'), 'utf8');
  const rows = table.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Category') && !l.startsWith('|---'));
  assert.ok(rows.length >= 20, `only ${rows.length} rows parsed`);
  const accents = rows.flatMap((l) => [...l.matchAll(/`(#[0-9a-f]{6})`/gi)].map((m) => m[1]));
  assert.strictEqual(accents.length, rows.length, 'one accent per row');
  for (const a of accents) {
    const r = Contrast.ratio(Contrast.parseColor('#ffffff'), Contrast.parseColor(a));
    assert.ok(r >= 4.5, `${a} is ${r.toFixed(2)}:1`);
  }
});

test('token-audit counts raw values, groups near-duplicates and skips tokens and vendor folders', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'src'));
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.writeFileSync(path.join(dir, 'src', 'a.css'), ':root{--brand:#123456}\n.a{color:#1f2937;padding:13px;font-size:14px;z-index:9999;margin:0}\n.b{color:#1e293b}\n');
  fs.writeFileSync(path.join(dir, 'src', 'b.tsx'), '<div className="p-[13px] bg-[#1F2937]"><a href="#top">x</a></div>\n');
  fs.writeFileSync(path.join(dir, 'node_modules', 'v.css'), '.v{color:#abcdef}\n');
  const r = node(AUDIT, [dir, '--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.filesScanned, 2);
  const colours = Object.fromEntries(out.kinds.colour.values.map((v) => [v.value, v.count]));
  assert.deepStrictEqual(colours, { '#1f2937': 2, '#1e293b': 1 });
  assert.deepStrictEqual(out.colourClusters, [['#1f2937', '#1e293b']]);
  assert.deepStrictEqual(out.kinds.spacing.values.map((v) => [v.value, v.count]), [['13px', 2]]);
  assert.deepStrictEqual(out.kinds['z-index'].values.map((v) => v.value), ['9999']);
});

test('token-audit says when it scanned nothing and rejects bad arguments', () => {
  const dir = tmp();
  const r = node(AUDIT, [dir]);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /No style-bearing files were scanned/);
  assert.strictEqual(node(AUDIT, ['--bogus']).status, 2);
  assert.strictEqual(node(AUDIT, [path.join(dir, 'missing')]).status, 2);
});

const PROSE = path.join(SKILLS, 'ai-prose-cleanup', 'scripts', 'prose-scan.js');
const POSTCHECK = path.join(SKILLS, 'linkedin-content', 'scripts', 'post-check.js');
const METRICS = path.join(SKILLS, 'linkedin-content', 'scripts', 'post-metrics.js');
const withInput = (script, args, input) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', input });

test('prose-scan reports tier-1 residue, placeholders, unsourced claims and invisible characters, and exits 1', () => {
  const text = 'Certainly! Here is the post.\n\nStudies show we leverage robust tools—daily.​ We hit {{your number}} clients. It’s not just a tool, it’s a movement.\n';
  const r = withInput(PROSE, ['-', '--json'], text);
  assert.strictEqual(r.status, 1, r.stderr);
  const out = JSON.parse(r.stdout);
  const kinds = (t) => out.findings.filter((f) => f.tier === t).map((f) => f.kind).sort();
  assert.deepStrictEqual(kinds(1), ['assistant framing', 'invisible character', 'placeholder', 'unsourced attribution']);
  assert.deepStrictEqual(kinds(2), ['false contrast', 'stock vocabulary', 'stock vocabulary']);
  assert.ok(kinds(3).includes('em dash'));
  assert.strictEqual(out.findings.find((f) => f.kind === 'invisible character').span, 'U+200B');
});

test('prose-scan passes plain specific prose and strips only invisible characters', () => {
  const plain = 'I shipped the fix on Tuesday. Two customers noticed within an hour, and one wrote back.';
  assert.strictEqual(withInput(PROSE, ['-'], plain).status, 0);
  const stripped = withInput(PROSE, ['-', '--strip-invisible'], 'a​b c — d').stdout;
  assert.strictEqual(stripped, 'ab c — d');
  assert.strictEqual(withInput(PROSE, ['--bogus', '-'], '').status, 2);
  assert.strictEqual(withInput(PROSE, [path.join(tmp(), 'missing.txt')], '').status, 2);
});

test('prose-scan flags uniform sentence length only with enough sentences', () => {
  const even = Array.from({ length: 8 }, (_, i) => `This sentence number ${i} has exactly eight words.`).join(' ');
  const r = JSON.parse(withInput(PROSE, ['-', '--json'], even).stdout);
  assert.ok(r.findings.some((f) => f.kind === 'uniform sentence length'));
  const short = JSON.parse(withInput(PROSE, ['-', '--json'], 'One two three four. Five six seven eight.').stdout);
  assert.ok(!short.findings.some((f) => f.kind === 'uniform sentence length'));
});

test('post-check fails on placeholders and over-limit text, and warns on hook, hashtags and bait', () => {
  const long = `${'A hook line that runs on and on '.repeat(6)}\n\nWe hit {{your number}} clients.\n\n#a #b #c #d\n\nThoughts?\n`;
  const r = withInput(POSTCHECK, ['-', '--json'], long);
  assert.strictEqual(r.status, 1, r.stderr);
  const rules = JSON.parse(r.stdout).issues.map((i) => `${i.level}:${i.rule}`);
  for (const want of ['error:placeholder', 'warn:hook', 'warn:hashtags', 'warn:engagement-bait']) assert.ok(rules.includes(want), `${want} in ${rules}`);
  const over = withInput(POSTCHECK, ['-', '--json'], 'x'.repeat(3001));
  assert.ok(JSON.parse(over.stdout).issues.some((i) => i.level === 'error' && i.rule === 'length'));
  assert.strictEqual(withInput(POSTCHECK, ['-', '--kind', 'comment'], 'y'.repeat(1251)).status, 1);
});

test('post-check reads banned words from the voice profile and accepts a clean post', () => {
  const dir = tmp();
  const voice = path.join(dir, 'voice.md');
  fs.writeFileSync(voice, '## How I sound\n- **Words I would never use:** synergy, thought leader\n');
  const r = JSON.parse(withInput(POSTCHECK, ['-', '--json', '--voice', voice], 'Real synergy here.\n').stdout);
  assert.ok(r.issues.some((i) => i.rule === 'voice' && /synergy/.test(i.detail)));
  const clean = 'Writing a proposal used to take me 5 hours. It now takes 20 minutes.\n\n' + 'We moved the pricing table out of the document and into its own page. '.repeat(10) + '\n\nWhat part of your proposals takes longest?\n';
  const ok = withInput(POSTCHECK, ['-', '--voice', voice], clean);
  assert.strictEqual(ok.status, 0, ok.stdout);
  assert.strictEqual(withInput(POSTCHECK, ['-', '--kind', 'tweet'], 'x').status, 2);
  assert.strictEqual(withInput(POSTCHECK, ['-', '--voice', path.join(dir, 'none.md')], 'x').status, 2);
});

test('post-metrics computes rates, ranks by engagement rate and refuses to call patterns on few posts', () => {
  const dir = tmp();
  const csv = path.join(dir, 'posts.csv');
  fs.writeFileSync(csv, '﻿Post title,Impressions,Reactions,Comments,Reposts,Hook\r\n"Fired my best client, and it paid","2,210",90,40,3,mistake\r\nTools list,11400,40,2,1,list\r\nWe lost $18k,1940,100,50,8,mistake\r\nNo reach,0,0,0,0,list\r\n');
  const r = spawnSync(process.execPath, [METRICS, csv, '--json', '--followers', '3000', '--group', 'Hook'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.posts, 3);
  assert.strictEqual(out.skipped.length, 1);
  assert.deepStrictEqual(out.top.map((p) => p.post), ['We lost $18k', 'Fired my best client, and it paid', 'Tools list']);
  assert.ok(Math.abs(out.top[0].engagementRate - 158 / 1940) < 1e-9);
  assert.ok(Math.abs(out.top[1].reachMultiple - 2210 / 3000) < 1e-9);
  assert.strictEqual(out.enoughForPatterns, false);
  assert.deepStrictEqual(out.groups[0].values.map((v) => [v.value, v.n]), [['mistake', 2], ['list', 1]]);
});

test('post-metrics exits 2 on missing columns, unknown group columns and bad options', () => {
  const dir = tmp();
  const csv = path.join(dir, 'p.csv');
  fs.writeFileSync(csv, 'Title,Views\nA,10\n');
  const run = (...a) => spawnSync(process.execPath, [METRICS, ...a], { encoding: 'utf8' });
  const missing = run(csv);
  assert.strictEqual(missing.status, 2);
  assert.match(missing.stderr, /missing column\(s\): reactions, comments/);
  fs.writeFileSync(csv, 'Impressions,Reactions,Comments\n10,1,1\n');
  assert.strictEqual(run(csv, '--group', 'theme').status, 2);
  assert.strictEqual(run(csv, '--followers', '0').status, 2);
  assert.strictEqual(run().status, 2);
});
