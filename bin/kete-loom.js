#!/usr/bin/env node
'use strict';

// kete-loom: install Kete Loom skills, agents and commands into any Agent Skills host.
// Zero dependencies; Node 18+.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { SKILLS_DIR, HOOKS_DIR, listSkills, listAgents, listCommands, listHooks, listRules } = require('../scripts/lib/skills');
const { TARGETS, KINDS, HOST_READS, resolveTarget, detected } = require('../scripts/lib/targets');
const { MARKER_RE, render } = require('../scripts/lib/render');
const Hooks = require('../scripts/lib/hooks-install');
const { loadProfiles, resolveProfiles } = require('../scripts/lib/profiles');
const Rules = require('../scripts/lib/rules-install');
const Mcp = require('../scripts/lib/mcp-install');

const MARKER = '.kete-loom.json';
const pkg = require('../package.json');

const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function parseArgs(argv) {
  const opts = { _: [], scope: 'user', dryRun: false, force: false, link: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--target' || a === '-t') opts.targets = csv(next());
    else if (a === '--all-targets') opts.targets = Object.keys(TARGETS);
    else if (a === '--skill' || a === '-s') opts.skills = csv(next());
    else if (a === '--agent' || a === '-a') opts.agents = csv(next());
    else if (a === '--command') opts.commands = csv(next());
    else if (a === '--hook') opts.hookNames = csv(next());
    else if (a === '--rule' || a === '-r') opts.rules = csv(next());
    else if (a === '--mcp') opts.mcp = csv(next());
    else if (a === '--hooks') opts.withHooks = true;
    else if (a === '--profile' || a === '-P') opts.profiles = csv(next());
    else if (a === '--category' || a === '-c') opts.categories = csv(next());
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
  if (opts.targets) for (const t of opts.targets) if (!TARGETS[t]) throw new Error(`unknown target "${t}". Known: ${Object.keys(TARGETS).join(', ')}`);
  return opts;
}

function help() {
  console.log(`kete-loom ${pkg.version} — install Kete Loom skills, agents and commands into any Agent Skills host

Usage
  kete-loom install   [options]   Copy skills, agents and commands into host folders (hooks with --hooks)
  kete-loom update    [options]   Same as install (refreshes kete-loom items; never overwrites yours)
  kete-loom uninstall [options]   Remove items that kete-loom installed
  kete-loom list      [--json]    List available skills, agents, commands and hooks
  kete-loom profiles  [--json]    List install profiles
  kete-loom doctor    [options]   Show what is installed where, and which hosts can see it

Options
  -t, --target <a,b>   Targets: ${Object.keys(TARGETS).join(', ')}
                       Default: agents,claude (skills for every host; agents and
                       commands for Claude Code, Cursor and VS Code Copilot), plus
                       agents and commands for Codex, OpenCode, Gemini CLI and
                       Kete Code when they are installed
      --all-targets    Install into every host-specific folder as well
  -p, --project        Install into the current repo instead of your home folder
      --scope <s>      user (default) or project
      --dir <path>     Install skills into a custom skills folder (any other agent)
  -s, --skill <a,b>    Only these skills
  -a, --agent <a,b>    Only these agents
      --command <a,b>  Only these commands
  -r, --rule <a,b>     Only these rules
      --hook <a,b>     Only these hooks
                       (--skill, --agent, --command, --rule and --hook combine; with none,
                       all skills, agents, commands and rules are installed)
      --mcp <a,b>      Also register these MCP servers (see "kete-loom list"). Remote
                       servers sign in with OAuth; none need a token in a config file.
      --hooks          Also install every hook. Hooks run before each shell command and are
                       registered in each host's config, including Claude Code's and Gemini
                       CLI's settings.json (backed up first). User scope only.
  -P, --profile <a,b>  Install a preset: minimal, core, developer, security, ai, data,
                       business, full (see "kete-loom profiles"). core and the profiles
                       built on it add the language and framework packs this project uses.
                       Combines with --skill, --agent, --command and --hook.
  -c, --category <a,b> Only these categories
      --link           Symlink skills instead of copying (for skill authors)
  -f, --force          Overwrite items with the same name not installed by kete-loom
  -n, --dry-run        Show what would happen without changing anything

Examples
  npx @ketecode/loom install
  npx @ketecode/loom install --project --skill tdd-workflow,verification-loop
  npx @ketecode/loom install --target claude
  npx @ketecode/loom install --target codex --agent code-reviewer
  npx @ketecode/loom install --dir ~/.my-agent/skills
  npx @ketecode/loom install --hook block-dangerous-commands
  npx @ketecode/loom install --profile developer
`);
}

function catalog(opts) {
  return { skills: listSkills(opts.source || SKILLS_DIR), agents: listAgents(), commands: listCommands(), rules: listRules(), hooks: listHooks(), mcp: Mcp.listMcp() };
}

// Folds --profile into the explicit --skill/--agent/--command/--hook lists (or "everything" for full).
function applyProfiles(opts, all) {
  if (!opts.profiles || opts.profileApplied) return;
  const r = resolveProfiles(opts.profiles, { catalog: all, cwd: process.cwd() });
  opts.profileApplied = true;
  opts.detected = r.detected;
  if (r.all) {
    opts.withHooks = true;
    opts.mcp = all.mcp.map((m) => m.dir);
    return;
  }
  if (r.mcp.size) opts.mcp = [...new Set([...(opts.mcp || []), ...r.mcp])];
  const merge = (key, set) => (set.size || opts[key] ? (opts[key] = [...new Set([...(opts[key] || []), ...set])]) : undefined);
  merge('skills', r.skills);
  merge('agents', r.agents);
  merge('commands', r.commands);
  merge('rules', r.rules);
  if (r.hooks.size && opts.scope === 'project') opts.droppedHooks = [...r.hooks];
  else merge('hookNames', r.hooks);
  // A profile names its items, so an empty kind means "none of these", not "all of them".
  for (const k of KINDS) opts[k] ||= [];
}

// Returns { skills, agents, commands, hooks } after the profile and --skill/--agent/--command/--hook/--category filters.
function selectItems(opts) {
  const all = catalog(opts);
  applyProfiles(opts, all);
  const named = KINDS.some((k) => opts[k]) || Boolean(opts.hookNames) || Boolean(opts.mcp);
  const chosen = {};
  for (const kind of KINDS) {
    let items = all[kind];
    if (named) {
      const want = opts[kind] || [];
      const unknown = want.filter((n) => !items.some((i) => i.dir === n));
      if (unknown.length) throw new Error(`unknown ${kind.slice(0, -1)}(s): ${unknown.join(', ')}. Run "kete-loom list".`);
      items = items.filter((i) => want.includes(i.dir));
    }
    if (opts.categories) items = items.filter((i) => opts.categories.includes(i.category));
    chosen[kind] = items;
  }
  // Hooks are opt-in: only with --hooks or when named with --hook.
  const unknownHooks = (opts.hookNames || []).filter((n) => !all.hooks.some((h) => h.dir === n));
  if (unknownHooks.length) throw new Error(`unknown hook(s): ${unknownHooks.join(', ')}. Run "kete-loom list".`);
  chosen.hooks = opts.hookNames ? all.hooks.filter((h) => opts.hookNames.includes(h.dir)) : opts.withHooks ? all.hooks : [];
  if (opts.categories) chosen.hooks = chosen.hooks.filter((h) => opts.categories.includes(h.category));
  // MCP servers are opt-in too: only with --mcp or a profile that names them.
  const unknownMcp = (opts.mcp || []).filter((n) => !all.mcp.some((m) => m.dir === n));
  if (unknownMcp.length) throw new Error(`unknown MCP server(s): ${unknownMcp.join(', ')}. Run "kete-loom list".`);
  chosen.mcp = all.mcp.filter((m) => (opts.mcp || []).includes(m.dir));
  return chosen;
}

function destinations(opts) {
  if (opts.dir) return [{ target: 'custom', kind: 'skills', dir: opts.dir }];
  const where = { scope: opts.scope, home: opts.home || os.homedir(), cwd: process.cwd() };
  const picks = opts.targets
    ? opts.targets.map((t) => ({ target: t, kinds: KINDS }))
    : Object.keys(TARGETS)
        .filter((t) => TARGETS[t].default || detected(t, where))
        // Detected hosts read skills from .agents already; they only need their own agents, commands and
        // rules (Cursor and Copilot read agents from .claude too, so they only need rules).
        .map((t) => ({ target: t, kinds: TARGETS[t].default ? KINDS : TARGETS[t].auto ? ['agents', 'commands', 'rules'] : ['rules'] }));
  return picks.flatMap(({ target, kinds }) =>
    kinds.map((kind) => ({ target, kind, dir: resolveTarget(target, { ...where, kind }) })).filter((d) => d.dir)
  );
}

// Hosts to register hooks with: the --target list, or Claude Code plus every other hook host found.
function hookHosts(opts) {
  const where = { scope: 'user', home: opts.home || os.homedir(), cwd: process.cwd() };
  if (opts.targets) return opts.targets.filter((t) => TARGETS[t].hooks);
  return Hooks.HOOK_HOSTS.filter((t) => TARGETS[t].default || detected(t, where));
}

function installHooks(hooks, opts) {
  if (!hooks.length) return [];
  if (opts.scope === 'project') throw new Error('hooks install at user scope only; drop --project, or pass --skill/--agent/--command to choose what to install in the project');
  const home = opts.home || os.homedir();
  Hooks.installRuntime(hooks, { home, dryRun: opts.dryRun, sourceDir: HOOKS_DIR });
  const results = [];
  for (const target of hookHosts(opts)) {
    for (const hook of hooks) results.push({ target, kind: 'hook', name: hook.dir, ...Hooks.register(target, hook.dir, hook.event, { home, dryRun: opts.dryRun }) });
  }
  return results;
}

function uninstallHooks(opts, named) {
  if (named && !opts.hookNames) return [];
  const home = opts.home || os.homedir();
  const names = listHooks().map((h) => h.dir);
  const hosts = opts.targets ? opts.targets.filter((t) => TARGETS[t].hooks) : Hooks.HOOK_HOSTS;
  const results = [];
  for (const target of hosts) {
    for (const hook of opts.hookNames || [null]) {
      for (const r of Hooks.unregister(target, hook, { home, dryRun: opts.dryRun, names })) results.push({ target, kind: 'hook', action: 'removed', ...r });
    }
  }
  // The shared runtime goes once no host is told to call it any more.
  const left = Hooks.HOOK_HOSTS.flatMap((t) => Hooks.registered(t, { home, names }));
  if (!opts.dryRun) {
    for (const hook of opts.hookNames || names) if (!left.includes(hook)) fs.rmSync(path.join(Hooks.runtimeDir(home), hook), { recursive: true, force: true });
    if (!left.length) {
      fs.rmSync(Hooks.runtimeDir(home), { recursive: true, force: true });
      const parent = path.dirname(Hooks.runtimeDir(home));
      if (fs.existsSync(parent) && !fs.readdirSync(parent).length) fs.rmdirSync(parent);
    }
  }
  return results;
}

// Hosts that can't scope rules to paths get them through their instructions file (rules-install.js).
function linkedRuleHosts(opts) {
  if (opts.dir || opts.scope === 'project') return [];
  const where = { scope: 'user', home: opts.home || os.homedir(), cwd: process.cwd() };
  return Rules.RULE_HOSTS.filter((t) => (opts.targets ? opts.targets.includes(t) : detected(t, where)));
}

// Hosts to register MCP servers with: the --target list, or Claude Code plus every other host found.
function mcpHosts(opts) {
  const where = { scope: opts.scope, home: opts.home || os.homedir(), cwd: process.cwd() };
  const hosts = opts.targets ? opts.targets.filter((t) => Mcp.MCP_HOSTS.includes(t)) : Mcp.MCP_HOSTS.filter((t) => TARGETS[t].default || detected(t, where));
  // At project scope Copilot reads the .mcp.json written for Claude Code.
  return opts.scope === 'project' ? hosts.filter((t) => t !== 'copilot') : hosts;
}

function readMarker(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, MARKER), 'utf8'));
  } catch {
    return null;
  }
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// A symlink is ours when it points into our skills folder or the --source folder it was linked from.
function isOurs(dir, opts = {}) {
  try {
    if (fs.lstatSync(dir).isSymbolicLink()) {
      const target = path.resolve(path.dirname(dir), fs.readlinkSync(dir));
      return [SKILLS_DIR, opts.source].some((src) => src && isInside(target, path.resolve(src)));
    }
  } catch {
    return false;
  }
  return readMarker(dir) !== null;
}

