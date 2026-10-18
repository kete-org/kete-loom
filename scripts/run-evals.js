#!/usr/bin/env node
'use strict';

// Trigger evals for every skill and agent (hosts route to both by description).
//
//   node scripts/run-evals.js                     offline: validate eval files
//   node scripts/run-evals.js --estimate          what a live run would cost (calls, tokens); no API calls
//   node scripts/run-evals.js --live              ask a model to route every prompt, the way hosts do
//
// Live options:
//   --skill <name>         only this skill or agent's prompts
//   --changed [base]       only items changed since <base> (default origin/main), for pull requests
//   --batch <n>            prompts routed per call (default 25)
//   --concurrency <n>      calls in flight (default 4)
//   --max-calls <n>        refuse to start a run needing more calls (default 300)
//   --min-pass <0..1>      overall pass rate required (default 0.9)
//   --item-min <0..1>      pass rate every single item needs (default 0.75)
//   --report <file.json>   write a full report with every miss
//
// Providers (KETE_LOOM_EVAL_PROVIDER):
//   anthropic (default)    ANTHROPIC_API_KEY; model KETE_LOOM_EVAL_MODEL (default claude-opus-5-5).
//                          The catalog is a cached system block, so repeated calls read it at a fraction of the cost.
//   openai                 any OpenAI-compatible endpoint (Kete Gateway, OpenRouter, a local server):
//                          KETE_LOOM_EVAL_BASE_URL, KETE_LOOM_EVAL_API_KEY, KETE_LOOM_EVAL_MODEL.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { SKILLS_DIR, listSkills, listAgents } = require('./lib/skills');

const DEFAULT_MODEL = 'claude-opus-5-5';

function loadEvals(items) {
  return items.map((s) => {
    const file = path.join(s.path, 'evals', 'triggers.json');
    const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    return { skill: s, data };
  });
}

function offline(evals) {
  const problems = [];
  const seen = new Map();
  for (const { skill, data } of evals) {
    if (!data) {
      problems.push(`${skill.dir}: no evals/triggers.json`);
      continue;
    }
    const pos = data.should_trigger || [];
    const neg = data.should_not_trigger || [];
    for (const p of pos.filter((x) => neg.includes(x))) problems.push(`${skill.dir}: "${p}" is in both lists`);
    for (const p of [...pos, ...neg]) if (typeof p !== 'string' || p.trim().length < 10) problems.push(`${skill.dir}: prompt too short: ${JSON.stringify(p)}`);
    for (const p of pos) {
      if (seen.has(p)) problems.push(`"${p}" should trigger both ${seen.get(p)} and ${skill.dir}; make the prompts distinct`);
      seen.set(p, skill.dir);
    }
  }
  return problems;
}

// --- Live routing -----------------------------------------------------------------------------

const instructions = (kind) =>
  `You are the ${kind === 'agents' ? 'subagent' : 'skill'} router of a coding agent. You see a catalog of ${kind} (name and description) and a numbered list of user requests. ` +
  `Judge each request on its own, as if it were the only message in a new session. For each one, pick every catalog entry the agent should ${kind === 'agents' ? 'delegate to' : 'load'} to handle it well, using only the descriptions. ` +
  'Pick none when nothing clearly applies. Use names exactly as written in the catalog.';

const catalogText = (items) => items.map((s) => `- ${s.dir}: ${s.description}`).join('\n');

