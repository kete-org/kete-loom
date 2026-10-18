'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { listAgents, listCommands, loadAgent } = require('../scripts/lib/skills');
const { render } = require('../scripts/lib/render');
const { lintItem } = require('../scripts/lint-skills');

const CLI = path.join(__dirname, '..', 'bin', 'kete-loom.js');
const AGENT = listAgents()[0].dir;
const COMMAND = listCommands()[0].dir;

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kl-agents-'));
const run = (args, cwd) => execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
const exists = (...p) => fs.existsSync(path.join(...p));

test('default install puts agents and commands in Claude Code folders only', () => {
  const home = tmp();
  run(['install', '--home', home]);
  assert.ok(exists(home, '.claude', 'agents', `${AGENT}.md`));
  assert.ok(exists(home, '.claude', 'commands', `${COMMAND}.md`));
  assert.ok(!exists(home, '.codex'), 'Codex is not installed, so nothing goes there');
  assert.ok(!exists(home, '.agents', 'agents'), '.agents defines skills only');
});

test('detected hosts get their own agents and commands, but no duplicate skills', () => {
  const home = tmp();
  fs.mkdirSync(path.join(home, '.codex'));
  fs.mkdirSync(path.join(home, '.gemini'));
  fs.mkdirSync(path.join(home, '.config', 'kete'), { recursive: true });
  run(['install', '--home', home]);
  assert.ok(exists(home, '.codex', 'agents', `${AGENT}.toml`));
  assert.ok(exists(home, '.gemini', 'agents', `${AGENT}.md`));
  assert.ok(exists(home, '.gemini', 'commands', `${COMMAND}.toml`));
  assert.ok(exists(home, '.config', 'kete', 'agents', `${AGENT}.md`));
  assert.ok(exists(home, '.config', 'kete', 'commands', `${COMMAND}.md`));
  assert.ok(!exists(home, '.gemini', 'skills'), 'Gemini reads skills from .agents');
  assert.ok(!exists(home, '.config', 'kete', 'skills'), 'Kete Code reads skills from .agents and .claude');
});

test('every target writes agents in its own file format', () => {
  const home = tmp();
  run(['install', '--home', home, '--all-targets', '--agent', AGENT]);
  for (const p of [
    ['.claude', 'agents', `${AGENT}.md`],
    ['.codex', 'agents', `${AGENT}.toml`],
    ['.config', 'opencode', 'agents', `${AGENT}.md`],
    ['.cursor', 'agents', `${AGENT}.md`],
    ['.gemini', 'agents', `${AGENT}.md`],
    ['.config', 'kete', 'agents', `${AGENT}.md`],
    ['.copilot', 'agents', `${AGENT}.agent.md`],
  ]) assert.ok(exists(home, ...p), p.join('/'));
  assert.ok(!exists(home, '.agents', 'skills'), '--agent alone installs no skills');
});

test('never overwrites a user agent unless --force, and uninstall leaves it alone', () => {
  const home = tmp();
  const mine = path.join(home, '.claude', 'agents', `${AGENT}.md`);
  fs.mkdirSync(path.dirname(mine), { recursive: true });
  fs.writeFileSync(mine, 'my own agent');
  assert.match(run(['install', '--home', home, '--target', 'claude', '--agent', AGENT]), /skipped/);
  run(['uninstall', '--home', home, '--target', 'claude']);
  assert.strictEqual(fs.readFileSync(mine, 'utf8'), 'my own agent');
  run(['install', '--home', home, '--target', 'claude', '--agent', AGENT, '--force']);
  assert.notStrictEqual(fs.readFileSync(mine, 'utf8'), 'my own agent');
});

test('uninstall removes rendered agents and commands', () => {
  const home = tmp();
  run(['install', '--home', home, '--all-targets']);
  run(['uninstall', '--home', home, '--all-targets']);
  for (const dir of ['.claude/agents', '.claude/commands', '.codex/agents', '.gemini/commands', '.copilot/agents']) {
    const p = path.join(home, dir);
    assert.deepStrictEqual(fs.existsSync(p) ? fs.readdirSync(p) : [], [], dir);
  }
});

test('Gemini commands use {{args}} and quoted values survive YAML-hostile text', () => {
  const dir = path.join(tmp(), 'odd');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'AGENT.md'), '---\nname: odd\ndescription: x\n---\nBody with "quotes" and $ARGUMENTS\n');
  const agent = { ...loadAgent(dir), description: 'Has: a colon, a # hash and "quotes"', version: '1.0.0' };
  const md = render(agent, 'claude').content;
  const line = md.split('\n').find((l) => l.startsWith('description: '));
  assert.strictEqual(JSON.parse(line.slice('description: '.length)), agent.description);
  const cmd = render({ ...agent, kind: 'command' }, 'gemini').content;
  assert.match(cmd, /\{\{args\}\}/);
  assert.doesNotMatch(cmd, /\$ARGUMENTS/);
});

function makeItem(kind, name, frontmatter) {
  const root = tmp();
  if (kind === 'command') {
    const file = path.join(root, `${name}.md`);
    fs.writeFileSync(file, `---\n${frontmatter}\n---\nDo it: $ARGUMENTS\n`);
    return require('../scripts/lib/skills').loadCommand(file);
  }
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'evals'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'AGENT.md'), `---\n${frontmatter}\n---\nYou review code.\n`);
  fs.writeFileSync(path.join(dir, 'evals', 'triggers.json'), JSON.stringify({ should_trigger: ['aaaaaaaaaaa1', 'aaaaaaaaaaa2', 'aaaaaaaaaaa3'], should_not_trigger: ['bbbbbbbbbbb1', 'bbbbbbbbbbb2', 'bbbbbbbbbbb3'] }));
  return loadAgent(dir);
}

const META = 'license: MIT\nmetadata:\n  kete-loom/version: "1.0.0"\n  kete-loom/category: coding\n  kete-loom/risk: read-only';

test('lint: commands need no "Use when" or evals; agents validate tools', () => {
  const cmd = makeItem('command', 'ship', `name: ship\ndescription: Ship the current branch safely.\n${META}`);
  assert.deepStrictEqual(lintItem(cmd).errors, []);
  const desc = 'Reviews code for bugs in a separate context and reports verified findings by severity. Use when asked to review.';
  const good = makeItem('agent', 'rev', `name: rev\ndescription: ${desc}\n${META}\n  kete-loom/tools: "read, search"`);
  assert.deepStrictEqual(lintItem(good).errors, []);
  const bad = makeItem('agent', 'rev', `name: rev\ndescription: ${desc}\n${META}\n  kete-loom/tools: "read, Bash"`);
  assert.ok(lintItem(bad).errors.some((e) => e.includes('kete-loom/tools')));
});