// Agent and command files are ours when they carry the `# kete-loom name@version` comment.
function isOursFile(file) {
  try {
    if (!fs.lstatSync(file).isFile()) return false;
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(512);
    const n = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    return MARKER_RE.test(buf.toString('utf8', 0, n));
  } catch {
    return false;
  }
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
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

const NOT_OURS = 'an item with this name exists and was not installed by kete-loom (use --force)';

function installSkill(skill, dir, opts) {
  const dest = path.join(dir, skill.dir);
  const exists = fs.existsSync(dest) || isSymlink(dest);
  if (exists && !isOurs(dest, opts) && !opts.force) return { action: 'skipped', reason: NOT_OURS, dest };
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
  return { action: exists ? 'updated' : 'installed', dest };
}

// Agents and commands are rendered per host, so they are always written, never linked.
function installFile(item, dir, target, opts) {
  const out = render(item, target);
  if (!out) return null;
  const dest = path.join(dir, out.file);
  const exists = fs.existsSync(dest) || isSymlink(dest);
  if (exists && !isOursFile(dest) && !opts.force) return { action: 'skipped', reason: NOT_OURS, dest };
  if (!opts.dryRun) {
    fs.mkdirSync(dir, { recursive: true });
    if (exists) fs.rmSync(dest, { force: true });
    fs.writeFileSync(dest, out.content);
  }
  return { action: exists ? 'updated' : 'installed', dest };
}

function install(opts) {
  const selected = selectItems(opts);
  if (![...KINDS, 'hooks', 'mcp'].some((k) => selected[k].length)) throw new Error('nothing matched your filters');
  const results = [];
  for (const { target, kind, dir } of destinations(opts)) {
    for (const item of selected[kind]) {
      const r = kind === 'skills' ? installSkill(item, dir, opts) : installFile(item, dir, target, opts);
      if (r) results.push({ target, kind: item.kind, name: item.dir, ...r });
    }
  }
  // Hosts that can't scope by path load every rule they get on every turn, so they only get rules that
  // were chosen (--rule or a profile), never the whole library.
  if (selected.rules.length && opts.rules) for (const host of linkedRuleHosts(opts)) results.push(...Rules.installRules(host, selected.rules, { home: opts.home || os.homedir(), dryRun: opts.dryRun }));
  if (selected.mcp.length && !opts.dir) {
    const all = Mcp.listMcp();
    for (const host of mcpHosts(opts)) results.push(...Mcp.installMcp(host, selected.mcp, all, { scope: opts.scope, home: opts.home || os.homedir(), cwd: process.cwd(), dryRun: opts.dryRun }));
  }
  results.push(...installHooks(selected.hooks, opts));
  report(results, opts);
  if (!opts.json && opts.detected && opts.detected.length) console.log(`\nDetected in this project: ${opts.detected.join(', ')}.`);
  if (!opts.json && opts.droppedHooks) console.log(`\nSkipped the profile's hooks (${opts.droppedHooks.join(', ')}): hooks install for your user only. Run the install without --project to add them.`);
  const notes = [...new Set(results.map((r) => r.note).filter(Boolean))];
  if (notes.length && !opts.json) console.log(`\n${notes.join('\n')}`);
  const missing = missingRequirements(KINDS.flatMap((k) => selected[k]));
  if (missing.length && !opts.json) {
    console.log(`\nNote: some items expect tools that are not on your PATH:`);
    for (const m of missing) console.log(`  ${m.name}: ${m.tools.join(', ')}`);
  }
  if (!opts.json && !opts.dryRun) console.log('\nRestart your agent (or start a new session) so it picks up the new items.');
  return results;
}

// `code-reviewer.agent.md` -> `code-reviewer`, `python.instructions.md` -> `python`, `python.mdc` -> `python`
const itemName = (entry) => entry.replace(/(?:\.agent|\.instructions)?\.(?:md|mdc|toml)$/, '');

function uninstall(opts) {
  applyProfiles(opts, catalog(opts)); // `uninstall --profile x` removes only that profile's items
  const named = KINDS.some((k) => opts[k]) || Boolean(opts.hookNames);
  const results = [];
  for (const { target, kind, dir } of destinations(opts)) {
    if (named && !opts[kind]) continue;
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      const name = kind === 'skills' ? entry : itemName(entry);
      if (named && !opts[kind].includes(name)) continue;
      if (!(kind === 'skills' ? isOurs(p, opts) : isOursFile(p))) continue;
      if (!opts.dryRun) fs.rmSync(p, { recursive: true, force: true });
      results.push({ target, kind: kind.slice(0, -1), name, action: 'removed', dest: p });
    }
  }
  if (!named || opts.rules) for (const host of linkedRuleHosts(opts)) results.push(...Rules.uninstallRules(host, named ? opts.rules : null, { home: opts.home || os.homedir(), dryRun: opts.dryRun }));
  if (!opts.dir && (!named || opts.mcp)) {
    const all = Mcp.listMcp();
    const servers = opts.mcp ? all.filter((m) => opts.mcp.includes(m.dir)) : all;
    const hosts = opts.targets ? opts.targets.filter((t) => Mcp.MCP_HOSTS.includes(t)) : Mcp.MCP_HOSTS;
    for (const host of hosts) results.push(...Mcp.uninstallMcp(host, servers, all, { scope: opts.scope, home: opts.home || os.homedir(), cwd: process.cwd(), dryRun: opts.dryRun }));
  }
  results.push(...uninstallHooks(opts, named));
  report(results, opts);
  return results;
}

