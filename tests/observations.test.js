'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const Obs = require('../scripts/lib/observations');

const CLI = path.join(__dirname, '..', 'bin', 'kete-loom.js');
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kl-obs-')), 'observations');
const base = (over = {}) => ({ slug: 'skip-red-step', title: 'Agent skipped the failing test under deadline pressure', kind: 'improve', type: 'open-source', skill: ['tdd-workflow'], siblings_checked: 'testing rule: applies, added', ...over });
const day = (s) => new Date(`${s}T12:00:00Z`);

test('ids come from max(active, archive, floor) + 1 and never repeat, even after archival empties the log', () => {
  const dir = tmp();
  assert.strictEqual(Obs.create(dir, base()).id, 1);
  assert.strictEqual(Obs.create(dir, base({ slug: 'other', title: 'Completely different finding about commits', skill: ['git-workflow'] })).id, 2);
  Obs.setStatus(dir, 1, { status: 'actioned', resolution: 'rule added' }, { now: day('2026-01-01') });
  Obs.setStatus(dir, 2, { status: 'declined', resolution: 'not general' }, { now: day('2026-01-01') });
  const r = Obs.create(dir, base({ slug: 'third', title: 'A third separate finding about reviews', skill: ['code-reviewer'] }), { now: day('2026-01-02') });
  assert.deepStrictEqual(r.archived.sort(), ['0001-skip-red-step.md', '0002-other.md'], 'archival rides inside create');
  assert.strictEqual(r.id, 3);
  fs.rmSync(path.join(dir, 'log', 'archive', '0001-skip-red-step.md'));
  fs.rmSync(path.join(dir, 'log', 'archive', '0002-other.md'));
  fs.rmSync(r.file);
  assert.strictEqual(Obs.create(dir, base({ slug: 'fourth', title: 'Fourth finding after the log was emptied', skill: ['x'] })).id, 4, '.id-floor keeps the counter');
});

test('resolved entries stay until the day after they were resolved', () => {
  const dir = tmp();
  Obs.create(dir, base());
  Obs.setStatus(dir, 1, { status: 'actioned', resolution: 'done' }, { now: day('2026-03-10') });
  assert.deepStrictEqual(Obs.create(dir, base({ slug: 'b', title: 'Unrelated second finding entirely', skill: ['y'] }), { now: day('2026-03-10') }).archived, []);
  assert.deepStrictEqual(Obs.create(dir, base({ slug: 'c', title: 'Unrelated third finding entirely here', skill: ['z'] }), { now: day('2026-03-11') }).archived, ['0001-skip-red-step.md']);
});

test('create refuses a restatement, blank sibling checks, bad slugs and violations without a rule', () => {
  const dir = tmp();
  Obs.create(dir, base());
  assert.throws(() => Obs.create(dir, base({ slug: 'again', title: 'Agent skipped failing test under deadline pressure again' })), (e) => e.code === 'SIMILAR' && e.similar[0].id === 1);
  assert.strictEqual(Obs.create(dir, base({ slug: 'again', title: 'Agent skipped failing test under deadline pressure again' }), { force: true }).id, 2);
  assert.throws(() => Obs.create(dir, base({ slug: 'x', siblings_checked: ' ' })), /siblings-checked is required/);
  assert.throws(() => Obs.create(dir, base({ slug: 'Bad Slug' })), /kebab-case/);
  assert.throws(() => Obs.create(dir, base({ slug: 'v', kind: 'violation' })), /names the rule/);
  assert.throws(() => Obs.create(dir, base({ slug: 'n', skill: [], title: 'No target at all here' })), /name a target/);
});

