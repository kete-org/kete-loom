#!/usr/bin/env node
'use strict';

// Behaviour evals: does a skill or agent change what the agent DOES? Trigger evals (run-evals.js)
// check that the right item is picked; these check that, once picked, it is followed, including
// when the user pushes to skip it. Each scenario in <item>/evals/behavior.json runs twice, with the
// item loaded and without it (the baseline), and a judge model grades each reply against the
// scenario's expect and forbid criteria. The baseline shows what the item adds.
//
//   node scripts/run-behavior-evals.js                    offline: validate every behavior.json
//   node scripts/run-behavior-evals.js --estimate         calls a live run would make; no API calls
//   node scripts/run-behavior-evals.js --live             run the scenarios against a model
//
// Live options:
//   --skill <name>         only this skill or agent
//   --changed [base]       only items changed since <base> (default origin/main)
//   --host claude          run each scenario as a real headless Claude Code session in a scratch
//                          repository (read-only plan mode), instead of a single model reply.
//                          Uses your own `claude` CLI and its billing; skills only.
//   --no-baseline          skip the run without the item (half the calls)
//   --repeat <n>           run each scenario n times (default 1); replies vary between runs
//   --concurrency <n>      calls in flight (default 4)
//   --max-calls <n>        refuse a run needing more calls (default 200)
//   --min-pass <0..1>      share of scenarios that must pass with the item (default 0.8)
//   --report <file.json>   write every reply, verdict and piece of evidence
//
// Providers: the same KETE_LOOM_EVAL_* variables as run-evals.js (anthropic by default, or any
// OpenAI-compatible endpoint). The judge always uses the provider, also with --host.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { SKILLS_DIR, listSkills, listAgents } = require('./lib/skills');
const { loadBehavior } = require('./lib/behavior');

const DEFAULT_MODEL = 'claude-opus-5-5';
const HOST_TIMEOUT_MS = 300000;

const SUBJECT =
  "You are a coding agent working in the user's repository. In this test you cannot run tools or see anything beyond this message. " +
  'Reply with exactly what you would do next, in order: the commands you would run, the files you would read or change, and what you would say to the user. Be concrete.';

const subjectSystem = (item, withItem) => {
  if (!withItem) return SUBJECT;
  if (item.kind === 'agent') return `${item.body.trim()}\n\n${SUBJECT}`;
  return `${SUBJECT}\n\nThe "${item.dir}" skill is loaded for this task. Follow it:\n\n<skill>\n${item.body.trim()}\n</skill>`;
};

const withFiles = (s) =>
  s.files && Object.keys(s.files).length
    ? `${s.prompt}\n\nFiles in the repository:\n${Object.entries(s.files).map(([p, c]) => `--- ${p}\n${c.replace(/\n?$/, '\n')}`).join('')}`
    : s.prompt;

const JUDGE =
  "You grade a coding agent's reply against numbered criteria. Judge only what the reply shows: a criterion is met when the reply clearly does or commits to that behaviour, " +
  'not when it merely mentions it in passing. Give a short quote from the reply as evidence, or say what is missing.';

const criteria = (s) => [...s.expect.map((text) => ({ kind: 'expect', text })), ...(s.forbid || []).map((text) => ({ kind: 'forbid', text }))].map((c, i) => ({ id: i + 1, ...c }));

const judgeUser = (s, reply) =>
  `The user said:\n<request>\n${withFiles(s)}\n</request>\n\nThe agent replied:\n<reply>\n${reply}\n</reply>\n\nCriteria:\n${criteria(s).map((c) => `${c.id}. ${c.text}`).join('\n')}`;

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'integer' }, met: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['id', 'met', 'evidence'], additionalProperties: false },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

