'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'bin', 'kete-loom.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kl-mcp-'));
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf8'));

// A stand-in `claude` CLI: `mcp get` fails unless the server was added; add-json/remove update a JSON file.
function stubClaude(dir) {
  const db = path.join(dir, 'claude-servers.json');
  const bin = path.join(dir, 'claude-stub.js');
  fs.writeFileSync(bin, `#!/usr/bin/env node
const fs = require('fs'); const db = ${JSON.stringify(db)};
const s = fs.existsSync(db) ? JSON.parse(fs.readFileSync(db, 'utf8')) : {};
const [, sub, name, json] = process.argv.slice(2);
if (sub === 'get') process.exit(s[name] ? 0 : 1);
if (sub === 'add-json') s[name] = JSON.parse(json);
if (sub === 'remove') delete s[name];
fs.writeFileSync(db, JSON.stringify(s));
`);
  fs.chmodSync(bin, 0o755);
  return { bin, servers: () => (fs.existsSync(db) ? JSON.parse(fs.readFileSync(db, 'utf8')) : {}) };
}

function run(args, { cwd, claudeBin } = {}) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...(claudeBin ? { KETE_LOOM_CLAUDE_BIN: claudeBin } : {}) } });
}

test('a plain install never registers MCP servers', () => {
  const home = tmp();
  const stub = stubClaude(home);
  run(['install', '--home', home], { claudeBin: stub.bin });
  assert.deepStrictEqual(stub.servers(), {});
});

