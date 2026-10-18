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

test('stop-gate sends the agent back in each host\'s dialect; stop never blocks', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'gate'));
  fs.writeFileSync(path.join(dir, 'gate', 'hook.js'), "exports.check = (e) => ({ block: !e.again, reason: 'fix lint' })");
  const gate = (host, payload, event = 'stop-gate') => respond(host, 'gate', JSON.stringify(payload), dir, event);
  for (const host of ['claude', 'codex', 'gemini']) {
    const r = gate(host, { session_id: 's1', cwd: '/tmp' });
    assert.strictEqual(r.code, 2, host);
    assert.match(r.stderr, /fix lint/, host);
    assert.strictEqual(gate(host, { stop_hook_active: true }).code, 0, `${host} lets a continued turn end`);
  }
  assert.deepStrictEqual(JSON.parse(gate('cursor', { status: 'completed', loop_count: 0 }).stdout), { followup_message: 'fix lint' });
  assert.strictEqual(gate('cursor', { loop_count: 1 }).stdout, '');
  const copilot = gate('copilot', {});
  assert.strictEqual(copilot.code, 0, 'Copilot treats exit 2 as a warning, so it gets JSON');
  assert.deepStrictEqual(JSON.parse(copilot.stdout), { decision: 'block', reason: 'fix lint' });
  assert.strictEqual(gate('claude', {}, 'stop').code, 0, 'a stop hook only notifies');
});

test('stop-gate hooks skip hosts whose stop hook cannot continue; stop hooks reach Kete Code', () => {
  const home = tmp();
  const out = run(['install', '--home', home, '--all-targets', '--hook', 'verify-before-stop,notify-on-stop', '--json']);
  const claude = readJson(path.join(home, '.claude', 'settings.json'));
  assert.strictEqual(claude.hooks.Stop.length, 2);
  assert.ok(!('matcher' in claude.hooks.Stop[0]));
  assert.strictEqual(readJson(path.join(home, '.gemini', 'settings.json')).hooks.AfterAgent.length, 2);
  const kete = readJson(path.join(home, '.config', 'kete', 'kete.json')).kete.hooks.Stop;
  assert.strictEqual(kete.length, 1);
  assert.match(kete[0].command, /notify-on-stop stop$/);
  assert.match(out, /kete has no stop-gate hook/);
  assert.ok(fs.existsSync(path.join(home, '.copilot', 'hooks', 'kete-loom-verify-before-stop.json')));
  run(['uninstall', '--home', home, '--all-targets', '--hook', 'verify-before-stop,notify-on-stop']);
  assert.ok(!('hooks' in readJson(path.join(home, '.claude', 'settings.json'))));
});

const gitRepo = (files) => {
  const dir = tmp();
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), c);
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
};

test('verify-before-stop runs the project lint only when code changed, and once in a row', () => {
  const { check } = require('../hooks/verify-before-stop/hook.js');
  const failing = gitRepo({ 'package.json': JSON.stringify({ scripts: { lint: 'node -e "console.log(\'bad semi\');process.exit(1)"' } }), 'a.js': 'x' });
  const v = check({ cwd: failing });
  assert.strictEqual(v.block, true);
  assert.match(v.reason, /npm run lint[\s\S]*bad semi/);
  assert.strictEqual(check({ cwd: failing, again: true }).block, false);
  const passing = gitRepo({ 'package.json': JSON.stringify({ scripts: { lint: 'node -e ""' } }), 'a.js': 'x' });
  assert.strictEqual(check({ cwd: passing }).block, false);
  const docsOnly = gitRepo({ 'README.md': 'x' });
  assert.strictEqual(check({ cwd: docsOnly }).block, false);
  assert.strictEqual(check({ cwd: tmp() }).block, false, 'not a git repository');
});

