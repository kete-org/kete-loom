'use strict';

// Behaviour evals: evals/behavior.json in a skill or agent folder. Each scenario is a user request
// (often with pressure to skip the item's discipline), optional files the agent can see, and what the
// reply must and must not show. scripts/run-behavior-evals.js runs them with and without the item.

const fs = require('fs');
const path = require('path');

const PRESSURES = ['time', 'sunk-cost', 'authority', 'exhaustion', 'social', 'pragmatism', 'small-scope'];
const MIN_SCENARIOS = 2;

const behaviorFile = (item) => path.join(item.path, 'evals', 'behavior.json');

// Returns null when the item has no behavior.json, else { scenarios, problems }.
function loadBehavior(item) {
  const file = behaviorFile(item);
  if (!fs.existsSync(file)) return null;
  let data;
  try {
    // Fake secrets are written as {{repeat:c:n}}, as in hook cases, so the repository never holds key-shaped strings.
    data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/\{\{repeat:(.):(\d+)\}\}/g, (_, c, n) => c.repeat(Number(n))));
  } catch (e) {
    return { scenarios: [], problems: [`evals/behavior.json is not valid JSON: ${e.message}`] };
  }
  return { scenarios: Array.isArray(data.scenarios) ? data.scenarios : [], problems: validate(data) };
}

function validate(data) {
  const problems = [];
  const list = data && Array.isArray(data.scenarios) ? data.scenarios : null;
  if (!list) return ['evals/behavior.json needs a "scenarios" array'];
  if (list.length < MIN_SCENARIOS) problems.push(`evals/behavior.json needs at least ${MIN_SCENARIOS} scenarios`);
  const names = new Set();
  list.forEach((s, i) => {
    const at = `scenario ${i + 1}${s && typeof s.name === 'string' ? ` "${s.name}"` : ''}`;
    if (!s || typeof s !== 'object') return problems.push(`${at} is not an object`);
    if (typeof s.name !== 'string' || !s.name.trim()) problems.push(`${at} needs a name`);
    else if (names.has(s.name)) problems.push(`${at}: duplicate name`);
    else names.add(s.name);
    if (typeof s.prompt !== 'string' || s.prompt.trim().length < 20) problems.push(`${at}: prompt must be at least 20 characters`);
    const strings = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim().length >= 10);
    if (!strings(s.expect) || !s.expect.length) problems.push(`${at}: "expect" must be a non-empty list of criteria (10+ characters each)`);
    if (s.forbid !== undefined && !strings(s.forbid)) problems.push(`${at}: "forbid" must be a list of criteria (10+ characters each)`);
    if (s.pressure !== undefined && (!Array.isArray(s.pressure) || s.pressure.some((p) => !PRESSURES.includes(p)))) problems.push(`${at}: "pressure" values must be from ${PRESSURES.join(', ')}`);
    if (s.files !== undefined && (typeof s.files !== 'object' || Array.isArray(s.files) || Object.entries(s.files).some(([k, v]) => typeof v !== 'string' || path.isAbsolute(k) || k.split(/[\\/]/).includes('..')))) {
      problems.push(`${at}: "files" maps relative paths to file contents`);
    }
  });
  return problems;
}

module.exports = { loadBehavior, validate, behaviorFile, PRESSURES, MIN_SCENARIOS };