// One routing call: [{ id, prompt }] -> Map(id -> [picked names]).
function makeAnthropicRouter({ client, model, jsonSchemaOutputFormat }) {
  return async function route(batch, catalog, kind, usage) {
    const names = catalog.map((s) => s.dir);
    const response = await client.messages.parse({
      model,
      max_tokens: 4096,
      // The catalog is identical on every call of a run: cache it so only the first call pays full price.
      system: [{ type: 'text', text: `${instructions(kind)}\n\nCatalog:\n${catalogText(catalog)}`, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Requests:\n${batch.map((c) => `${c.id}. ${c.prompt}`).join('\n')}` }],
      output_config: {
        format: jsonSchemaOutputFormat({
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: { id: { type: 'integer' }, picks: { type: 'array', items: { type: 'string', enum: names } } },
                required: ['id', 'picks'],
                additionalProperties: false,
              },
            },
          },
          required: ['results'],
          additionalProperties: false,
        }),
      },
    });
    for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) usage[k] = (usage[k] || 0) + (response.usage[k] || 0);
    if (response.stop_reason === 'max_tokens') throw new Error('router output was cut off (max_tokens); use a smaller --batch');
    if (response.stop_reason === 'refusal' || !response.parsed_output) throw new Error(`router returned no usable result (stop_reason ${response.stop_reason})`);
    return new Map(response.parsed_output.results.map((r) => [r.id, r.picks]));
  };
}

function makeOpenAIRouter({ baseUrl, apiKey, model, fetchImpl = fetch }) {
  return async function route(batch, catalog, kind, usage) {
    const res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: `${instructions(kind)} Reply with JSON only: {"results": [{"id": 1, "picks": ["name"]}]}\n\nCatalog:\n${catalogText(catalog)}` },
          { role: 'user', content: `Requests:\n${batch.map((c) => `${c.id}. ${c.prompt}`).join('\n')}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`router call failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    const body = await res.json();
    usage.input_tokens = (usage.input_tokens || 0) + ((body.usage && body.usage.prompt_tokens) || 0);
    usage.output_tokens = (usage.output_tokens || 0) + ((body.usage && body.usage.completion_tokens) || 0);
    const text = (body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content) || '';
    const json = /\{[\s\S]*\}/.exec(text);
    let parsed;
    try {
      parsed = JSON.parse(json ? json[0] : text);
    } catch {
      throw new Error(`router returned non-JSON: ${text.slice(0, 200)}`);
    }
    return new Map((parsed.results || []).map((r) => [Number(r.id), Array.isArray(r.picks) ? r.picks : []]));
  };
}

function makeRouter(env = process.env) {
  const provider = env.KETE_LOOM_EVAL_PROVIDER || 'anthropic';
  if (provider === 'openai') {
    const missing = ['KETE_LOOM_EVAL_BASE_URL', 'KETE_LOOM_EVAL_API_KEY', 'KETE_LOOM_EVAL_MODEL'].filter((k) => !env[k]);
    if (missing.length) throw new Error(`the openai provider needs ${missing.join(', ')}`);
    return { provider, model: env.KETE_LOOM_EVAL_MODEL, route: makeOpenAIRouter({ baseUrl: env.KETE_LOOM_EVAL_BASE_URL, apiKey: env.KETE_LOOM_EVAL_API_KEY, model: env.KETE_LOOM_EVAL_MODEL }) };
  }
  if (provider !== 'anthropic') throw new Error(`unknown KETE_LOOM_EVAL_PROVIDER "${provider}" (anthropic or openai)`);
  const apiKey = env.ANTHROPIC_API_KEY || env.KETE_LOOM_EVAL_API_KEY;
  if (!apiKey) throw new Error('set ANTHROPIC_API_KEY (or KETE_LOOM_EVAL_PROVIDER=openai with its variables)');
  let sdk;
  try {
    sdk = require('@anthropic-ai/sdk');
  } catch {
    throw new Error('live evals need the dev dependencies: run npm install');
  }
  const Anthropic = sdk.default || sdk;
  const { jsonSchemaOutputFormat } = require('@anthropic-ai/sdk/helpers/json-schema');
  const model = env.KETE_LOOM_EVAL_MODEL || DEFAULT_MODEL;
  // The SDK retries 429 and 5xx responses with backoff itself.
  const client = new Anthropic({ apiKey, maxRetries: 4 });
  return { provider, model, route: makeAnthropicRouter({ client, model, jsonSchemaOutputFormat }) };
}

// Unique prompts of a group, in a stable shuffled order so each batch mixes many items' prompts.
function prompts(evals) {
  const all = [...new Set(evals.flatMap(({ data }) => (data ? [...data.should_trigger, ...data.should_not_trigger] : [])))];
  const key = (p) => crypto.createHash('sha256').update(p).digest('hex');
  return all.sort((a, b) => key(a).localeCompare(key(b))).map((prompt, i) => ({ id: i + 1, prompt }));
}

const chunk = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, (i + 1) * n));

async function pool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

// Scores every item of a group from the routed picks.
function score(evals, picks) {
  return evals.filter((e) => e.data).map(({ skill, data }) => {
    const cases = [...data.should_trigger.map((p) => ({ p, want: true })), ...data.should_not_trigger.map((p) => ({ p, want: false }))];
    const misses = [];
    let pass = 0;
    for (const c of cases) {
      const got = (picks.get(c.p) || []).includes(skill.dir);
      if (got === c.want) pass++;
      else misses.push({ prompt: c.p, expected: c.want ? 'picked' : 'not picked', picks: picks.get(c.p) || [] });
    }
    return { name: skill.dir, kind: skill.kind, pass, total: cases.length, rate: pass / cases.length, misses };
  });
}

async function live(groups, opts, router) {
  const usage = {};
  const items = [];
  for (const g of groups) {
    if (!g.evals.length) continue;
    const list = prompts(g.evals);
    const byId = new Map(list.map((c) => [c.id, c.prompt]));
    const picks = new Map();
    const run = async (batch) => {
      const result = await router.route(batch, g.all, g.kind, usage);
      for (const c of batch) picks.set(byId.get(c.id), result.get(c.id) || []);
    };
    const [first, ...rest] = chunk(list, opts.batch);
    // The first call writes the catalog to the cache; the rest run in parallel and read it.
    await run(first);
    await pool(rest.map((batch) => () => run(batch)), opts.concurrency);
    items.push(...score(g.evals, picks));
  }
  const pass = items.reduce((n, i) => n + i.pass, 0);
  const total = items.reduce((n, i) => n + i.total, 0);
  return { provider: router.provider, model: router.model, overall: total ? pass / total : 1, pass, total, items, usage };
}

function estimate(groups, opts) {
  let calls = 0;
  let catalogTokens = 0;
  let promptTokens = 0;
  for (const g of groups) {
    if (!g.evals.length) continue;
    const list = prompts(g.evals);
    const n = Math.ceil(list.length / opts.batch);
    const cat = Math.ceil((instructions(g.kind).length + catalogText(g.all).length) / 4);
    calls += n;
    catalogTokens += cat * n;
    promptTokens += Math.ceil(list.reduce((s, c) => s + c.prompt.length + 6, 0) / 4);
  }
  return { calls, catalogTokens, promptTokens, outputTokens: calls * 40 * opts.batch };
}

// Items whose folders changed since `base`.
function changedItems(base) {
  const out = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  return new Set(out.split('\n').map((f) => /^(?:skills|agents)\/([^/]+)\//.exec(f)).filter(Boolean).map((m) => m[1]));
}

function parseArgs(argv) {
  const opts = { live: false, estimate: false, batch: 25, concurrency: 4, maxCalls: 300, minPass: 0.9, itemMin: 0.75 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const num = () => {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) throw new Error(`${a} needs a positive number`);
      return v;
    };
    if (a === '--live') opts.live = true;
    else if (a === '--estimate') opts.estimate = true;
    else if (a === '--skill') opts.skill = argv[++i];
    else if (a === '--changed') opts.changed = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'origin/main';
    else if (a === '--batch') opts.batch = Math.floor(num());
    else if (a === '--concurrency') opts.concurrency = Math.floor(num());
    else if (a === '--max-calls') opts.maxCalls = Math.floor(num());
    else if (a === '--min-pass') opts.minPass = num();
    else if (a === '--item-min') opts.itemMin = num();
    else if (a === '--report') opts.report = argv[++i];
    else throw new Error(`unknown option ${a}`);
  }
  if (opts.minPass > 1 || opts.itemMin > 1) throw new Error('--min-pass and --item-min are between 0 and 1');
  return opts;
}

async function main(argv, { env = process.env, router } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    return 2;
  }
  const changed = opts.changed ? changedItems(opts.changed) : null;
  // Skills and agents are routed separately, each against its own catalog.
  const groups = [['skills', listSkills(SKILLS_DIR)], ['agents', listAgents()]].map(([kind, all]) => {
    const selected = all.filter((s) => (!opts.skill || s.dir === opts.skill) && (!changed || changed.has(s.dir)));
    return { kind, all, evals: loadEvals(selected) };
  });
  if (opts.skill && !groups.some((g) => g.evals.length)) {
    console.error(`no skill or agent named "${opts.skill}"`);
    return 2;
  }
  const evals = groups.flatMap((g) => g.evals);

  const problems = groups.flatMap((g) => offline(g.evals));
  for (const p of problems) console.log(`✗ ${p}`);
  if (!opts.live && !opts.estimate) {
    const total = evals.reduce((n, e) => n + (e.data ? e.data.should_trigger.length + e.data.should_not_trigger.length : 0), 0);
    console.log(`${problems.length ? '' : '✓ '}${evals.length} eval file(s), ${total} prompt(s), ${problems.length} problem(s). Run with --estimate, then --live, to test routing against a model.`);
    return problems.length ? 1 : 0;
  }
  if (problems.length) return 1;
  if (!evals.length) {
    console.log(changed ? `No skills or agents changed since ${opts.changed}; nothing to route.` : 'Nothing to route.');
    return 0;
  }

  const est = estimate(groups, opts);
  const line = `${est.calls} call(s) of up to ${opts.batch} prompts; ~${Math.round(est.catalogTokens / 1000)}k catalog tokens (cached after each group's first call), ~${Math.round(est.promptTokens / 1000)}k prompt tokens, ~${Math.round(est.outputTokens / 1000)}k output tokens`;
  if (opts.estimate) {
    console.log(`Estimate for ${evals.length} item(s): ${line}. No API calls made.`);
    return 0;
  }
  if (est.calls > opts.maxCalls) {
    console.error(`This run needs ${est.calls} calls, over --max-calls ${opts.maxCalls}. Raise it, use --changed, or use --skill.`);
    return 2;
  }

  let r;
  try {
    r = router || makeRouter(env);
  } catch (e) {
    console.error(`live evals: ${e.message}`);
    return 2;
  }
  console.log(`Routing ${evals.length} item(s) with ${r.provider}/${r.model}: ${line}.`);
  let result;
  try {
    result = await live(groups, opts, r);
  } catch (e) {
    console.error(`live evals failed: ${e.message}`);
    return 1;
  }

  const failing = result.items.filter((i) => i.rate < opts.itemMin);
  for (const i of [...result.items].sort((a, b) => a.rate - b.rate)) {
    if (i.rate === 1) continue;
    console.log(`${i.rate < opts.itemMin ? '✗' : '!'} ${i.kind.padEnd(6)} ${i.name.padEnd(30)} ${i.pass}/${i.total}`);
    for (const m of i.misses) console.log(`    ${m.expected === 'picked' ? 'missed' : 'false hit'}: "${m.prompt}" -> [${m.picks.join(', ')}]`);
  }
  const u = result.usage;
  console.log(`\nOverall ${result.pass}/${result.total} (${Math.round(result.overall * 1000) / 10}%), ${result.items.filter((i) => i.rate === 1).length}/${result.items.length} items perfect, ${failing.length} below ${opts.itemMin}.`);
  console.log(`Tokens: ${u.input_tokens || 0} input, ${u.cache_read_input_tokens || 0} cache read, ${u.cache_creation_input_tokens || 0} cache write, ${u.output_tokens || 0} output.`);
  if (opts.report) fs.writeFileSync(opts.report, JSON.stringify({ ...result, minPass: opts.minPass, itemMin: opts.itemMin }, null, 2) + '\n');
  return result.overall >= opts.minPass && !failing.length ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).then((code) => (process.exitCode = code));

module.exports = { offline, prompts, score, live, estimate, parseArgs, main, makeAnthropicRouter, makeOpenAIRouter };
