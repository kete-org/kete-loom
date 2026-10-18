#!/usr/bin/env node
'use strict';

// Trigger evals for every skill and agent (hosts route to both by description).
//
//   node scripts/run-evals.js            offline: validate eval files
//   node scripts/run-evals.js --live     ask a model to route each prompt,
//                                        the way hosts choose skills
//
// Live mode works with any OpenAI-compatible Chat Completions endpoint
// (Kete Gateway, OpenAI, OpenRouter, a local server...):
//   KETE_LOOM_EVAL_BASE_URL   e.g. https://gateway.ketecode.ai/v1
//   KETE_LOOM_EVAL_API_KEY
//   KETE_LOOM_EVAL_MODEL      e.g. gpt-5-mini
// Options: --skill <name>  --min-pass <0..1> (default 0.9)

const fs = require('fs');
const path = require('path');
const { SKILLS_DIR, listSkills, listAgents } = require('./lib/skills');

function loadEvals(skills) {
  return skills.map((s) => {
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

async function route(prompt, catalog, cfg) {
  const system =
    'You are the router of a coding agent. You see the user request and a catalog of skills or subagents (name and description). ' +
    'Pick every entry the agent should use for this request, judging only by the descriptions. ' +
    'Pick none if nothing clearly applies. Reply with JSON only: {"skills": ["name", ...]}';
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Catalog:\n${catalog}\n\nUser request:\n${prompt}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`router call failed: HTTP ${res.status} ${await res.text()}`);
  const body = await res.json();
  const text = body.choices?.[0]?.message?.content || '';
  const json = /\{[\s\S]*\}/.exec(text);
  try {
    return JSON.parse(json ? json[0] : text).skills || [];
  } catch {
    throw new Error(`router returned non-JSON: ${text.slice(0, 200)}`);
  }
}

async function live(evals, allSkills, opts) {
  const cfg = {
    baseUrl: process.env.KETE_LOOM_EVAL_BASE_URL,
    apiKey: process.env.KETE_LOOM_EVAL_API_KEY,
    model: process.env.KETE_LOOM_EVAL_MODEL,
  };
  const envNames = { baseUrl: 'KETE_LOOM_EVAL_BASE_URL', apiKey: 'KETE_LOOM_EVAL_API_KEY', model: 'KETE_LOOM_EVAL_MODEL' };
  const missing = Object.keys(cfg).filter((k) => !cfg[k]).map((k) => envNames[k]);
  if (missing.length) {
    console.error(`live evals need env vars: ${missing.join(', ')}`);
    return 2;
  }
  const catalog = allSkills.map((s) => `- ${s.dir}: ${s.description}`).join('\n');
  let failed = false;
  for (const { skill, data } of evals) {
    if (!data) continue;
    const cases = [
      ...data.should_trigger.map((p) => ({ p, want: true })),
      ...data.should_not_trigger.map((p) => ({ p, want: false })),
    ];
    let pass = 0;
    const misses = [];
    for (const c of cases) {
      const picked = await route(c.p, catalog, cfg);
      const got = picked.includes(skill.dir);
      if (got === c.want) pass++;
      else misses.push(`${c.want ? 'missed' : 'false hit'}: "${c.p}" -> [${picked.join(', ')}]`);
    }
    const rate = pass / cases.length;
    const ok = rate >= opts.minPass;
    if (!ok) failed = true;
    console.log(`${ok ? '✓' : '✗'} ${skill.dir.padEnd(24)} ${pass}/${cases.length} (${Math.round(rate * 100)}%)`);
    for (const m of misses) console.log(`    ${m}`);
  }
  return failed ? 1 : 0;
}

async function main(argv) {
  const opts = { live: argv.includes('--live'), minPass: 0.9 };
  const si = argv.indexOf('--skill');
  const mi = argv.indexOf('--min-pass');
  if (mi !== -1) opts.minPass = Number(argv[mi + 1]);
  // Skills and agents are routed separately, each against its own catalog.
  const groups = [listSkills(SKILLS_DIR), listAgents()].map((all) => {
    const selected = si !== -1 ? all.filter((s) => s.dir === argv[si + 1]) : all;
    return { all, evals: loadEvals(selected) };
  });
  if (si !== -1 && !groups.some((g) => g.evals.length)) {
    console.error(`no skill or agent named "${argv[si + 1]}"`);
    return 2;
  }
  const evals = groups.flatMap((g) => g.evals);

  const problems = groups.flatMap((g) => offline(g.evals));
  for (const p of problems) console.log(`✗ ${p}`);
  if (!opts.live) {
    const total = evals.reduce((n, e) => n + (e.data ? e.data.should_trigger.length + e.data.should_not_trigger.length : 0), 0);
    console.log(`${problems.length ? '' : '✓ '}${evals.length} eval file(s), ${total} prompt(s), ${problems.length} problem(s). Run with --live to test routing against a model.`);
    return problems.length ? 1 : 0;
  }
  if (problems.length) return 1;
  let code = 0;
  for (const g of groups) if (g.evals.length) code = Math.max(code, await live(g.evals, g.all, opts));
  return code;
}

if (require.main === module) main(process.argv.slice(2)).then((code) => (process.exitCode = code));

module.exports = { offline };
