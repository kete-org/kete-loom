#!/usr/bin/env node
'use strict';

// kete-loom: install Kete Loom skills into any Agent Skills host.
// Zero dependencies; Node 18+.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { SKILLS_DIR, listSkills } = require('../scripts/lib/skills');
const { TARGETS, HOST_READS, resolveTarget } = require('../scripts/lib/targets');

const MARKER = '.kete-loom.json';
const pkg = require('../package.json');

function parseArgs(argv) {
  const opts = { _: [], scope: 'user', dryRun: false, force: false, link: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--target' || a === '-t') opts.targets = next().split(',').map((s) => s.trim());
    else if (a === '--all-targets') opts.targets = Object.keys(TARGETS);
    else if (a === '--skill' || a === '-s') opts.skills = next().split(',').map((s) => s.trim());
    else if (a === '--category' || a === '-c') opts.categories = next().split(',').map((s) => s.trim());
    else if (a === '--scope') opts.scope = next();
    else if (a === '--project' || a === '-p') opts.scope = 'project';
    else if (a === '--dir') opts.dir = path.resolve(next());
    else if (a === '--home') opts.home = path.resolve(next());
    else if (a === '--source') opts.source = path.resolve(next());
    else if (a === '--dry-run' || a === '-n') opts.dryRun = true;
    else if (a === '--force' || a === '-f') opts.force = true;
    else if (a === '--link') opts.link = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts._.unshift('help');
    else if (a === '--version' || a === '-v') opts._.unshift('version');
    else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else opts._.push(a);
  }
  if (!['user', 'project'].includes(opts.scope)) throw new Error('--scope must be user or project');
  return opts;
}

function help() {
  console.log(`kete-loom ${pkg.version} — install Kete Loom skills into any Agent Skills host

Usage
  kete-loom install   [options]   Copy skills into host skill folders
  kete-loom update    [options]   Same as install --force (refreshes kete-loom skills only)
  kete-loom uninstall [options]   Remove skills that kete-loom installed
  kete-loom list      [--json]    List available skills
  kete-loom doctor    [options]   Show what is installed where, and which hosts can see it

Options
  -t, --target <a,b>   Targets: ${Object.keys(TARGETS).join(', ')}
                       Default: agents,claude (covers Codex, OpenCode, Cursor,
                       Gemini CLI, Copilot, Kete Code and Claude Code)
      --all-targets    Install into every host-specific folder as well
  -p, --project        Install into the current repo instead of your home folder
      --scope <s>      user (default) or project
      --dir <path>     Install into a custom skills folder (any other agent)
  -s, --skill <a,b>    Only these skills
  -c, --category <a,b> Only these categories
      --link           Symlink instead of copy (for skill authors)
  -f, --force          Overwrite skills with the same name not installed by kete-loom
  -n, --dry-run        Show what would happen without changing anything

Examples
  npx @ketecode/loom install
  npx @ketecode/loom install --project --skill tdd-workflow,verification-loop
  npx @ketecode/loom install --target claude
  npx @ketecode/loom install --dir ~/.my-agent/skills
`);
}

function selectSkills(opts) {
  const all = listSkills(opts.source || SKILLS_DIR);
  let chosen = all;
  if (opts.skills) {
    const unknown = opts.skills.filter((s) => !all.some((k) => k.dir === s));
    if (unknown.length) throw new Error(`unknown skill(s): ${unknown.join(', ')}. Run "kete-loom list".`);
    chosen = chosen.filter((s) => opts.skills.includes(s.dir));
  }
  if (opts.categories) chosen = chosen.filter((s) => opts.categories.includes(s.category));
  return chosen;
}

function destinations(opts) {
  if (opts.dir) return [{ target: 'custom', dir: opts.dir }];
  const names = opts.targets || Object.keys(TARGETS).filter((t) => TARGETS[t].default);
  return names.map((t) => ({
    target: t,
    dir: resolveTarget(t, { scope: opts.scope, home: opts.home || os.homedir(), cwd: process.cwd() }),
  }));
}

function readMarker(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, MARKER), 'utf8'));
  } catch {
    return null;
  }
}

function isOurs(dir) {
  try {
    if (fs.lstatSync(dir).isSymbolicLink()) {
      return path.resolve(path.dirname(dir), fs.readlinkSync(dir)).startsWith(path.resolve(SKILLS_DIR));
    }
  } catch {
    return false;
  }
  return readMarker(dir) !== null;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'evals') continue; // evals are for this repo's CI, not for hosts
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else {
      fs.copyFileSync(s, d);
      if (fs.statSync(s).mode & 0o111) fs.chmodSync(d, 0o755);
    }
  }
}

