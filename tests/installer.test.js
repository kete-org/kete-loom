'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { listSkills } = require('../scripts/lib/skills');

const CLI = path.join(__dirname, '..', 'bin', 'kete-loom.js');
const SKILLS = listSkills().map((s) => s.dir);

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kete-loom-test-'));
}

function run(args, cwd) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

test('default install writes to the shared .agents folder and Claude Code', () => {
  const home = tmp();
  run(['install', '--home', home]);
  for (const skill of SKILLS) {
    for (const dir of [['.agents', 'skills'], ['.claude', 'skills']]) {
      const p = path.join(home, ...dir, skill);
      assert.ok(fs.existsSync(path.join(p, 'SKILL.md')), `missing ${p}`);
      assert.ok(fs.existsSync(path.join(p, '.kete-loom.json')), `missing marker in ${p}`);
      assert.ok(!fs.existsSync(path.join(p, 'evals')), 'evals must not be installed');
    }
  }
});

test('every target installs into its documented folder', () => {
  const home = tmp();
  run(['install', '--home', home, '--all-targets', '--skill', SKILLS[0]]);
  const expected = [
    ['.agents', 'skills'],
    ['.claude', 'skills'],
    ['.config', 'opencode', 'skills'],
    ['.cursor', 'skills'],
    ['.gemini', 'skills'],
    ['.copilot', 'skills'],
  ];
  for (const dir of expected) assert.ok(fs.existsSync(path.join(home, ...dir, SKILLS[0], 'SKILL.md')), dir.join('/'));
});

test('project scope installs into the current repo', () => {
  const repo = tmp();
  run(['install', '--project', '--skill', SKILLS[0]], repo);
  assert.ok(fs.existsSync(path.join(repo, '.agents', 'skills', SKILLS[0], 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(repo, '.claude', 'skills', SKILLS[0], 'SKILL.md')));
});

test('never overwrites a user skill with the same name unless --force', () => {
  const home = tmp();
  const mine = path.join(home, '.agents', 'skills', SKILLS[0]);
  fs.mkdirSync(mine, { recursive: true });
  fs.writeFileSync(path.join(mine, 'SKILL.md'), 'my own skill');
  const out = run(['install', '--home', home, '--target', 'agents', '--skill', SKILLS[0]]);
  assert.match(out, /skipped/);
  assert.strictEqual(fs.readFileSync(path.join(mine, 'SKILL.md'), 'utf8'), 'my own skill');
  run(['install', '--home', home, '--target', 'agents', '--skill', SKILLS[0], '--force']);
  assert.notStrictEqual(fs.readFileSync(path.join(mine, 'SKILL.md'), 'utf8'), 'my own skill');
});

test('uninstall removes only kete-loom skills', () => {
  const home = tmp();
  run(['install', '--home', home, '--target', 'agents']);
  const other = path.join(home, '.agents', 'skills', 'someone-else');
  fs.mkdirSync(other, { recursive: true });
  fs.writeFileSync(path.join(other, 'SKILL.md'), 'x');
  run(['uninstall', '--home', home, '--target', 'agents']);
  for (const s of SKILLS) assert.ok(!fs.existsSync(path.join(home, '.agents', 'skills', s)));
  assert.ok(fs.existsSync(other));
});

test('dry run changes nothing', () => {
  const home = tmp();
  const out = run(['install', '--home', home, '--dry-run']);
  assert.match(out, /\[dry-run\]/);
  assert.ok(!fs.existsSync(path.join(home, '.agents')));
});

test('custom --dir supports any other agent', () => {
  const dir = path.join(tmp(), 'my-agent', 'skills');
  run(['install', '--dir', dir, '--skill', SKILLS[0]]);
  assert.ok(fs.existsSync(path.join(dir, SKILLS[0], 'SKILL.md')));
});

test('unknown skill is a clear error', () => {
  assert.throws(() => run(['install', '--home', tmp(), '--skill', 'does-not-exist']), /unknown skill/);
});

test('uninstall removes skills linked from a --source folder', () => {
  const src = path.join(tmp(), 'skills');
  fs.cpSync(path.join(__dirname, '..', 'skills'), src, { recursive: true });
  const dir = path.join(tmp(), 'skills');
  run(['install', '--source', src, '--link', '--dir', dir, '--skill', SKILLS[0]]);
  assert.ok(fs.lstatSync(path.join(dir, SKILLS[0])).isSymbolicLink());
  run(['uninstall', '--source', src, '--dir', dir]);
  assert.ok(!fs.existsSync(path.join(dir, SKILLS[0])));
});

test('install.sh passes commands through instead of installing', { skip: process.platform === 'win32' }, () => {
  const home = tmp();
  const out = execFileSync('bash', [path.join(__dirname, '..', 'install.sh'), 'ls'], { encoding: 'utf8', env: { ...process.env, HOME: home } });
  assert.match(out, /skill\(s\)/);
  assert.ok(!fs.existsSync(path.join(home, '.agents')));
});
