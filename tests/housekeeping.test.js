'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'bin', 'kete-loom.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kl-house-'));
function run(args, cwd) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
}
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd, stdio: 'ignore' });

test('outdated finds old installs, and update refreshes exactly what is installed', () => {
  const home = tmp();
  run(['install', '--home', home, '--target', 'claude', '--skill', 'tdd-workflow', '--agent', 'code-reviewer']);
  const marker = path.join(home, '.claude', 'skills', 'tdd-workflow', '.kete-loom.json');
  fs.writeFileSync(marker, JSON.stringify({ ...JSON.parse(fs.readFileSync(marker, 'utf8')), version: '0.0.1' }));
  const agent = path.join(home, '.claude', 'agents', 'code-reviewer.md');
  fs.writeFileSync(agent, fs.readFileSync(agent, 'utf8').replace(/code-reviewer@[\d.]+/, 'code-reviewer@0.0.1'));
  // An item Kete Loom no longer ships:
  fs.mkdirSync(path.join(home, '.claude', 'skills', 'retired-skill'));
  fs.writeFileSync(path.join(home, '.claude', 'skills', 'retired-skill', '.kete-loom.json'), '{"version":"0.1.0"}');

  const old = run(['outdated', '--home', home]);
  assert.strictEqual(old.code, 1);
  assert.match(old.out, /skill +tdd-workflow +0\.0\.1/);
  assert.match(old.out, /agent +code-reviewer +0\.0\.1/);

  const up = run(['update', '--home', home]);
  assert.strictEqual(up.code, 0, up.out);
  assert.match(up.out, /tdd-workflow +0\.0\.1 -> /);
  assert.match(up.out, /No longer in Kete Loom, left in place.*skill retired-skill/);
  assert.deepStrictEqual(fs.readdirSync(path.join(home, '.claude', 'skills')).sort(), ['retired-skill', 'tdd-workflow'], 'update adds nothing that was not installed');
  assert.ok(!fs.existsSync(path.join(home, '.agents')), 'nor hosts it was not installed in');
  assert.strictEqual(run(['outdated', '--home', home]).code, 0);
});

test('update with nothing installed says so', () => {
  assert.match(run(['update', '--home', tmp()]).out, /Nothing installed by kete-loom/);
});

test('check lints your own items', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'my-skill'));
  fs.writeFileSync(path.join(dir, 'my-skill', 'SKILL.md'), '---\nname: other\ndescription: short\n---\nBody\n');
  const bad = run(['check', dir]);
  assert.strictEqual(bad.code, 1);
  assert.match(bad.out, /must equal folder name/);
  assert.strictEqual(run(['check', path.join(__dirname, '..', 'skills', 'tdd-workflow')]).code, 0);
  assert.match(run(['check']).out, /usage: kete-loom check/);
});

test('audit scores a bare project low and a prepared one high', () => {
  const bare = tmp();
  git(bare, 'init', '-q');
  const low = run(['audit', '--home', tmp()], bare);
  assert.strictEqual(low.code, 1);
  assert.match(low.out, /✗ Agent instructions/);
  assert.match(low.out, /✗ Verification commands/);

  const repo = tmp();
  git(repo, 'init', '-q');
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), '# Agents\nRun make test.\n');
  fs.writeFileSync(path.join(repo, 'go.mod'), 'module example.com/x\n');
  fs.writeFileSync(path.join(repo, 'Makefile'), 'test:\n\tgo test ./...\nlint:\n\tgo vet ./...\n');
  fs.writeFileSync(path.join(repo, '.gitignore'), '.env\n');
  fs.mkdirSync(path.join(repo, '.github', 'workflows'), { recursive: true });
  const home = tmp();
  run(['install', '--home', home, '--profile', 'developer'], repo);
  const high = run(['audit', '--home', home, '--json'], repo);
  const r = JSON.parse(high.out);
  assert.strictEqual(r.score, 100, JSON.stringify(r.checks.filter((c) => c.status !== 'pass')));

  fs.writeFileSync(path.join(repo, '.env'), 'X=1\n');
  git(repo, 'add', '-f', '.env');
  const leaked = JSON.parse(run(['audit', '--home', home, '--json'], repo).out);
  assert.strictEqual(leaked.checks.find((c) => c.id === 'secrets').status, 'fail');
});