function install(opts) {
  const skills = selectSkills(opts);
  if (!skills.length) throw new Error('no skills matched your filters');
  const results = [];
  for (const { target, dir } of destinations(opts)) {
    for (const skill of skills) {
      const dest = path.join(dir, skill.dir);
      const exists = fs.existsSync(dest) || isSymlink(dest);
      if (exists && !isOurs(dest) && !opts.force) {
        results.push({ target, skill: skill.dir, action: 'skipped', reason: 'a skill with this name exists and was not installed by kete-loom (use --force)', dest });
        continue;
      }
      if (!opts.dryRun) {
        if (exists) fs.rmSync(dest, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        if (opts.link) {
          fs.symlinkSync(skill.path, dest, 'dir');
        } else {
          copyDir(skill.path, dest);
          fs.writeFileSync(
            path.join(dest, MARKER),
            JSON.stringify({ source: 'kete-loom', skill: skill.dir, version: skill.version, installer: pkg.version, installedAt: new Date().toISOString() }, null, 2) + '\n'
          );
        }
      }
      results.push({ target, skill: skill.dir, action: exists ? 'updated' : 'installed', dest });
    }
  }
  report(results, opts);
  const missing = missingRequirements(skills);
  if (missing.length && !opts.json) {
    console.log(`\nNote: some skills expect tools that are not on your PATH:`);
    for (const m of missing) console.log(`  ${m.skill}: ${m.tools.join(', ')}`);
  }
  if (!opts.json && !opts.dryRun) console.log('\nRestart your agent (or start a new session) so it picks up the new skills.');
  return results;
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function uninstall(opts) {
  const names = opts.skills ? new Set(opts.skills) : null;
  const results = [];
  for (const { target, dir } of destinations(opts)) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      if (names && !names.has(entry)) continue;
      if (!isOurs(p)) continue;
      if (!opts.dryRun) fs.rmSync(p, { recursive: true, force: true });
      results.push({ target, skill: entry, action: 'removed', dest: p });
    }
  }
  report(results, opts);
  return results;
}

function report(results, opts) {
  if (opts.json) return console.log(JSON.stringify(results, null, 2));
  if (!results.length) return console.log('Nothing to do.');
  const prefix = opts.dryRun ? '[dry-run] ' : '';
  for (const r of results) {
    const where = r.dest.replace(os.homedir(), '~');
    console.log(`${prefix}${r.action.padEnd(9)} ${r.skill.padEnd(24)} ${where}${r.reason ? `  (${r.reason})` : ''}`);
  }
}

function onPath(tool) {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [tool], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function missingRequirements(skills) {
  const cache = {};
  return skills
    .map((s) => ({ skill: s.dir, tools: s.requires.filter((t) => (cache[t] ??= onPath(t)) === false) }))
    .filter((m) => m.tools.length);
}

function list(opts) {
  const skills = selectSkills(opts);
  if (opts.json) {
    return console.log(JSON.stringify(skills.map(({ dir, version, category, risk, description }) => ({ name: dir, version, category, risk, description })), null, 2));
  }
  for (const s of skills) {
    console.log(`${s.dir.padEnd(24)} v${(s.version || '?').padEnd(7)} ${String(s.category).padEnd(12)} ${s.risk}`);
  }
  console.log(`\n${skills.length} skill(s). Install with: npx @ketecode/loom install`);
}

function doctor(opts) {
  const home = opts.home || os.homedir();
  const rows = [];
  for (const scope of ['user', 'project']) {
    for (const t of Object.keys(TARGETS)) {
      const dir = resolveTarget(t, { scope, home, cwd: process.cwd() });
      const ours = fs.existsSync(dir) ? fs.readdirSync(dir).filter((e) => isOurs(path.join(dir, e))) : [];
      rows.push({ scope, target: t, dir, skills: ours });
    }
  }
  if (opts.json) return console.log(JSON.stringify(rows, null, 2));
  console.log('Installed kete-loom skills:\n');
  for (const r of rows.filter((x) => x.skills.length)) {
    console.log(`  [${r.scope}] ${r.target.padEnd(9)} ${r.dir.replace(os.homedir(), '~')}  (${r.skills.length})`);
  }
  if (!rows.some((r) => r.skills.length)) console.log('  none yet. Run: npx @ketecode/loom install');
  console.log('\nVisible to each host:');
  for (const [host, reads] of Object.entries(HOST_READS)) {
    const seen = new Set(rows.filter((r) => reads.includes(r.target)).flatMap((r) => r.skills));
    console.log(`  ${host.padEnd(15)} ${seen.size} skill(s)`);
  }
  const missing = missingRequirements(listSkills(SKILLS_DIR));
  if (missing.length) {
    console.log('\nMissing tools:');
    for (const m of missing) console.log(`  ${m.skill}: ${m.tools.join(', ')}`);
  }
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(`error: ${e.message}\nRun "kete-loom help" for usage.`);
    return 2;
  }
  const cmd = opts._[0] || 'help';
  try {
    switch (cmd) {
      case 'install':
        install(opts);
        break;
      case 'update':
        install({ ...opts, force: false });
        break;
      case 'uninstall':
      case 'remove':
        uninstall(opts);
        break;
      case 'list':
      case 'ls':
        list(opts);
        break;
      case 'doctor':
        doctor(opts);
        break;
      case 'version':
        console.log(pkg.version);
        break;
      case 'help':
        help();
        break;
      default:
        console.error(`unknown command "${cmd}". Run "kete-loom help".`);
        return 2;
    }
  } catch (e) {
    console.error(`error: ${e.message}`);
    return 1;
  }
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, parseArgs, install, uninstall, MARKER };