test('a create never overwrites, and frontmatter with colons and quotes survives a round trip', () => {
  const dir = tmp();
  const r = Obs.create(dir, base({ title: 'Rule "A": colons: everywhere', area: 'step 2: plan', issue: 'It said: "go"' }));
  const o = Obs.parse(fs.readFileSync(r.file, 'utf8'));
  assert.strictEqual(o.data.title, 'Rule "A": colons: everywhere');
  assert.strictEqual(o.data.area, 'step 2: plan');
  assert.deepStrictEqual(o.data.skill, ['tdd-workflow']);
  assert.deepStrictEqual(o.suspect, []);
  fs.writeFileSync(path.join(dir, 'log', '0002-squatter.md'), 'mine');
  fs.writeFileSync(path.join(dir, 'log', 'archive', '.id-floor'), '1\n');
  // The next id (2) is taken by a hand-written file: nextId moves past it rather than overwriting.
  const next = Obs.create(dir, base({ slug: 'next', title: 'An unrelated finding about the floor', skill: ['q'] }));
  assert.strictEqual(next.id, 3);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'log', '0002-squatter.md'), 'utf8'), 'mine');
});

test('setStatus edits only the status fields and keeps the body byte for byte', () => {
  const dir = tmp();
  const r = Obs.create(dir, base({ issue: 'Line one\n\nLine two with `code`' }));
  const before = fs.readFileSync(r.file, 'utf8');
  Obs.setStatus(dir, 1, { status: 'parked', parked_until: 'the hook runner supports post-read on Codex' });
  const after = fs.readFileSync(r.file, 'utf8');
  assert.strictEqual(after.split('---\n').slice(2).join('---\n'), before.split('---\n').slice(2).join('---\n'));
  assert.match(after, /^status: parked$/m);
  assert.match(after, /^parked_until: "the hook runner supports post-read on Codex"$/m);
  assert.throws(() => Obs.setStatus(dir, 1, { status: 'parked' }), /parked needs --until/);
  assert.throws(() => Obs.setStatus(dir, 1, { status: 'declined' }), /needs --resolution/);
  assert.throws(() => Obs.setStatus(dir, 99, { status: 'open' }), (e) => e.code === 'NOT_FOUND');
});

test('scan reads frontmatter only, flags a second violation of one rule, and never reports a broken log as empty', () => {
  const dir = tmp();
  const rule = 'tdd-workflow: write the failing test first';
  Obs.create(dir, base({ kind: 'violation', rule }));
  let s = Obs.scan(dir, { now: day('2026-05-01') });
  assert.deepStrictEqual(s.barriers, []);
  Obs.create(dir, base({ slug: 'two', kind: 'violation', rule, title: 'Red step dropped once a deadline was mentioned' }));
  s = Obs.scan(dir, { now: day('2026-05-01') });
  assert.deepStrictEqual(s.barriers, [{ rule, ids: [1, 2] }]);
  assert.strictEqual(s.reviewDue, true, 'never reviewed, with open entries');
  Obs.markReviewed(dir, { now: day('2026-05-01') });
  assert.strictEqual(Obs.scan(dir, { now: day('2026-05-05') }).reviewDue, false);
  assert.strictEqual(Obs.scan(dir, { now: day('2026-05-08') }).reviewDue, true, 'seven days later');
  assert.strictEqual(s.byTarget['tdd-workflow'], 2);
  fs.writeFileSync(path.join(dir, 'log', 'notes.md'), 'stray');
  assert.match(Obs.scan(dir).broken[0], /without an NNNN- id prefix/);
  const d2 = tmp();
  Obs.init(d2);
  fs.writeFileSync(path.join(d2, 'log', '0001-raw.md'), 'no frontmatter at all');
  const b = Obs.scan(d2);
  assert.match(b.broken[0], /no frontmatter could be read/);
  assert.strictEqual(b.open, 1, 'a file without a status still counts as open');
});

