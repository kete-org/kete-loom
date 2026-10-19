'use strict';

// Once per session, when the agent finishes with uncommitted changes, asks it to propose up to three
// lessons for /learn. Saves nothing itself. check({ cwd, session, again }) -> verdict.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const KEEP_MS = 14 * 24 * 60 * 60 * 1000;

const stateFile = () => path.join(process.env.KETE_LOOM_STATE_DIR || path.join(os.homedir(), '.kete-loom', 'state'), 'capture-lessons.json');

// When the observation log exists, lessons go there, to be reviewed later, instead of into the reply.
const observationLog = () => fs.existsSync(path.join(path.resolve(process.env.KETE_LOOM_OBSERVATIONS_DIR || path.join(os.homedir(), '.kete-loom', 'observations')), 'log'));

function check(event, now = Date.now()) {
  if (event.again) return { block: false };
  const cwd = path.resolve(event.cwd || process.cwd());
  let status;
  try {
    status = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
  } catch {
    return { block: false };
  }
  if (!status.trim()) return { block: false };
  const file = stateFile();
  let asked = {};
  try {
    asked = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // first run
  }
  for (const k of Object.keys(asked)) if (!(now - asked[k] < KEEP_MS)) delete asked[k];
  const key = event.session || `${cwd}@${new Date(now).toISOString().slice(0, 10)}`;
  if (asked[key]) return { block: false };
  asked[key] = now;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(asked));
  } catch {
    return { block: false }; // without the record it would ask on every stop
  }
  return {
    block: true,
    reason: observationLog()
      ? 'kete-loom (capture-lessons): before you finish, check whether this session taught anything reusable: a correction the user gave, a rule you broke, a step a skill was missing, or a workflow worth turning into a skill. Log each with the skill-observations skill (`kete-loom observe new`), at most 3, without asking the user to act on them now. If there is nothing worth keeping, reply "No observations" and stop.'
      : 'kete-loom (capture-lessons): before you finish, list at most 3 lessons from this session worth keeping for next time: a mistake you made, a correction the user gave, or a non-obvious fact about this project. One line each, with the evidence. Do not save them anywhere; the user decides with /learn. If there is nothing worth keeping, reply "No lessons" and stop.',
  };
}

module.exports = { check };