// A scenario passes when every expect criterion is met and no forbid criterion is.
function grade(s, verdicts) {
  const byId = new Map(verdicts.map((v) => [v.id, v]));
  const rows = criteria(s).map((c) => {
    const v = byId.get(c.id) || { met: false, evidence: 'no verdict from the judge' };
    return { ...c, met: Boolean(v.met), evidence: String(v.evidence || ''), ok: c.kind === 'expect' ? Boolean(v.met) : !v.met };
  });
  return { pass: rows.every((r) => r.ok), criteria: rows };
}

const addUsage = (usage, u = {}) => {
  for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) usage[k] = (usage[k] || 0) + (u[k] || 0);
};

function makeAnthropicModel({ client, model, jsonSchemaOutputFormat }) {
  return {
    async reply(system, user, usage) {
      const r = await client.messages.create({ model, max_tokens: 2048, system, messages: [{ role: 'user', content: user }] });
      addUsage(usage, r.usage);
      return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    },
    async judge(user, usage) {
      const r = await client.messages.parse({ model, max_tokens: 2048, system: JUDGE, messages: [{ role: 'user', content: user }], output_config: { format: jsonSchemaOutputFormat(VERDICT_SCHEMA) } });
      addUsage(usage, r.usage);
      if (!r.parsed_output) throw new Error(`judge returned no usable verdict (stop_reason ${r.stop_reason})`);
      return r.parsed_output.results;
    },
  };
}

