'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadRule } = require('../scripts/lib/skills');
const { render } = require('../scripts/lib/render');

const CLI = path.join(__dirname, '..', 'bin', 'kete-loom.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kl-rules-'));
const run = (args, cwd) => execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');

function rule(name, paths) {
  const file = path.join(tmp(), `${name}.md`);
  fs.writeFileSync(file, `---\nname: ${name}\ndescription: Rules for testing the renderer output.\nlicense: MIT\nmetadata:\n  kete-loom/version: "1.0.0"\n  kete-loom/category: coding\n  kete-loom/risk: read-only\n${paths ? `  kete-loom/paths: "${paths}"\n` : ''}---\n\n- Use the thing.\n`);
  return loadRule(file);
}

test('rules render path scoping in each host format', () => {
  const py = rule('py', '**/*.py, **/*.pyi');
  assert.match(render(py, 'claude').content, /^paths: \["\*\*\/\*\.py", "\*\*\/\*\.pyi"\]$/m);
  assert.match(render(py, 'copilot').content, /^applyTo: "\*\*\/\*\.py,\*\*\/\*\.pyi"$/m);
  assert.strictEqual(render(py, 'copilot').file, 'py.instructions.md');
  const cursor = render(py, 'cursor');
  assert.strictEqual(cursor.file, 'py.mdc');
  assert.match(cursor.content, /^globs: "\*\*\/\*\.py, \*\*\/\*\.pyi"$/m);
  assert.match(cursor.content, /^alwaysApply: false$/m);
  assert.match(render(py, 'plain').content, /Applies when working on files matching: \*\*\/\*\.py, \*\*\/\*\.pyi/);
  const always = rule('always');
  assert.doesNotMatch(render(always, 'claude').content, /^paths:/m, 'no paths means always loaded');
  assert.match(render(always, 'copilot').content, /^applyTo: "\*\*"$/m);
  assert.match(render(always, 'cursor').content, /^alwaysApply: true$/m);
});

test('rules install into Claude Code by default, and into every detected host', () => {
  const home = tmp();
  for (const d of ['.config/kete', '.gemini', '.config/opencode', '.codex', '.copilot']) fs.mkdirSync(path.join(home, d), { recursive: true });
  fs.writeFileSync(path.join(home, '.config', 'kete', 'AGENTS.md'), '# My global notes\n\nAlways answer in British English.\n');
  fs.writeFileSync(path.join(home, '.config', 'opencode', 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  run(['install', '--home', home, '--rule', 'common']);

  assert.match(read(home, '.claude', 'rules', 'kete-loom', 'common.md'), /# kete-loom common@/);
  assert.match(read(home, '.copilot', 'instructions', 'kete-loom', 'common.instructions.md'), /applyTo: "\*\*"/);
  const kete = read(home, '.config', 'kete', 'AGENTS.md');
  assert.match(kete, /^# My global notes/, 'keeps your text');
  assert.match(kete, /@kete-loom\/rules\/common\.md/);
  assert.ok(fs.existsSync(path.join(home, '.config', 'kete', 'kete-loom', 'rules', 'common.md')));
  assert.match(read(home, '.gemini', 'GEMINI.md'), /@\.\/kete-loom\/rules\/common\.md/);
  const oc = JSON.parse(read(home, '.config', 'opencode', 'opencode.json'));
  assert.strictEqual(oc.theme, 'dark');
  assert.deepStrictEqual(oc.instructions, [path.join(home, '.config', 'opencode', 'kete-loom', 'rules', '*.md')]);
  assert.match(read(home, '.codex', 'AGENTS.md'), /Read the code you change/, 'Codex gets the text inline');

  run(['install', '--home', home, '--rule', 'common']); // again: no duplicate block
  assert.strictEqual(read(home, '.config', 'kete', 'AGENTS.md').match(/kete-loom:rules:start/g).length, 1);

  run(['uninstall', '--home', home, '--rule', 'common']);
  assert.strictEqual(read(home, '.config', 'kete', 'AGENTS.md'), '# My global notes\n\nAlways answer in British English.\n', 'uninstall restores your file');
  assert.deepStrictEqual(JSON.parse(read(home, '.config', 'opencode', 'opencode.json')), { theme: 'dark' });
  for (const f of ['.gemini/GEMINI.md', '.codex/AGENTS.md', '.claude/rules/kete-loom/common.md', '.config/kete/kete-loom']) assert.ok(!fs.existsSync(path.join(home, f)), f);
});

test('Cursor gets rules per project only', () => {
  const repo = tmp();
  fs.mkdirSync(path.join(repo, '.cursor'));
  run(['install', '--project', '--rule', 'common'], repo);
  assert.match(read(repo, '.cursor', 'rules', 'kete-loom', 'common.mdc'), /alwaysApply: true/);
  assert.ok(fs.existsSync(path.join(repo, '.claude', 'rules', 'kete-loom', 'common.md')));
  assert.ok(!fs.existsSync(path.join(repo, 'AGENTS.md')), 'project instruction files are never edited');
});

test('Codex rules are skipped, not truncated, when AGENTS.md would pass 32 KiB', () => {
  const home = tmp();
  fs.mkdirSync(path.join(home, '.codex'));
  const big = `# Notes\n\n${'x'.repeat(32700)}\n`;
  fs.writeFileSync(path.join(home, '.codex', 'AGENTS.md'), big);
  const out = run(['install', '--home', home, '--rule', 'common']);
  assert.match(out, /over Codex's 32768-byte limit/);
  assert.strictEqual(read(home, '.codex', 'AGENTS.md'), big);
  assert.ok(!fs.existsSync(path.join(home, '.codex', 'kete-loom', 'rules', 'common.md')), 'folder matches what Codex loads');
});

test('a plain install never puts the whole rule library into hosts that cannot scope by path', () => {
  const home = tmp();
  fs.mkdirSync(path.join(home, '.codex'));
  fs.mkdirSync(path.join(home, '.config', 'kete'), { recursive: true });
  run(['install', '--home', home]);
  assert.ok(fs.existsSync(path.join(home, '.claude', 'rules', 'kete-loom', 'common.md')), 'path-scoping hosts get rules');
  assert.ok(!fs.existsSync(path.join(home, '.codex', 'AGENTS.md')));
  assert.ok(!fs.existsSync(path.join(home, '.config', 'kete', 'AGENTS.md')));
});