function report(results, opts) {
  if (opts.json) return console.log(JSON.stringify(results, null, 2));
  if (!results.length) return console.log('Nothing to do.');
  const prefix = opts.dryRun ? '[dry-run] ' : '';
  for (const r of results) {
    const where = r.dest.replace(os.homedir(), '~');
    console.log(`${prefix}${r.action.padEnd(9)} ${r.kind.padEnd(7)} ${r.name.padEnd(24)} ${where}${r.reason ? `  (${r.reason})` : ''}`);
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

function missingRequirements(items) {
  const cache = {};
  return items
    .map((s) => ({ name: s.dir, tools: s.requires.filter((t) => (cache[t] ??= onPath(t)) === false) }))
    .filter((m) => m.tools.length);
}

function list(opts) {
  const selected = selectItems(opts);
  const items = [...KINDS, 'hooks', 'mcp'].flatMap((k) => (k === 'hooks' || k === 'mcp' ? catalog(opts)[k] : selected[k]));
  if (opts.json) {
    return console.log(JSON.stringify(items.map(({ kind, dir, version, category, risk, description }) => ({ kind, name: dir, version, category, risk, description })), null, 2));
  }
  for (const s of items) {
    console.log(`${s.kind.padEnd(8)} ${s.dir.padEnd(24)} v${(s.version || '?').padEnd(7)} ${String(s.category).padEnd(12)} ${s.risk}`);
  }
  const count = (k) => `${selected[k].length} ${k.slice(0, -1)}(s)`;
  console.log(`\n${KINDS.map(count).join(', ')}, ${catalog(opts).hooks.length} hook(s), ${catalog(opts).mcp.length} MCP server(s). Install with: npx @ketecode/loom install (hooks: --hooks, MCP servers: --mcp <names>)`);
}

function profiles(opts) {
  const all = loadProfiles();
  const items = catalog(opts);
  const rows = Object.entries(all).map(([name, p]) => {
    const r = resolveProfiles([name], { catalog: items, cwd: process.cwd() });
    const count = r.all ? 'everything' : ['skills', 'agents', 'commands', 'hooks'].map((k) => `${r[k].size} ${k}`).join(', ');
    return { name, description: p.description, count, detects: Boolean(p.detect) || (p.extends || []).some((e) => all[e] && all[e].detect) };
  });
  if (opts.json) return console.log(JSON.stringify(rows, null, 2));
  for (const r of rows) console.log(`${r.name.padEnd(10)} ${r.description}\n${' '.repeat(11)}${r.count} in this folder${r.detects ? ' (includes packs detected here)' : ''}\n`);
  console.log('Install one with: npx @ketecode/loom install --profile <name>');
}

function doctor(opts) {
  const home = opts.home || os.homedir();
  const rows = [];
  for (const scope of ['user', 'project']) {
    for (const target of Object.keys(TARGETS)) {
      for (const kind of KINDS) {
        const dir = resolveTarget(target, { scope, home, cwd: process.cwd(), kind });
        if (!dir) continue;
        const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
        const ours = kind === 'skills'
          ? entries.filter((e) => isOurs(path.join(dir, e), opts))
          : entries.filter((e) => isOursFile(path.join(dir, e))).map(itemName);
        rows.push({ scope, target, kind, dir, items: ours });
      }
    }
  }
  if (opts.json) return console.log(JSON.stringify(rows, null, 2));
  console.log('Installed kete-loom items:\n');
  for (const r of rows.filter((x) => x.items.length)) {
    console.log(`  [${r.scope}] ${r.target.padEnd(9)} ${r.kind.padEnd(9)} ${r.dir.replace(os.homedir(), '~')}  (${r.items.length})`);
  }
  if (!rows.some((r) => r.items.length)) console.log('  none yet. Run: npx @ketecode/loom install');
  const linked = Rules.RULE_HOSTS.map((t) => ({ target: t, rules: Rules.installedNames(Rules.HOSTS[t].dir(home)) })).filter((r) => r.rules.length);
  if (linked.length) {
    console.log('\nRules loaded through instructions files:');
    for (const r of linked) console.log(`  ${r.target.padEnd(9)} ${r.rules.join(', ')}`);
  }
  const hookNames = listHooks().map((h) => h.dir);
  const hookRows = Hooks.HOOK_HOSTS.map((t) => ({ target: t, hooks: Hooks.registered(t, { home, names: hookNames }) })).filter((r) => r.hooks.length);
  if (hookRows.length) {
    console.log('\nHooks:');
    for (const r of hookRows) console.log(`  ${r.target.padEnd(9)} ${r.hooks.join(', ')}`);
    if (!fs.existsSync(path.join(Hooks.runtimeDir(home), 'run.js'))) console.log(`  ! the hook runtime is missing from ${Hooks.runtimeDir(home)}; run install --hooks again`);
  }
  console.log('\nSkills visible to each host:');
  for (const [host, reads] of Object.entries(HOST_READS)) {
    const seen = new Set(rows.filter((r) => r.kind === 'skills' && reads.includes(r.target)).flatMap((r) => r.items));
    console.log(`  ${host.padEnd(15)} ${seen.size} skill(s)`);
  }
  const all = catalog(opts);
  const missing = missingRequirements(KINDS.flatMap((k) => all[k]));
  if (missing.length) {
    console.log('\nMissing tools:');
    for (const m of missing) console.log(`  ${m.name}: ${m.tools.join(', ')}`);
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
      case 'profiles':
        profiles(opts);
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
