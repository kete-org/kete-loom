#!/usr/bin/env node
'use strict';

// Runs the installed scanners that apply to a repository, each with fixed flags and a timeout,
// and writes one SARIF file per tool plus run.json (versions, status, scope) to an output folder.
//   node run-scanners.js [repo-dir] [--out <dir>] [--tools a,b] [--rules <dir>] [--diff <base>]
//                        [--image <name>] [--timeout <seconds>]
// One tool failing never stops the others. Exit 0 once run.json is written; 2 on bad arguments.
// Reads the repository only; writes only inside --out (default: a new temporary folder).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { check } = require('./check-tools');

const SCAN_SECRETS = path.join(__dirname, '..', '..', 'security-review', 'scripts', 'scan-secrets.js');

// Each entry returns { cmd, args, cwd?, file? }: the SARIF lands in `file`, or on stdout when no file.
const COMMANDS = {
  opengrep: (c) => c.rules && { cmd: 'opengrep', args: ['scan', '--config', c.rules, '--sarif-output', c.file, '--timeout', '30', '--quiet', c.root] },
  semgrep: (c) => c.rules && { cmd: 'semgrep', args: ['scan', '--config', c.rules, '--sarif', '--output', c.file, '--metrics', 'off', '--timeout', '30', '--quiet', c.root] },
  eslint: (c) => ({ cmd: process.execPath, args: [path.join(c.root, 'node_modules', 'eslint', 'bin', 'eslint.js'), '--format', 'json', '--no-error-on-unmatched-pattern', '.'], cwd: c.root, convert: eslintToSarif }),
  // JSON, not SARIF: the sarif formatter is an optional extra that Homebrew's bandit lacks.
  bandit: () => ({ cmd: 'bandit', args: ['-r', '.', '-f', 'json', '-q', '-x', './node_modules,./.venv,./venv,./vendor,./build,./dist'], convert: banditToSarif }),
  gosec: (c) => ({ cmd: 'gosec', args: ['-fmt', 'sarif', '-out', c.file, '-no-fail', '-quiet', './...'], cwd: c.root }),
  gitleaks: (c) => ({ cmd: 'gitleaks', args: ['git', '--report-format', 'sarif', '--report-path', c.file, '--redact', '--exit-code', '0', '--no-banner', ...(c.diff ? ['--log-opts', `${c.diff}..HEAD`] : []), c.root] }),
  'osv-scanner': (c) => ({ cmd: 'osv-scanner', args: ['scan', 'source', '-r', '--format', 'sarif', '--output', c.file, c.root] }),
  checkov: (c) => ({ cmd: 'checkov', args: ['-d', c.root, '-o', 'sarif', '--output-file-path', c.dir, '--soft-fail', '--quiet', '--compact', '--skip-download'], output: path.join(c.dir, 'results_sarif.sarif') }),
  trivy: (c) => ({ cmd: 'trivy', args: ['config', '--format', 'sarif', '--output', c.file, '--exit-code', '0', '--quiet', c.root] }),
  'trivy-image': (c) => c.image && { cmd: 'trivy', args: ['image', '--format', 'sarif', '--output', c.file, '--exit-code', '0', '--quiet', c.image] },
  // With no files hadolint reads stdin and would hang until the timeout.
  hadolint: (c) => c.dockerfiles.length > 0 && { cmd: 'hadolint', args: ['--format', 'sarif', '--no-fail', ...c.dockerfiles], cwd: c.root },
  zizmor: (c) => ({ cmd: 'zizmor', args: ['--format', 'sarif', '--offline', '--no-progress', path.join(c.root, '.github', 'workflows')] }),
  'scan-secrets': () => ({ cmd: process.execPath, args: [SCAN_SECRETS, '--all'], convert: scanSecretsToSarif }),
};

const sarif = (name, version, results) => ({
  $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
  version: '2.1.0',
  runs: [{ tool: { driver: { name, version: version || undefined } }, results }],
});

const at = (file, line) => [{ physicalLocation: { artifactLocation: { uri: file }, region: { startLine: line || 1 } } }];

function eslintToSarif(stdout, root, version) {
  const results = [];
  for (const f of JSON.parse(stdout)) {
    for (const m of f.messages) {
      // The project's own style rules are not security findings.
      if (!m.ruleId || !m.ruleId.startsWith('security/')) continue;
      results.push({ ruleId: m.ruleId, level: m.severity === 2 ? 'error' : 'warning', message: { text: m.message }, locations: at(path.relative(root, f.filePath), m.line) });
    }
  }
  return sarif('eslint', version, results);
}

const BANDIT_LEVEL = { HIGH: 'error', MEDIUM: 'warning', LOW: 'note' };

