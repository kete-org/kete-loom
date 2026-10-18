'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { main, makeAnthropicRouter, makeOpenAIRouter, prompts } = require('../scripts/run-evals');
const { listSkills, listAgents } = require('../scripts/lib/skills');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'run-evals.js');
const catalog = [{ dir: 'paystack-integration', description: 'Paystack payments. Use when ...' }, { dir: 'tdd-workflow', description: 'Test first. Use when ...' }];

// Who should pick a prompt, according to the eval files themselves.
function oracle() {
  const owner = new Map();
  for (const item of [...listSkills(), ...listAgents()]) {
    const f = path.join(item.path, 'evals', 'triggers.json');
    if (!fs.existsSync(f)) continue;
    for (const p of JSON.parse(fs.readFileSync(f, 'utf8')).should_trigger) owner.set(p, item.dir);
  }
  return owner;
}

test('the Anthropic router caches the catalog, constrains picks to catalog names, and adds up usage', async () => {
  let sent;
  const client = { messages: { parse: async (req) => { sent = req; return { stop_reason: 'end_turn', parsed_output: { results: [{ id: 1, picks: ['paystack-integration'] }, { id: 2, picks: [] }] }, usage: { input_tokens: 50, output_tokens: 20, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 } }; } } };
  const route = makeAnthropicRouter({ client, model: 'claude-opus-5-5', jsonSchemaOutputFormat: (schema) => ({ type: 'json_schema', schema }) });
  const usage = {};
  const picks = await route([{ id: 1, prompt: 'Add Paystack checkout' }, { id: 2, prompt: 'Explain this regex' }], catalog, 'skills', usage);
  assert.deepStrictEqual(picks.get(1), ['paystack-integration']);
  assert.deepStrictEqual(sent.system[0].cache_control, { type: 'ephemeral' });
  assert.match(sent.system[0].text, /- paystack-integration: Paystack payments/);
  assert.match(sent.messages[0].content, /^Requests:\n1\. Add Paystack checkout\n2\. Explain this regex$/);
  assert.deepStrictEqual(sent.output_config.format.schema.properties.results.items.properties.picks.items.enum, ['paystack-integration', 'tdd-workflow']);
  assert.strictEqual(sent.output_config.format.schema.additionalProperties, false);
  assert.deepStrictEqual(usage, { input_tokens: 50, output_tokens: 20, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 });

  const truncated = { messages: { parse: async () => ({ stop_reason: 'max_tokens', parsed_output: null, usage: {} }) } };
  await assert.rejects(makeAnthropicRouter({ client: truncated, model: 'm', jsonSchemaOutputFormat: (s) => s })([{ id: 1, prompt: 'x' }], catalog, 'skills', {}), /smaller --batch/);
});

test('the OpenAI-compatible router parses JSON picks and reports HTTP errors', async () => {
  const ok = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'Here: {"results":[{"id":"1","picks":["tdd-workflow"]}]}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }) });
  const usage = {};
  const picks = await makeOpenAIRouter({ baseUrl: 'https://gw.example/v1/', apiKey: 'k', model: 'm', fetchImpl: ok })([{ id: 1, prompt: 'write a failing test first' }], catalog, 'skills', usage);
  assert.deepStrictEqual(picks.get(1), ['tdd-workflow']);
  assert.deepStrictEqual(usage, { input_tokens: 10, output_tokens: 5 });
  const bad = async () => ({ ok: false, status: 401, text: async () => 'bad key' });
  await assert.rejects(makeOpenAIRouter({ baseUrl: 'https://gw.example/v1', apiKey: 'k', model: 'm', fetchImpl: bad })([{ id: 1, prompt: 'x' }], catalog, 'skills', {}), /HTTP 401 bad key/);
});

test('a router that follows the eval files scores 100%, and a wrong one fails', async () => {
  const owner = oracle();
  const perfect = { provider: 'fake', model: 'oracle', route: async (batch) => new Map(batch.map((c) => [c.id, owner.has(c.prompt) ? [owner.get(c.prompt)] : []])) };
  const report = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'kl-evals-')), 'r.json');
  const log = console.log;
  console.log = () => {};
  try {
    assert.strictEqual(await main(['--live', '--report', report, '--max-calls', '1000'], { router: perfect }), 0);
    const r = JSON.parse(fs.readFileSync(report, 'utf8'));
    assert.strictEqual(r.overall, 1);
    assert.ok(r.items.length > 200);
    const lazy = { provider: 'fake', model: 'none', route: async (batch) => new Map(batch.map((c) => [c.id, []])) };
    assert.strictEqual(await main(['--live', '--skill', 'paystack-integration'], { router: lazy }), 1, 'missing every positive fails');
  } finally {
    console.log = log;
  }
});

test('prompts are routed once each, in batches that mix items', () => {
  const evals = listSkills().slice(0, 30).map((s) => ({ skill: s, data: JSON.parse(fs.readFileSync(path.join(s.path, 'evals', 'triggers.json'), 'utf8')) }));
  const list = prompts(evals);
  assert.strictEqual(new Set(list.map((c) => c.prompt)).size, list.length);
  const firstBatch = new Set(list.slice(0, 25).map((c) => evals.find((e) => [...e.data.should_trigger, ...e.data.should_not_trigger].includes(c.prompt)).skill.dir));
  assert.ok(firstBatch.size > 10, 'one batch spans many items');
});

test('live mode explains missing keys, and --estimate and --max-calls never call the API', () => {
  const env = { ...process.env, ANTHROPIC_API_KEY: '', KETE_LOOM_EVAL_API_KEY: '', KETE_LOOM_EVAL_PROVIDER: '' };
  const run = (args) => {
    try {
      return { code: 0, out: execFileSync(process.execPath, [SCRIPT, ...args], { env, encoding: 'utf8', stdio: 'pipe' }) };
    } catch (e) {
      return { code: e.status, out: `${e.stdout}${e.stderr}` };
    }
  };
  const est = run(['--estimate']);
  assert.strictEqual(est.code, 0);
  assert.match(est.out, /\d+ call\(s\) of up to 25 prompts.*No API calls made/);
  assert.match(run(['--live', '--skill', 'tdd-workflow']).out, /set ANTHROPIC_API_KEY/);
  const guard = run(['--live', '--max-calls', '2']);
  assert.strictEqual(guard.code, 2);
  assert.match(guard.out, /over --max-calls 2/);
});