function makeOpenAIModel({ baseUrl, apiKey, model, fetchImpl = fetch }) {
  const chat = async (system, user, usage) => {
    const res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (!res.ok) throw new Error(`model call failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    const body = await res.json();
    usage.input_tokens = (usage.input_tokens || 0) + ((body.usage && body.usage.prompt_tokens) || 0);
    usage.output_tokens = (usage.output_tokens || 0) + ((body.usage && body.usage.completion_tokens) || 0);
    return (body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content) || '';
  };
  return {
    reply: chat,
    async judge(user, usage) {
      const text = await chat(`${JUDGE} Reply with JSON only: {"results": [{"id": 1, "met": true, "evidence": "..."}]}`, user, usage);
      const json = /\{[\s\S]*\}/.exec(text);
      try {
        return JSON.parse(json ? json[0] : text).results || [];
      } catch {
        throw new Error(`judge returned non-JSON: ${text.slice(0, 200)}`);
      }
    },
  };
}

function makeModel(env = process.env) {
  const provider = env.KETE_LOOM_EVAL_PROVIDER || 'anthropic';
  if (provider === 'openai') {
    const missing = ['KETE_LOOM_EVAL_BASE_URL', 'KETE_LOOM_EVAL_API_KEY', 'KETE_LOOM_EVAL_MODEL'].filter((k) => !env[k]);
    if (missing.length) throw new Error(`the openai provider needs ${missing.join(', ')}`);
    return { provider, model: env.KETE_LOOM_EVAL_MODEL, ...makeOpenAIModel({ baseUrl: env.KETE_LOOM_EVAL_BASE_URL, apiKey: env.KETE_LOOM_EVAL_API_KEY, model: env.KETE_LOOM_EVAL_MODEL }) };
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
  return { provider, model, ...makeAnthropicModel({ client: new Anthropic({ apiKey, maxRetries: 4 }), model, jsonSchemaOutputFormat }) };
}

// A real headless Claude Code session in a scratch git repository holding the scenario's files and,
// for the with-item run, the skill. Plan mode keeps it read-only.
// shortcut: the baseline still sees skills installed in your own ~/.claude/skills; run it from an
// account without Kete Loom skills installed for a clean baseline.
function makeClaudeHost({ bin = process.env.KETE_LOOM_CLAUDE_BIN || 'claude', spawn = spawnSync } = {}) {
  return async function session(item, s, withItem) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-behavior-'));
    try {
      for (const [rel, content] of Object.entries(s.files || {})) {
        fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        fs.writeFileSync(path.join(dir, rel), content);
      }
      if (withItem) fs.cpSync(item.path, path.join(dir, '.claude', 'skills', item.dir), { recursive: true, filter: (p) => !p.includes(`${path.sep}evals`) });
      spawn('git', ['init', '-q'], { cwd: dir });
      const r = spawn(bin, ['-p', s.prompt, '--permission-mode', 'plan', '--output-format', 'text'], { cwd: dir, encoding: 'utf8', timeout: HOST_TIMEOUT_MS });
      if (r.error) throw new Error(`could not run ${bin}: ${r.error.message}`);
      if (r.status !== 0) throw new Error(`${bin} exited ${r.status}: ${(r.stderr || '').slice(0, 300)}`);
      return r.stdout.trim();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

async function pool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }));
  return results;
}

// One run of one scenario, with or without the item.
async function runOne(item, s, withItem, { model, host, usage }) {
  const reply = host ? await host(item, s, withItem) : await model.reply(subjectSystem(item, withItem), withFiles(s), usage);
  return { reply, ...grade(s, await model.judge(judgeUser(s, reply), usage)) };
}

async function live(targets, opts, { model, host }) {
  const usage = {};
  const tasks = [];
  for (const t of targets) {
    for (const s of t.scenarios) {
      for (let n = 0; n < opts.repeat; n++) {
        tasks.push(() => runOne(t.item, s, true, { model, host, usage }).then((r) => ({ item: t.item.dir, scenario: s.name, withItem: true, ...r })));
        if (opts.baseline) tasks.push(() => runOne(t.item, s, false, { model, host, usage }).then((r) => ({ item: t.item.dir, scenario: s.name, withItem: false, ...r })));
      }
    }
  }
  const runs = await pool(tasks, opts.concurrency);
  const rate = (list) => (list.length ? list.filter((r) => r.pass).length / list.length : null);
  const items = targets.map((t) => {
    const mine = runs.filter((r) => r.item === t.item.dir);
    return { name: t.item.dir, kind: t.item.kind, withItem: rate(mine.filter((r) => r.withItem)), baseline: rate(mine.filter((r) => !r.withItem)), runs: mine };
  });
  const all = runs.filter((r) => r.withItem);
  return { provider: model.provider, model: model.model, host: opts.host || null, overall: rate(all), baseline: rate(runs.filter((r) => !r.withItem)), items, usage };
}

const callsFor = (targets, opts) => targets.reduce((n, t) => n + t.scenarios.length, 0) * opts.repeat * (opts.baseline ? 2 : 1) * (opts.host ? 1 : 2);

function changedItems(base) {
  const out = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  return new Set(out.split('\n').map((f) => /^(?:skills|agents)\/([^/]+)\//.exec(f)).filter(Boolean).map((m) => m[1]));
}

function parseArgs(argv) {
  const opts = { live: false, estimate: false, baseline: true, repeat: 1, concurrency: 4, maxCalls: 200, minPass: 0.8 };
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
    else if (a === '--host') opts.host = argv[++i];
    else if (a === '--no-baseline') opts.baseline = false;
    else if (a === '--repeat') opts.repeat = Math.floor(num());
    else if (a === '--concurrency') opts.concurrency = Math.floor(num());
    else if (a === '--max-calls') opts.maxCalls = Math.floor(num());
    else if (a === '--min-pass') opts.minPass = num();
    else if (a === '--report') opts.report = argv[++i];
    else throw new Error(`unknown option ${a}`);
  }
  if (opts.minPass > 1) throw new Error('--min-pass is between 0 and 1');
  if (opts.host && opts.host !== 'claude') throw new Error('--host supports claude');
  return opts;
}

const pct = (r) => (r === null ? '-' : `${Math.round(r * 100)}%`);

async function main(argv, { env = process.env, model, host } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    return 2;
  }
  const changed = opts.changed ? changedItems(opts.changed) : null;
  const items = [...listSkills(SKILLS_DIR), ...listAgents()].filter((s) => (!opts.skill || s.dir === opts.skill) && (!changed || changed.has(s.dir)));
  if (opts.skill && !items.length) {
    console.error(`no skill or agent named "${opts.skill}"`);
    return 2;
  }
  const targets = items.map((item) => ({ item, ...loadBehavior(item) })).filter((t) => t.scenarios);
  const problems = targets.flatMap((t) => t.problems.map((p) => `${t.item.dir}: ${p}`));
  for (const p of problems) console.log(`✗ ${p}`);
  const scenarios = targets.reduce((n, t) => n + t.scenarios.length, 0);
  if (!opts.live && !opts.estimate) {
    console.log(`${problems.length ? '' : '✓ '}${targets.length} behaviour eval file(s), ${scenarios} scenario(s), ${problems.length} problem(s). Run with --estimate, then --live, to test behaviour against a model.`);
    return problems.length ? 1 : 0;
  }
  if (problems.length) return 1;
  if (!targets.length) {
    console.log('No behaviour evals to run.');
    return 0;
  }
  if (opts.host && targets.some((t) => t.item.kind === 'agent')) {
    console.error('--host runs skills only; pick skills with --skill, or drop --host to include agents');
    return 2;
  }
  const calls = callsFor(targets, opts);
  const line = `${scenarios} scenario(s) x ${opts.repeat} run(s)${opts.baseline ? ', with and without the item' : ''}: ${calls} ${opts.host ? `${opts.host} session(s) plus as many judge calls` : 'model call(s)'}`;
  if (opts.estimate) {
    console.log(`Estimate for ${targets.length} item(s): ${line}. No API calls made.`);
    return 0;
  }
  if (calls > opts.maxCalls) {
    console.error(`This run needs ${calls} calls, over --max-calls ${opts.maxCalls}. Raise it, or use --skill, --changed or --no-baseline.`);
    return 2;
  }
  let m;
  try {
    m = model || makeModel(env);
  } catch (e) {
    console.error(`behaviour evals: ${e.message}`);
    return 2;
  }
  const h = opts.host ? host || makeClaudeHost() : null;
  console.log(`Running ${targets.length} item(s) with ${opts.host ? `${opts.host} sessions, judged by ` : ''}${m.provider}/${m.model}: ${line}.`);
  let result;
  try {
    result = await live(targets, opts, { model: m, host: h });
  } catch (e) {
    console.error(`behaviour evals failed: ${e.message}`);
    return 1;
  }
  for (const i of result.items) {
    const lift = i.baseline === null ? '' : `  baseline ${pct(i.baseline)}${i.withItem <= i.baseline ? '  (adds nothing measurable)' : ''}`;
    console.log(`${i.withItem === 1 ? '✓' : i.withItem >= opts.minPass ? '!' : '✗'} ${i.kind.padEnd(6)} ${i.name.padEnd(30)} with it ${pct(i.withItem)}${lift}`);
    for (const r of i.runs.filter((x) => x.withItem && !x.pass)) {
      console.log(`    ${r.scenario}:`);
      for (const c of r.criteria.filter((x) => !x.ok)) console.log(`      ${c.kind === 'expect' ? 'missing' : 'did'}: ${c.text} (${c.evidence})`);
    }
  }
  const u = result.usage;
  console.log(`\nWith the items ${pct(result.overall)} of scenario runs pass${result.baseline === null ? '' : `; without them ${pct(result.baseline)}`}.`);
  console.log(`Tokens: ${u.input_tokens || 0} input, ${u.cache_read_input_tokens || 0} cache read, ${u.output_tokens || 0} output.`);
  if (opts.report) fs.writeFileSync(opts.report, JSON.stringify({ ...result, minPass: opts.minPass }, null, 2) + '\n');
  return result.overall >= opts.minPass ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).then((code) => (process.exitCode = code));

module.exports = { main, parseArgs, grade, criteria, subjectSystem, withFiles, judgeUser, live, makeAnthropicModel, makeOpenAIModel, makeClaudeHost, callsFor };
