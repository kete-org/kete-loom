'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { respond } = require('../hooks/run.js');

const CLI = path.join(__dirname, '..', 'bin', 'kete-loom.js');
const HOOKS = path.join(__dirname, '..', 'hooks');
const HOOK = 'block-dangerous-commands';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kl-hooks-'));
const run = (args) => execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// One payload per host, as each host documents it.
const PAYLOADS = {
  claude: (c) => ({ tool_name: 'Bash', tool_input: { command: c }, cwd: '/tmp' }),
  codex: (c) => ({ tool_name: 'Bash', tool_input: { command: c }, cwd: '/tmp' }),
  gemini: (c) => ({ tool_name: 'run_shell_command', tool_input: { command: c }, cwd: '/tmp' }),
  kete: (c) => ({ event: 'PreToolUse', tool: 'shell', tool_input: { command: c }, cwd: '/tmp' }),
  cursor: (c) => ({ command: c, cwd: '/tmp' }),
  copilot: (c) => ({ toolName: 'bash', toolArgs: JSON.stringify({ command: c }), cwd: '/tmp' }),
  opencode: (c) => ({ command: c, cwd: '/tmp' }),
};

test('runner blocks with exit 2 and allows with exit 0 on every host', () => {
  for (const [host, payload] of Object.entries(PAYLOADS)) {
    const blocked = respond(host, HOOK, JSON.stringify(payload('rm -rf ~')), HOOKS);
    assert.strictEqual(blocked.code, 2, host);
    assert.match(blocked.stderr, /block-dangerous-commands/, host);
    assert.strictEqual(respond(host, HOOK, JSON.stringify(payload('npm test')), HOOKS).code, 0, host);
  }
  assert.strictEqual(JSON.parse(respond('cursor', HOOK, JSON.stringify(PAYLOADS.cursor('npm test')), HOOKS).stdout).permission, 'allow');
  assert.strictEqual(JSON.parse(respond('copilot', HOOK, JSON.stringify(PAYLOADS.copilot('rm -rf ~')), HOOKS).stdout).permissionDecision, 'deny');
});

test('runner fails open on bad input, unknown hooks and non-shell tools', () => {
  assert.strictEqual(respond('claude', HOOK, '{not json', HOOKS).code, 0);
  assert.strictEqual(respond('claude', 'no-such-hook', JSON.stringify(PAYLOADS.claude('rm -rf ~')), HOOKS).code, 0);
  assert.strictEqual(respond('claude', '../../etc', '{}', HOOKS).code, 0);
  assert.strictEqual(JSON.parse(respond('cursor', HOOK, 'garbage', HOOKS).stdout).permission, 'allow', 'Cursor needs explicit allow JSON');
  assert.strictEqual(respond('kete', HOOK, JSON.stringify({ tool: 'read', tool_input: { command: 'rm -rf ~' } }), HOOKS).code, 0);
  assert.strictEqual(respond('copilot', HOOK, JSON.stringify({ toolName: 'view', toolArgs: { command: 'rm -rf ~' } }), HOOKS).code, 0);
});

test('plain install registers no hooks; --hook does, keeping existing settings', () => {
  const home = tmp();
  const settings = path.join(home, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(settings), { recursive: true });
  const original = { permissions: { allow: ['Bash(npm test)'] }, hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: '/bin/mine' }] }] } };
  fs.writeFileSync(settings, JSON.stringify(original));
  run(['install', '--home', home]);
  assert.deepStrictEqual(readJson(settings), original, 'install without --hooks leaves settings alone');

  run(['install', '--home', home, '--hook', HOOK]);
  run(['install', '--home', home, '--hook', HOOK]); // twice: must not duplicate
  const after = readJson(settings);
  assert.deepStrictEqual(after.permissions, original.permissions);
  const commands = after.hooks.PreToolUse.flatMap((g) => g.hooks.map((h) => h.command));
  assert.strictEqual(commands.filter((c) => c.includes('.kete-loom')).length, 1);
  assert.ok(commands.includes('/bin/mine'));
  assert.ok(fs.existsSync(`${settings}.kete-loom-backup`));

  // The registered command really blocks.
  const cmd = commands.find((c) => c.includes('.kete-loom'));
  const r = spawnSync(cmd, { shell: true, input: JSON.stringify(PAYLOADS.claude('rm -rf /')), encoding: 'utf8' });
  assert.strictEqual(r.status, 2, r.stderr);

  run(['uninstall', '--home', home, '--hook', HOOK]);
  assert.deepStrictEqual(readJson(settings), original, 'uninstall restores the original settings');
  assert.ok(!fs.existsSync(path.join(home, '.kete-loom')));
});

test('detected hosts get hooks in their own format', () => {
  const home = tmp();
  for (const d of ['.codex', '.gemini', '.cursor', '.copilot', '.config/opencode', '.config/kete']) fs.mkdirSync(path.join(home, d), { recursive: true });
  run(['install', '--home', home, '--hook', HOOK]);
  assert.strictEqual(readJson(path.join(home, '.codex', 'hooks.json')).hooks.PreToolUse[0].matcher, 'Bash');
  const gemini = readJson(path.join(home, '.gemini', 'settings.json')).hooks.BeforeTool[0];
  assert.strictEqual(gemini.matcher, 'run_shell_command');
  assert.strictEqual(gemini.hooks[0].timeout, 10000, 'Gemini timeouts are milliseconds');
  assert.strictEqual(readJson(path.join(home, '.config', 'kete', 'kete.json')).kete.hooks.PreToolUse[0].match, 'shell');
  assert.strictEqual(readJson(path.join(home, '.cursor', 'hooks.json')).version, 1);
  assert.ok(readJson(path.join(home, '.copilot', 'hooks', `kete-loom-${HOOK}.json`)).hooks.preToolUse[0].bash.includes('run.js'));
  assert.ok(fs.readFileSync(path.join(home, '.config', 'opencode', 'plugins', `kete-loom-${HOOK}.js`), 'utf8').includes('tool.execute.before'));
  run(['uninstall', '--home', home]);
  for (const f of ['.codex/hooks.json', '.cursor/hooks.json', `.copilot/hooks/kete-loom-${HOOK}.json`, `.config/opencode/plugins/kete-loom-${HOOK}.js`]) {
    assert.ok(!fs.existsSync(path.join(home, f)), f);
  }
  assert.deepStrictEqual(readJson(path.join(home, '.config', 'kete', 'kete.json')), {});
});

test('never rewrites a settings file with comments, and refuses project-scope hooks', () => {
  const home = tmp();
  const gemini = path.join(home, '.gemini', 'settings.json');
  fs.mkdirSync(path.dirname(gemini), { recursive: true });
  const text = '{\n  // mine\n  "theme": "dark"\n}\n';
  fs.writeFileSync(gemini, text);
  const out = run(['install', '--home', home, '--hook', HOOK]);
  assert.match(out, /has comments/);
  assert.match(out, /run_shell_command/, 'prints the snippet to paste');
  assert.strictEqual(fs.readFileSync(gemini, 'utf8'), text);
  assert.throws(() => execFileSync(process.execPath, [CLI, 'install', '--project', '--hook', HOOK], { cwd: tmp(), stdio: 'pipe' }), /user scope only/);
});