test('MCP servers register in each host format, keep your own servers, and uninstall cleanly', { skip: process.platform === 'win32' }, () => {
  const home = tmp();
  const stub = stubClaude(home);
  for (const d of ['.codex', '.gemini', '.cursor', '.copilot', '.config/opencode', '.config/kete']) fs.mkdirSync(path.join(home, d), { recursive: true });
  fs.writeFileSync(path.join(home, '.cursor', 'mcp.json'), JSON.stringify({ mcpServers: { github: { url: 'https://example.com/my-own-github' } } }));
  fs.writeFileSync(path.join(home, '.codex', 'config.toml'), 'model = "gpt-6"\n');
  const out = run(['install', '--home', home, '--mcp', 'github,playwright'], { claudeBin: stub.bin });

  assert.deepStrictEqual(stub.servers().github, { type: 'http', url: 'https://api.githubcopilot.com/mcp/' });
  assert.deepStrictEqual(stub.servers().playwright, { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'] });
  const toml = fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8');
  assert.match(toml, /^model = "gpt-6"/);
  assert.match(toml, /\[mcp_servers\.github\]\nurl = "https:\/\/api\.githubcopilot\.com\/mcp\/"/);
  assert.match(toml, /\[mcp_servers\.playwright\]\ncommand = "npx"\nargs = \["-y","@playwright\/mcp@latest"\]/);
  assert.deepStrictEqual(readJson(home, '.gemini', 'settings.json').mcpServers.github, { httpUrl: 'https://api.githubcopilot.com/mcp/' });
  const cursor = readJson(home, '.cursor', 'mcp.json').mcpServers;
  assert.strictEqual(cursor.github.url, 'https://example.com/my-own-github', 'your own server is kept');
  assert.match(out, /a server named github already exists there/);
  assert.deepStrictEqual(cursor.playwright, { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'] });
  const copilot = readJson(home, '.copilot', 'mcp-config.json').mcpServers;
  assert.ok(copilot.playwright && !copilot.github, 'Copilot gets local servers only');
  assert.deepStrictEqual(readJson(home, '.config', 'opencode', 'opencode.json').mcp.playwright, { type: 'local', command: ['npx', '-y', '@playwright/mcp@latest'], enabled: true });
  assert.deepStrictEqual(readJson(home, '.config', 'kete', 'kete.json').mcp.servers.github, { type: 'remote', url: 'https://api.githubcopilot.com/mcp/' });
  assert.match(out, /codex mcp login <server>/);
  assert.doesNotMatch(JSON.stringify(stub.servers()) + toml, /token|secret|Bearer/i, 'no secrets anywhere');

  run(['install', '--home', home, '--mcp', 'github,playwright'], { claudeBin: stub.bin }); // again: no duplicates
  assert.strictEqual(fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8').match(/\[mcp_servers\.github\]/g).length, 1);

  run(['uninstall', '--home', home, '--mcp', 'github,playwright'], { claudeBin: stub.bin });
  assert.deepStrictEqual(stub.servers(), {});
  assert.strictEqual(fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8'), 'model = "gpt-6"\n');
  assert.deepStrictEqual(readJson(home, '.cursor', 'mcp.json'), { mcpServers: { github: { url: 'https://example.com/my-own-github' } } }, 'only our entries removed');
  for (const f of ['.gemini/settings.json', '.copilot/mcp-config.json', '.config/opencode/opencode.json', '.config/kete/kete.json', '.kete-loom']) {
    const p = path.join(home, f);
    assert.ok(!fs.existsSync(p) || Object.keys(JSON.parse(fs.readFileSync(p, 'utf8'))).length === 0, f);
  }
});

test('a Claude Code server you already have is never replaced', { skip: process.platform === 'win32' }, () => {
  const home = tmp();
  const stub = stubClaude(home);
  execFileSync(stub.bin, ['mcp', 'add-json', 'github', '{"type":"http","url":"https://example.com/mine"}']);
  const out = run(['install', '--home', home, '--mcp', 'github'], { claudeBin: stub.bin });
  assert.match(out, /Claude Code already has a server named github/);
  run(['uninstall', '--home', home, '--mcp', 'github'], { claudeBin: stub.bin });
  assert.strictEqual(stub.servers().github.url, 'https://example.com/mine');
});

test('a missing claude CLI skips the server and prints the command to add it by hand', () => {
  const home = tmp();
  const out = run(['install', '--home', home, '--target', 'claude', '--mcp', 'context7'], { claudeBin: path.join(home, 'no-such-claude') });
  assert.match(out, process.platform === 'win32' ? /needs Claude Code's native installer \(claude\.exe\)/ : /the claude CLI isn't on your PATH/);
  assert.match(out, /claude mcp add-json context7 /);
});

test('Codex servers you defined yourself block ours instead of producing invalid TOML', () => {
  const home = tmp();
  fs.mkdirSync(path.join(home, '.codex'));
  const mine = '[mcp_servers.playwright]\ncommand = "my-playwright"\n';
  fs.writeFileSync(path.join(home, '.codex', 'config.toml'), mine);
  const out = run(['install', '--home', home, '--target', 'codex', '--mcp', 'playwright']);
  assert.match(out, /config\.toml already defines mcp_servers\.playwright/);
  assert.strictEqual(fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8'), mine);
});

test('project scope writes the shared project files, and MCP packs install through profiles', () => {
  const repo = tmp();
  run(['install', '--project', '--profile', 'mcp-web'], { cwd: repo });
  const servers = readJson(repo, '.mcp.json').mcpServers;
  assert.deepStrictEqual(Object.keys(servers).sort(), ['chrome-devtools', 'context7', 'exa', 'fetch', 'firecrawl', 'playwright']);
  assert.ok(!fs.existsSync(path.join(repo, '.claude', 'skills')), 'an MCP pack installs only its servers');
});

test('a --home install registers Claude Code servers under that home, never your own config', () => {
  const dir = tmp();
  const home = path.join(dir, 'home');
  fs.mkdirSync(home);
  const seen = path.join(dir, 'seen-home.txt');
  const bin = path.join(dir, 'claude-env.js');
  fs.writeFileSync(bin, `#!/usr/bin/env node
require('fs').appendFileSync(${JSON.stringify(seen)}, process.env.HOME + '\\n');
process.exit(process.argv[3] === 'get' ? 1 : 0);
`);
  fs.chmodSync(bin, 0o755);
  run(['install', '--home', home, '--target', 'claude', '--skill', 'tdd-workflow', '--mcp', 'context7'], { claudeBin: bin });
  const homes = fs.readFileSync(seen, 'utf8').trim().split('\n');
  assert.ok(homes.length >= 2, 'get, then add-json');
  assert.ok(homes.every((h) => h === home), `claude ran with HOME=${homes.join(', ')}`);
});
