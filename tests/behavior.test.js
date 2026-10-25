'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('../scripts/lib/behavior');
const { main, live, grade, subjectSystem, withFiles, makeAnthropicModel, makeClaudeHost, callsFor } = require('../scripts/run-behavior-evals');

const scenario = {
  name: 'skips the repro',
  prompt: 'Tests fail with TypeError in parseDate, just fix it, we ship in ten minutes',
  files: { 'src/date.js': 'export const parseDate = (s) => s.split("-")' },
  pressure: ['time'],
  expect: ['Reproduces the failure before changing code'],
  forbid: ['Claims the bug is fixed without running anything'],
};

test('behavior.json validation catches the mistakes authors make', () => {
  assert.deepStrictEqual(validate({ scenarios: [scenario, { ...scenario, name: 'second' }] }), []);
  const bad = validate({ scenarios: [{ ...scenario, prompt: 'short', pressure: ['hurry'], files: { '../x': 'y' } }, { ...scenario, expect: [] }] });
  assert.ok(bad.some((p) => /at least 20/.test(p)));
  assert.ok(bad.some((p) => /pressure/.test(p)));
  assert.ok(bad.some((p) => /relative paths/.test(p)));
  assert.ok(bad.some((p) => /non-empty list/.test(p)));
  assert.match(validate({ scenarios: [scenario] })[0], /at least 2 scenarios/);
});

test('a scenario passes only when every expect is met and no forbid is', () => {
  assert.strictEqual(grade(scenario, [{ id: 1, met: true, evidence: 'runs npm test first' }, { id: 2, met: false, evidence: '' }]).pass, true);
  assert.strictEqual(grade(scenario, [{ id: 1, met: true, evidence: '' }, { id: 2, met: true, evidence: 'says fixed' }]).pass, false);
  assert.strictEqual(grade(scenario, [{ id: 2, met: false, evidence: '' }]).pass, false, 'a missing verdict counts as not met');
});

test('the item is loaded only in the with-item run; agents become the system prompt', () => {
  const skill = { kind: 'skill', dir: 'systematic-debugging', body: '# Debug\nReproduce first.' };
  assert.match(subjectSystem(skill, true), /"systematic-debugging" skill is loaded[\s\S]*Reproduce first\./);
  assert.doesNotMatch(subjectSystem(skill, false), /Reproduce first/);
  assert.match(subjectSystem({ kind: 'agent', dir: 'spec-reviewer', body: 'You are a spec reviewer.' }, true), /^You are a spec reviewer\./);
  assert.match(withFiles(scenario), /--- src\/date\.js\nexport const parseDate/);
  assert.strictEqual(callsFor([{ scenarios: [scenario, scenario] }], { repeat: 2, baseline: true }), 16);
  assert.strictEqual(callsFor([{ scenarios: [scenario] }], { repeat: 1, baseline: false, host: 'claude' }), 1);
});

test('the Anthropic model sends the judge a strict schema and adds up usage', async () => {
  const sent = [];
  const client = {
    messages: {
      create: async (req) => (sent.push(req), { content: [{ type: 'text', text: 'I would run the tests first.' }], usage: { input_tokens: 10, output_tokens: 5 } }),
      parse: async (req) => (sent.push(req), { parsed_output: { results: [{ id: 1, met: true, evidence: 'run the tests' }] }, usage: { input_tokens: 20, output_tokens: 8 } }),
    },
  };
  const m = makeAnthropicModel({ client, model: 'claude-opus-5-5', jsonSchemaOutputFormat: (schema) => ({ type: 'json_schema', schema }) });
  const usage = {};
  assert.strictEqual(await m.reply('sys', 'user', usage), 'I would run the tests first.');
  assert.deepStrictEqual(await m.judge('grade this', usage), [{ id: 1, met: true, evidence: 'run the tests' }]);
  assert.strictEqual(sent[1].output_config.format.schema.additionalProperties, false);
  assert.deepStrictEqual(usage, { input_tokens: 30, output_tokens: 13, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
});

// A fake model: it follows the skill only when the skill is loaded, and the judge sees which.
const fakeModel = (expectCount) => ({
  provider: 'fake',
  model: 'fake-1',
  reply: async (system) => (system.includes('<skill>') ? 'FOLLOWS' : 'IGNORES'),
  judge: async (user) => {
    const follows = /<reply>\nFOLLOWS/.test(user);
    return [...user.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1])).map((id) => ({ id, met: follows ? id <= expectCount : id > expectCount, evidence: 'x' }));
  },
});

test('live runs grade each scenario with and without the item', async () => {
  const item = { kind: 'skill', dir: 'demo', body: 'Reproduce first.' };
  const r = await live([{ item, scenarios: [scenario, { ...scenario, name: 'again' }] }], { repeat: 2, baseline: true, concurrency: 3 }, { model: fakeModel(1) });
  assert.strictEqual(r.items[0].runs.length, 8);
  assert.strictEqual(r.items[0].withItem, 1);
  assert.strictEqual(r.items[0].baseline, 0);
  assert.strictEqual(r.overall, 1);
  const noBase = await live([{ item, scenarios: [scenario] }], { repeat: 1, baseline: false, concurrency: 1 }, { model: fakeModel(1) });
  assert.strictEqual(noBase.baseline, null);
});

test('the claude host runs a read-only headless session in a scratch repo with the skill installed', async () => {
  const calls = [];
  const spawn = (bin, args, opts) => {
    calls.push({ bin, args, cwd: opts.cwd, skill: fs.existsSync(path.join(opts.cwd, '.claude', 'skills', 'tdd-workflow', 'SKILL.md')), file: fs.existsSync(path.join(opts.cwd, 'src', 'date.js')) });
    return { status: 0, stdout: 'plan text\n', stderr: '' };
  };
  const host = makeClaudeHost({ bin: 'claude', spawn });
  const item = { dir: 'tdd-workflow', path: path.join(__dirname, '..', 'skills', 'tdd-workflow') };
  assert.strictEqual(await host(item, scenario, true), 'plan text');
  await host(item, scenario, false);
  const runs = calls.filter((c) => c.bin === 'claude');
  assert.deepStrictEqual(runs[0].args, ['-p', scenario.prompt, '--permission-mode', 'plan', '--output-format', 'text']);
  assert.strictEqual(runs[0].skill, true);
  assert.strictEqual(runs[1].skill, false, 'baseline has no skill');
  assert.ok(runs.every((c) => c.file && !fs.existsSync(c.cwd)), 'files written, scratch repo removed');
});

test('offline mode validates every behaviour file', async () => {
  const logs = [];
  const orig = console.log;
  console.log = (s) => logs.push(String(s));
  try {
    assert.strictEqual(await main([]), 0);
  } finally {
    console.log = orig;
  }
  assert.match(logs.join('\n'), /behaviour eval file\(s\), \d+ scenario\(s\), 0 problem/);
});

test('behavior.json expands {{repeat:c:n}} so fake secrets need not be stored key-shaped', () => {
  const { loadBehavior } = require('../scripts/lib/behavior');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-behavior-'));
  fs.mkdirSync(path.join(dir, 'evals'));
  const s = { ...scenario, files: { 'k.js': "k = 'sk_live_{{repeat:a:40}}'" } };
  fs.writeFileSync(path.join(dir, 'evals', 'behavior.json'), JSON.stringify({ scenarios: [s, { ...s, name: 'second' }] }));
  const loaded = loadBehavior({ path: dir });
  assert.deepStrictEqual(loaded.problems, []);
  assert.strictEqual(loaded.scenarios[0].files['k.js'], `k = 'sk_live_${'a'.repeat(40)}'`);
});