test('capture-lessons asks once per session; read-before-edit refuses only the first edit', () => {
  const prev = process.env.KETE_LOOM_STATE_DIR;
  process.env.KETE_LOOM_STATE_DIR = tmp();
  try {
    const lessons = require('../hooks/capture-lessons/hook.js');
    const repo = gitRepo({ 'a.js': 'x' });
    assert.strictEqual(lessons.check({ cwd: repo, session: 's1' }).block, true);
    assert.strictEqual(lessons.check({ cwd: repo, session: 's1' }).block, false);
    assert.strictEqual(lessons.check({ cwd: repo, session: 's2', again: true }).block, false);
    assert.strictEqual(lessons.check({ cwd: gitRepo({}), session: 's3' }).block, false, 'nothing changed');

    const rbe = require('../hooks/read-before-edit/hook.js');
    const ev = (session) => ({ cwd: repo, session, files: [{ path: 'a.js' }] });
    assert.match(rbe.check(ev('s1')).reason, /read the whole file/);
    assert.strictEqual(rbe.check(ev('s1')).block, false);
    assert.strictEqual(rbe.check(ev('s2')).block, true, 'a new session starts over');
    assert.strictEqual(rbe.check({ cwd: repo, session: 's1', files: [{ path: 'new.js' }] }).block, false);
  } finally {
    if (prev === undefined) delete process.env.KETE_LOOM_STATE_DIR;
    else process.env.KETE_LOOM_STATE_DIR = prev;
  }
});

test('notify-on-stop picks the platform notifier and never blocks', () => {
  const { notifier } = require('../hooks/notify-on-stop/hook.js');
  assert.strictEqual(notifier('darwin')('T', 'b "q"')[0], 'osascript');
  assert.strictEqual(notifier('win32'), null);
  assert.strictEqual(notifier('linux', { PATH: '' }), null);
});

test('doctor --fix restores an out-of-date hook runtime and drops hooks the catalog no longer has', () => {
  const home = tmp();
  run(['install', '--home', home, '--hook', HOOK]);
  const runtime = path.join(home, '.kete-loom', 'hooks', HOOK, 'hook.js');
  fs.writeFileSync(runtime, '// edited');
  const settings = path.join(home, '.claude', 'settings.json');
  const data = readJson(settings);
  data.hooks.PreToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: data.hooks.PreToolUse[0].hooks[0].command.replace(HOOK, 'retired-hook') }] });
  fs.writeFileSync(settings, JSON.stringify(data));
  const report = run(['doctor', '--home', home]);
  assert.match(report, /out of date: block-dangerous-commands/);
  assert.match(report, /retired-hook/);
  assert.match(run(['doctor', '--home', home, '--fix']), /Repaired:/);
  assert.strictEqual(fs.readFileSync(runtime, 'utf8'), fs.readFileSync(path.join(HOOKS, HOOK, 'hook.js'), 'utf8'));
  assert.doesNotMatch(fs.readFileSync(settings, 'utf8'), /retired-hook/);
  assert.match(fs.readFileSync(settings, 'utf8'), /block-dangerous-commands/);
  assert.doesNotMatch(run(['doctor', '--home', home]), /Problems:/);
});

test('block-unfinished-stubs flags only lines the change adds, and only once in a row', () => {
  const { check } = require('../hooks/block-unfinished-stubs/hook.js');
  const repo = gitRepo({ 'a.js': '// TODO: old one\nexport const a = 1\n' });
  execFileSync('git', ['add', '-A'], { cwd: repo });
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], { cwd: repo });
  assert.strictEqual(check({ cwd: repo }).block, false, 'existing TODOs are not the agent\'s');
  fs.writeFileSync(path.join(repo, 'a.js'), '// TODO: old one\nexport const a = 1\nexport function b() { throw new Error("not implemented") }\n');
  fs.writeFileSync(path.join(repo, 'a.test.js'), 'it.only("works", () => {})\n');
  fs.writeFileSync(path.join(repo, 'NOTES.md'), 'TODO: write docs\n');
  const v = check({ cwd: repo });
  assert.strictEqual(v.block, true);
  assert.match(v.reason, /a\.js: a "not implemented" stub/);
  assert.match(v.reason, /a\.test\.js: a focused test/);
  assert.doesNotMatch(v.reason, /NOTES\.md|old one/);
  assert.strictEqual(check({ cwd: repo, again: true }).block, false);
});

test('load-session-context includes the head of .planning/STATE.md', () => {
  const { check } = require('../hooks/load-session-context/hook.js');
  const repo = gitRepo({});
  fs.mkdirSync(path.join(repo, '.planning'));
  fs.writeFileSync(path.join(repo, '.planning', 'STATE.md'), '# State\nPhase 2 of 4: checkout\n' + 'x\n'.repeat(100));
  const { context } = check({ cwd: repo });
  assert.match(context, /Project state from \.planning\/STATE\.md[\s\S]*Phase 2 of 4: checkout/);
  assert.ok(context.split('\n').filter((l) => l === 'x').length <= 30);
});