test('the CLI creates, refuses a restatement with exit 3, scans, lists and resolves', () => {
  const env = { ...process.env, KETE_LOOM_OBSERVATIONS_DIR: tmp() };
  const cli = (...a) => spawnSync(process.execPath, [CLI, 'observe', ...a], { env, encoding: 'utf8' });
  const made = cli('new', 'skip-red', '--title', 'Agent skipped the red step under deadline', '--skill', 'tdd-workflow', '--siblings-checked', 'testing rule: added');
  assert.strictEqual(made.status, 0, made.stderr);
  assert.match(made.stdout, /created observation 0001/);
  const dupe = cli('new', 'skip-red-2', '--title', 'Agent skipped the red step under deadline again', '--skill', 'tdd-workflow', '--siblings-checked', 'none');
  assert.strictEqual(dupe.status, 3);
  assert.match(dupe.stderr, /observation 0001: Agent skipped the red step/);
  assert.match(cli('scan').stdout, /1 open, 0 parked, 0 archived; last review: never — review due/);
  assert.strictEqual(JSON.parse(cli('list', '--json').stdout)[0].id, 1);
  assert.strictEqual(cli('resolve', '1', '--status', 'actioned').status, 2);
  assert.strictEqual(cli('resolve', '1', '--status', 'actioned', '--resolution', 'rule reworded in tdd-workflow step 1').status, 0);
  assert.strictEqual(cli('show', '7').status, 4);
  assert.match(cli('help').stdout, /durable log/);
});

test('load-session-context reports open observations, a due review and a rule broken twice', () => {
  const dir = tmp();
  const prev = process.env.KETE_LOOM_OBSERVATIONS_DIR;
  const prevState = process.env.KETE_LOOM_STATE_DIR;
  process.env.KETE_LOOM_OBSERVATIONS_DIR = dir;
  process.env.KETE_LOOM_STATE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-obs-state-')); // capture-lessons records the session here
  try {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-obs-repo-'));
    execFileSync('git', ['init', '-q'], { cwd: repo });
    const { check } = require('../hooks/load-session-context/hook.js');
    assert.doesNotMatch(check({ cwd: repo }).context, /Skill observations/, 'no log, no line');
    const rule = 'common: run the checks before claiming done';
    Obs.create(dir, base({ kind: 'violation', rule, skill: ['verification-loop'] }));
    Obs.create(dir, base({ slug: 'b', kind: 'violation', rule, skill: ['verification-loop'], title: 'Claimed tests passed without running them' }));
    const ctx = check({ cwd: repo }).context;
    assert.match(ctx, /Skill observations: 2 open, review due \(last: never\)/);
    assert.match(ctx, /Rules broken twice with no fix: "common: run the checks before claiming done"/);
    const { check: lessons } = require('../hooks/capture-lessons/hook.js');
    fs.writeFileSync(path.join(repo, 'a.js'), 'x');
    assert.match(lessons({ cwd: repo, session: 's-obs' }).reason, /kete-loom observe new/);
  } finally {
    if (prev === undefined) delete process.env.KETE_LOOM_OBSERVATIONS_DIR;
    else process.env.KETE_LOOM_OBSERVATIONS_DIR = prev;
    if (prevState === undefined) delete process.env.KETE_LOOM_STATE_DIR;
    else process.env.KETE_LOOM_STATE_DIR = prevState;
  }
});

test('doctor reports the observation log under --home', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-obs-home-'));
  Obs.create(path.join(home, '.kete-loom', 'observations'), base());
  const env = { ...process.env };
  delete env.KETE_LOOM_OBSERVATIONS_DIR;
  const out = execFileSync(process.execPath, [CLI, 'doctor', '--home', home], { env, encoding: 'utf8' });
  assert.match(out, /Skill observations \(.*\): 1 open, last review never, review due/);
});