function banditToSarif(stdout, root, version) {
  const data = JSON.parse(stdout);
  const results = data.results.map((r) => ({
    ruleId: `${r.test_id}:${r.test_name}`,
    level: BANDIT_LEVEL[r.issue_severity] || 'warning',
    // B105-B107 quote the hard-coded value itself; keep only its first 4 characters.
    message: { text: r.issue_text.replace(/'([^']{5,})'/g, (_, v) => `'${v.slice(0, 4)}… (${v.length} chars)'`) },
    locations: at(path.relative(root, path.resolve(root, r.filename)), r.line_number),
  }));
  const report = sarif('bandit', version, results);
  const errors = (data.errors || []).map((e) => ({ level: 'error', message: { text: `${e.filename}: ${e.reason}` } }));
  if (errors.length) report.runs[0].invocations = [{ executionSuccessful: true, toolExecutionNotifications: errors }];
  return report;
}

// scan-secrets.js prints "file:line  rule  masked" lines; the values are already masked.
function scanSecretsToSarif(stdout) {
  const results = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(/^(.+?):(\d+) {2}(.+?) {2}(.+)$/);
    if (m) results.push({ ruleId: m[3], level: 'error', message: { text: `${m[3]}: ${m[4]}` }, locations: at(m[1], Number(m[2])) });
  }
  return sarif('scan-secrets', null, results);
}

function parseArgs(argv) {
  const o = { root: '.', out: null, tools: null, rules: null, diff: null, image: null, timeout: 600 };
  const takes = { '--out': 'out', '--tools': 'tools', '--rules': 'rules', '--diff': 'diff', '--image': 'image', '--timeout': 'timeout' };
  let positional = 0;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (takes[a]) {
      if (argv[i + 1] === undefined) throw new Error(`${a} needs a value`);
      o[takes[a]] = argv[++i];
    } else if (a.startsWith('-') || positional++) throw new Error(`unknown argument: ${a}`);
    else o.root = a;
  }
  o.timeout = Number(o.timeout);
  if (!Number.isInteger(o.timeout) || o.timeout < 1) throw new Error('--timeout must be a whole number of seconds');
  // A base ref goes to git as an argument; still refuse anything that could read as an option.
  if (o.diff && !/^[\w./~^@{}-]+$/.test(o.diff)) throw new Error('--diff must be a git ref');
  o.root = path.resolve(o.root);
  if (!fs.existsSync(o.root)) throw new Error(`no such folder: ${o.root}`);
  if (o.rules) o.rules = path.resolve(o.rules);
  if (o.tools) o.tools = o.tools.split(',').map((s) => s.trim()).filter(Boolean);
  return o;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

// Picks the tools to run: an explicit --tools list, else every installed tool that applies,
// using a fallback only when its primary is missing.
function plan(o, inventory) {
  const byName = Object.fromEntries(inventory.tools.map((t) => [t.name, t]));
  const plans = [];
  const skip = (name, reason) => plans.push({ name, status: 'skipped', reason });
  const wanted = o.tools || inventory.tools.filter((t) => t.applies && !(t.fallbackFor && byName[t.fallbackFor].installed)).map((t) => t.name);
  if (!o.tools && o.image) wanted.push('trivy-image');
  for (const name of wanted) {
    const t = byName[name === 'trivy-image' ? 'trivy' : name];
    if (!COMMANDS[name]) skip(name, 'unknown tool');
    else if (name === 'scan-secrets') plans.push({ name, version: null });
    else if (!t.installed) skip(name, name === 'gitleaks' ? 'not installed; ran scan-secrets.js instead (current files only, no history)' : 'not installed');
    else plans.push({ name, version: t.version });
    if (name === 'gitleaks' && !t.installed && !wanted.includes('scan-secrets')) plans.push({ name: 'scan-secrets', version: null });
  }
  for (const t of inventory.tools) {
    if (wanted.includes(t.name)) continue;
    if (t.reason) skip(t.name, t.reason);
    else if (t.applies && !t.installed && !(t.fallbackFor && byName[t.fallbackFor].installed)) skip(t.name, 'not installed');
  }
  return plans;
}

const SAST_RULES = new Set(['opengrep', 'semgrep']);

const errorsIn = (report) => report.runs.flatMap((run) => (run.invocations || []).flatMap((inv) => (inv.toolExecutionNotifications || []).filter((n) => n.level === 'error').map((n) => ((n.message || {}).text || '').split('\n')[0].slice(0, 200))));

