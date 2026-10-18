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
  opencode: (c) => ({ tool: 'bash', args: { command: c }, cwd: '/tmp' }),
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

// pre-edit: one write of `.env` per host, in that host's payload shape.
const EDIT_PAYLOADS = {
  claude: (p, c) => ({ tool_name: 'Write', tool_input: { file_path: p, content: c }, cwd: '/r' }),
  gemini: (p, c) => ({ tool_name: 'write_file', tool_input: { file_path: p, content: c }, cwd: '/r' }),
  codex: (p, c) => ({ tool_name: 'apply_patch', tool_input: { command: `*** Begin Patch\n*** Add File: ${p}\n+${c}\n*** End Patch` }, cwd: '/r' }),
  kete: (p, c) => ({ event: 'PreToolUse', tool: 'write', tool_input: { path: p, content: c }, cwd: '/r' }),
  copilot: (p, c) => ({ toolName: 'create', toolArgs: JSON.stringify({ path: p, file_text: c }), cwd: '/r' }),
  opencode: (p, c) => ({ tool: 'write', args: { filePath: p, content: c }, cwd: '/r' }),
};

test('pre-edit hooks block protected files and secrets on every host that supports them', () => {
  const key = `sk_live_${'a'.repeat(40)}`;
  for (const [host, payload] of Object.entries(EDIT_PAYLOADS)) {
    assert.strictEqual(respond(host, 'protect-files', JSON.stringify(payload('.env', 'X=1')), HOOKS, 'pre-edit').code, 2, `${host} protect-files`);
    assert.strictEqual(respond(host, 'protect-files', JSON.stringify(payload('src/app.ts', 'x')), HOOKS, 'pre-edit').code, 0, `${host} allows normal files`);
    const r = respond(host, 'guard-secrets', JSON.stringify(payload('src/pay.ts', `const k = "${key}"`)), HOOKS, 'pre-edit');
    assert.strictEqual(r.code, 2, `${host} guard-secrets`);
    assert.doesNotMatch(r.stderr, new RegExp(key), 'the secret is masked in the reason');
  }
  // Claude Edit sends only the replacement text.
  assert.strictEqual(respond('claude', 'guard-secrets', JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: '/r/a.ts', old_string: 'x', new_string: `k = "${key}"` } }), HOOKS, 'pre-edit').code, 2);
});

test('hosts that send every tool to one event only run the matching hooks', () => {
  // Copilot and Kete Code fire their pre-tool event for every tool: a shell hook ignores edits and vice versa.
  assert.strictEqual(respond('copilot', 'protect-files', JSON.stringify({ toolName: 'bash', toolArgs: { command: 'cat .env' } }), HOOKS, 'pre-edit').code, 0);
  assert.strictEqual(respond('copilot', HOOK, JSON.stringify({ toolName: 'create', toolArgs: { path: 'a', file_text: 'rm -rf ~' } }), HOOKS, 'pre-shell').code, 0);
  assert.strictEqual(respond('kete', 'protect-files', JSON.stringify({ tool: 'shell', tool_input: { command: 'x' } }), HOOKS, 'pre-edit').code, 0);
});

test('session-start context is returned in each host format', () => {
  const repo = tmp();
  const git = (...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: repo, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'x');
  git('add', '.');
  git('commit', '-qm', 'init');
  fs.mkdirSync(path.join(repo, '.handoff'));
  fs.writeFileSync(path.join(repo, '.handoff', 'main.md'), '# Handoff\nNext: wire the webhook\n');
  fs.writeFileSync(path.join(repo, 'b.txt'), 'uncommitted');
  const out = (host, payload) => JSON.parse(respond(host, 'load-session-context', JSON.stringify(payload), HOOKS, 'session-start').stdout);
  const claude = out('claude', { hook_event_name: 'SessionStart', cwd: repo }).hookSpecificOutput;
  assert.strictEqual(claude.hookEventName, 'SessionStart');
  assert.match(claude.additionalContext, /Branch: main, \d+ uncommitted/);
  assert.match(claude.additionalContext, /wire the webhook/);
  assert.match(out('kete', { event: 'SessionStart', cwd: repo }).context, /wire the webhook/);
  assert.match(out('cursor', { workspace_roots: [repo] }).additional_context, /Branch: main/);
  assert.match(out('copilot', { cwd: repo }).additionalContext, /Branch: main/);
  assert.strictEqual(respond('claude', 'load-session-context', JSON.stringify({ cwd: tmp() }), HOOKS, 'session-start').stdout, '', 'nothing outside a git repo');
});