test('review fixes: quoted # and commas survive, $ in text is literal, reopen un-archives, bad entries never crash', () => {
  const dir = tmp();
  const r = Obs.create(dir, base({ title: 'Fix issue #12 in lint', skill: ['x', 'a, b'], rule: 'AGENTS.md: say "no" #1', kind: 'violation' }));
  const o = Obs.parse(fs.readFileSync(r.file, 'utf8'));
  assert.strictEqual(o.data.title, 'Fix issue #12 in lint');
  assert.deepStrictEqual(o.data.skill, ['x', 'a, b']);
  assert.strictEqual(o.data.rule, 'AGENTS.md: say "no" #1');
  assert.deepStrictEqual(o.suspect, []);
  Obs.setStatus(dir, 1, { status: 'actioned', resolution: "cost $& and $' done" }, { now: day('2026-02-01') });
  assert.match(fs.readFileSync(r.file, 'utf8'), /^resolution: "cost \$& and \$' done"$/m);
  Obs.create(dir, base({ slug: 'later', title: 'Something else entirely about commits', skill: ['git'] }), { now: day('2026-02-02') });
  assert.ok(fs.existsSync(path.join(dir, 'log', 'archive', path.basename(r.file))), 'swept');
  Obs.setStatus(dir, 1, { status: 'open' });
  assert.ok(fs.existsSync(r.file), 'reopened entry is back in log/');
  assert.ok(Obs.scan(dir).items.some((i) => i.id === 1));
  fs.mkdirSync(path.join(dir, 'log', '0099-a-directory.md'));
  const s = Obs.scan(dir);
  assert.ok(s.suspect.some((x) => x.id === 99 && /unreadable/.test(x.keys[0])));
  const prev = process.env.KETE_LOOM_OBSERVATIONS_DIR;
  process.env.KETE_LOOM_OBSERVATIONS_DIR = dir;
  try {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-obs-repo-'));
    execFileSync('git', ['init', '-q'], { cwd: repo });
    delete require.cache[require.resolve('../hooks/load-session-context/hook.js')];
    assert.match(require('../hooks/load-session-context/hook.js').check({ cwd: repo }).context, /Skill observations: \d+ open/);
  } finally {
    if (prev === undefined) delete process.env.KETE_LOOM_OBSERVATIONS_DIR;
    else process.env.KETE_LOOM_OBSERVATIONS_DIR = prev;
  }
});

test('restatement detection: overlapping titles about different things pass, identical non-Latin titles are caught', () => {
  const dir = tmp();
  Obs.create(dir, base({ title: 'Skill does not mention cargo nextest', skill: ['rust-testing'] }));
  assert.strictEqual(Obs.create(dir, base({ slug: 'deny', title: 'Skill does not mention cargo deny', skill: ['rust-testing'] })).id, 2);
  Obs.create(dir, base({ slug: 'ru', title: 'Агент пропустил тест перед коммитом', skill: ['tdd-workflow'] }));
  assert.throws(() => Obs.create(dir, base({ slug: 'ru2', title: 'Агент пропустил тест перед коммитом', skill: ['tdd-workflow'] })), (e) => e.code === 'SIMILAR');
});

test('two creates at once never share an id', () => {
  const dir = tmp();
  Obs.init(dir);
  fs.writeFileSync(path.join(dir, 'log', 'archive', '.id-claims', '1'), ''); // another process claimed 1 and hasn't written yet
  assert.strictEqual(Obs.create(dir, base()).id, 2);
});

test('observe rejects unknown options and a flag whose value is missing', () => {
  const env = { ...process.env, KETE_LOOM_OBSERVATIONS_DIR: tmp() };
  const cli = (...a) => spawnSync(process.execPath, [CLI, 'observe', ...a], { env, encoding: 'utf8' });
  const r = cli('new', 's1', '--title', '--kind', 'violation', '--skill', 'x', '--siblings-checked', 'none');
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /--title needs a value/);
  assert.match(cli('new', 's1', '--titel', 'x').stderr, /unknown option --titel/);
  assert.strictEqual(cli('new', 's1', '--title=--weird title', '--skill', 'x', '--siblings-checked', 'none').status, 0);
});