function runOne(p, ctx, timeoutMs) {
  const dir = path.join(ctx.out, `${p.name}.work`);
  const file = path.join(ctx.out, `${p.name}.sarif`);
  const spec = COMMANDS[p.name]({ ...ctx, file, dir });
  if (!spec) return { ...p, status: 'skipped', reason: p.name.endsWith('grep') || p.name === 'semgrep' ? 'no local rule set: pass --rules <dir> (see references/tools.md)' : 'nothing to scan' };
  if (spec.output) fs.mkdirSync(dir, { recursive: true });
  const started = Date.now();
  const r = spawnSync(spec.cmd, spec.args, { cwd: spec.cwd || ctx.root, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024 });
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const tail = (s) => (s || '').trim().split('\n').slice(-5).join('\n');
  if (r.error && r.error.code === 'ETIMEDOUT') return { ...p, status: 'timeout', seconds, reason: `killed after ${timeoutMs / 1000}s` };
  if (r.error) return { ...p, status: 'failed', seconds, reason: r.error.message };
  try {
    let report;
    if (spec.convert) report = spec.convert(r.stdout, ctx.root, p.version);
    else if (spec.output || fs.existsSync(file)) report = JSON.parse(fs.readFileSync(spec.output || file, 'utf8'));
    else report = JSON.parse(r.stdout);
    if (!Array.isArray(report.runs)) throw new Error('output has no SARIF runs');
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    const results = report.runs.reduce((n, run) => n + (run.results || []).length, 0);
    // A rejected rule config still exits 0 with valid, empty SARIF; zero results must not read as clean.
    if (SAST_RULES.has(p.name) && !report.runs.some((run) => (((run.tool || {}).driver || {}).rules || []).length)) {
      return { ...p, status: 'failed', seconds, exitCode: r.status, results, sarif: file, reason: `no rules loaded from ${ctx.rules}${errorsIn(report).length ? `: ${errorsIn(report)[0]}` : ''}` };
    }
    const errors = errorsIn(report);
    if (errors.length) return { ...p, status: 'partial', seconds, exitCode: r.status, results, sarif: file, reason: `${errors.length} tool error(s), first: ${errors[0]}` };
    return { ...p, status: 'ok', seconds, exitCode: r.status, results, sarif: file };
  } catch (e) {
    return { ...p, status: 'failed', seconds, exitCode: r.status, reason: `${e.message}${tail(r.stderr) ? `; stderr: ${tail(r.stderr)}` : ''}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function main(argv) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    console.error(`${e.message}\nusage: run-scanners.js [repo-dir] [--out <dir>] [--tools a,b] [--rules <dir>] [--diff <base>] [--image <name>] [--timeout <seconds>]`);
    return 2;
  }
  const out = path.resolve(o.out || fs.mkdtempSync(path.join(os.tmpdir(), 'code-scanning-')));
  fs.mkdirSync(out, { recursive: true });
  const inventory = check(o.root);
  const scope = { root: o.root, mode: o.diff ? 'diff' : 'full', base: o.diff, files: null };
  if (o.diff) {
    try {
      scope.files = git(o.root, ['diff', '--name-only', '--relative', `${o.diff}...HEAD`]).split('\n').filter(Boolean);
    } catch (e) {
      console.error(`cannot diff against ${o.diff}: ${(e.stderr || e.message).toString().trim()}`);
      return 2;
    }
  }
  let dockerfiles = [];
  try {
    dockerfiles = git(o.root, ['ls-files']).split('\n').filter((f) => /(^|\/)(Dockerfile|Containerfile)([.-][^/]*)?$/.test(f));
  } catch {}
  const ctx = { root: o.root, out, rules: o.rules, diff: o.diff, image: o.image, dockerfiles };
  const tools = plan(o, inventory).map((p) => {
    if (p.status === 'skipped') return p;
    process.stderr.write(`running ${p.name}... `);
    const r = runOne(p, ctx, o.timeout * 1000);
    process.stderr.write(`${r.status}${r.results !== undefined ? ` (${r.results} results)` : ''}\n`);
    return r;
  });
  const run = { startedAt: new Date().toISOString(), scope, rules: o.rules, tools };
  fs.writeFileSync(path.join(out, 'run.json'), JSON.stringify(run, null, 2));
  for (const t of tools) console.log(`${t.name.padEnd(13)} ${t.status.padEnd(8)} ${t.version || ''} ${t.results !== undefined ? `${t.results} results` : t.reason || ''}`.trimEnd());
  console.log(`\nSARIF and run.json in ${out}\nNext: node ${path.join(__dirname, 'normalise.js')} ${out}`);
  return 0;
}

module.exports = { parseArgs, plan, eslintToSarif, banditToSarif, scanSecretsToSarif };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