test('format-on-edit runs the project formatter on edited files only', { skip: process.platform === 'win32' }, () => {
  const proj = tmp();
  const bin = path.join(proj, 'node_modules', '.bin');
  fs.mkdirSync(bin, { recursive: true });
  // A stub prettier that marks the file it was asked to format.
  fs.writeFileSync(path.join(bin, 'prettier'), '#!/bin/sh\nfor a; do f="$a"; done\necho "// formatted" >> "$f"\n');
  fs.chmodSync(path.join(bin, 'prettier'), 0o755);
  fs.writeFileSync(path.join(proj, 'a.ts'), 'const x=1\n');
  fs.writeFileSync(path.join(proj, 'notes.txt'), 'plain\n');
  const outside = path.join(tmp(), 'b.ts');
  fs.writeFileSync(outside, 'const y=1\n');
  for (const p of ['a.ts', 'notes.txt', outside]) {
    const r = respond('claude', 'format-on-edit', JSON.stringify({ tool_name: 'Write', tool_input: { file_path: path.isAbsolute(p) ? p : path.join(proj, p) }, cwd: proj }), HOOKS, 'post-edit');
    assert.strictEqual(r.code, 0);
  }
  assert.match(fs.readFileSync(path.join(proj, 'a.ts'), 'utf8'), /formatted/);
  assert.strictEqual(fs.readFileSync(path.join(proj, 'notes.txt'), 'utf8'), 'plain\n', 'no formatter for .txt');
  assert.strictEqual(fs.readFileSync(outside, 'utf8'), 'const y=1\n', 'files outside the project are left alone');
});

test('guard-secrets uses the same rules as the security-review scanner', () => {
  const block = (f) => {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    return t.slice(t.indexOf('const RULES = ['), t.indexOf('];', t.indexOf('const RULES = [')));
  };
  assert.strictEqual(block('hooks/guard-secrets/hook.js'), block('skills/security-review/scripts/scan-secrets.js'));
});

test('--hooks registers every hook where its event is supported, and uninstall removes them all', () => {
  const home = tmp();
  for (const d of ['.codex', '.gemini', '.cursor', '.copilot', '.config/opencode', '.config/kete']) fs.mkdirSync(path.join(home, d), { recursive: true });
  const out = run(['install', '--home', home, '--hooks', '--skill', 'tdd-workflow']);
  assert.match(out, /cursor has no pre-edit hook/);
  assert.match(out, /opencode has no session-start hook/);
  const claude = readJson(path.join(home, '.claude', 'settings.json')).hooks;
  assert.deepStrictEqual(Object.keys(claude).sort(), ['PostToolUse', 'PreToolUse', 'SessionStart']);
  assert.ok(claude.PreToolUse.some((g) => g.matcher === 'Edit|Write|NotebookEdit'));
  assert.deepStrictEqual(Object.keys(readJson(path.join(home, '.config', 'kete', 'kete.json')).kete.hooks).sort(), ['PostToolUse', 'PreToolUse', 'SessionStart']);
  assert.deepStrictEqual(Object.keys(readJson(path.join(home, '.cursor', 'hooks.json')).hooks).sort(), ['afterFileEdit', 'beforeShellExecution', 'sessionStart']);
  run(['uninstall', '--home', home]);
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'settings.json')) || !readJson(path.join(home, '.claude', 'settings.json')).hooks);
  assert.deepStrictEqual(fs.readdirSync(path.join(home, '.copilot', 'hooks')), []);
  assert.ok(!fs.existsSync(path.join(home, '.kete-loom')));
});
