'use strict';

// `kete-loom audit`: a deterministic readiness scorecard for working on a project with coding agents.
// Same input, same result: it reads files and runs read-only git commands, never a model.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { detect } = require('./profiles');
const { inventory } = require('./inventory');

const CODEX_MAX_BYTES = 32768;
const DETECT_CHECKS = path.join(__dirname, '..', '..', 'skills', 'verification-loop', 'scripts', 'detect-checks.js');

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return null;
  }
};

function audit({ cwd = process.cwd(), home, catalog }) {
  const checks = [];
  const add = (id, status, title, detail, fix) => checks.push({ id, status, title, detail, ...(fix ? { fix } : {}) });
  const root = git(cwd, ['rev-parse', '--show-toplevel']) || cwd;
  const has = (f) => fs.existsSync(path.join(root, f));

  if (git(cwd, ['rev-parse', '--is-inside-work-tree']) === 'true') add('git', 'pass', 'Git repository', 'Agents can see history, diffs and status.');
  else add('git', 'warn', 'Git repository', 'This folder is not a git repository, so agents can\'t diff, review or roll back their changes.', 'git init');

  const instr = ['AGENTS.md', 'CLAUDE.md'].filter(has);
  if (!instr.length) add('instructions', 'fail', 'Agent instructions', 'No AGENTS.md or CLAUDE.md: every agent starts without your build commands, conventions or boundaries.', 'Write AGENTS.md (the /project-init command or the codebase-onboarding skill can draft it)');
  else {
    const big = instr.filter((f) => fs.statSync(path.join(root, f)).size > CODEX_MAX_BYTES);
    if (big.length) add('instructions', 'warn', 'Agent instructions', `${big.join(', ')} is over 32 KiB; Codex stops reading there and every host pays for it on every turn.`, 'Move detail into skills, rules or linked docs');
    else add('instructions', 'pass', 'Agent instructions', `${instr.join(' and ')} present.`);
  }

  const found = detect(root);
  const installedRows = [...inventory({ scope: 'user', home, cwd: root }), ...inventory({ scope: 'project', home, cwd: root })];
  const installedNames = new Set(installedRows.map((r) => r.name));
  if (!found.length) add('packs', 'pass', 'Packs for this stack', 'No language or framework detected that Kete Loom has a pack for.');
  else {
    const want = [...new Set(found.flatMap((d) => [...(d.skills || []), ...(d.agents || []), ...(d.rules || [])]))].filter((n) => ['skills', 'agents', 'rules'].some((k) => (catalog[k] || []).some((i) => i.dir === n)));
    const missing = want.filter((n) => !installedNames.has(n));
    const stack = found.map((d) => d.what).join(', ');
    if (!missing.length) add('packs', 'pass', 'Packs for this stack', `Installed for ${stack}.`);
    else add('packs', missing.length === want.length ? 'fail' : 'warn', 'Packs for this stack', `Detected ${stack}; missing ${missing.length} of ${want.length}: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}.`, 'npx @ketecode/loom install --profile core   (run it in this project)');
  }

  let commands = [];
  try {
    commands = JSON.parse(execFileSync(process.execPath, [DETECT_CHECKS, root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 })).checks || [];
  } catch (e) {
    // detect-checks exits 3 when it finds nothing; its JSON is still on stdout.
    try {
      commands = JSON.parse(e.stdout || '{}').checks || [];
    } catch {
      commands = [];
    }
  }
  const kinds = new Set(commands.map((c) => c.kind));
  if (!kinds.has('test')) add('verification', 'fail', 'Verification commands', 'No test command found, so agents can\'t prove a change works.', 'Add a test script (package.json "test", Makefile "test", pytest config…) and name it in AGENTS.md');
  else if (!kinds.has('lint') && !kinds.has('typecheck')) add('verification', 'warn', 'Verification commands', `Tests found (${commands.find((c) => c.kind === 'test').command}), but no lint or type-check command.`, 'Add a lint or type-check script so agents catch mistakes before tests');
  else add('verification', 'pass', 'Verification commands', commands.map((c) => c.command).join(', '));

  const ci = ['.github/workflows', '.gitlab-ci.yml', '.circleci', 'azure-pipelines.yml', 'bitbucket-pipelines.yml', 'Jenkinsfile', '.buildkite'].filter(has);
  if (ci.length) add('ci', 'pass', 'Continuous integration', `${ci.join(', ')}.`);
  else add('ci', 'warn', 'Continuous integration', 'No CI configuration found, so nothing re-checks what agents push.', 'Add CI that runs the same build, lint and test commands (the github-actions-ci skill can set it up)');

  const hooks = new Set(installedRows.filter((r) => r.kind === 'hooks').map((r) => r.name));
  const safety = ['block-dangerous-commands', 'guard-secrets'];
  const missingHooks = safety.filter((h) => !hooks.has(h));
  if (!missingHooks.length) add('hooks', 'pass', 'Safety hooks', `${safety.join(' and ')} are installed.`);
  else add('hooks', 'warn', 'Safety hooks', `Not installed: ${missingHooks.join(', ')}. Nothing stops an agent from running rm -rf ~ or writing a key into a file.`, `npx @ketecode/loom install --hook ${missingHooks.join(',')}`);

  const tracked = (git(root, ['ls-files']) || '').split('\n').filter((f) => /(^|\/)\.env(\.[^/]*)?$/.test(f) && !/\.(example|sample|template|dist|defaults)$/.test(f));
  const ignore = has('.gitignore') ? fs.readFileSync(path.join(root, '.gitignore'), 'utf8') : '';
  if (tracked.length) add('secrets', 'fail', 'Secrets', `Committed environment files: ${tracked.join(', ')}. Anything in them is in git history.`, 'git rm --cached the files, add .env* to .gitignore, and rotate every secret they held');
  else if (!/^\s*\/?\.env\*?\s*$|^\s*\.\*\s*$|^\s*\*\.env\s*$/m.test(ignore)) add('secrets', 'warn', 'Secrets', '.gitignore does not ignore .env files, so the next one created can be committed by accident.', 'Add .env and .env.* to .gitignore (keep .env.example tracked)');
  else add('secrets', 'pass', 'Secrets', 'No environment files committed, and .gitignore covers them.');

  if (has('package.json')) {
    const locks = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb', 'npm-shrinkwrap.json'].filter(has);
    if (locks.length) add('lockfile', 'pass', 'Dependency lockfile', locks.join(', '));
    else add('lockfile', 'warn', 'Dependency lockfile', 'package.json without a lockfile: agents and CI can resolve different dependency versions.', 'Run your package manager\'s install and commit the lockfile');
  }

  const weight = { pass: 1, warn: 0.5, fail: 0 };
  const score = Math.round((checks.reduce((n, c) => n + weight[c.status], 0) / checks.length) * 100);
  const order = { fail: 0, warn: 1, pass: 2 };
  return { root, score, checks: checks.sort((a, b) => order[a.status] - order[b.status]) };
}

module.exports = { audit };
