'use strict';

// Skill observations: a durable log of what real work teaches about skills, rules and agents, kept
// between sessions and turned into staged, approved changes by a periodic review (/skill-review).
//
// Layout (one stable user-scope root, never a checkout that gets deleted):
//   $KETE_LOOM_OBSERVATIONS_DIR, default ~/.kete-loom/observations/
//     log/NNNN-slug.md        one observation per file: frontmatter + Issue / Improvement / Principle
//     log/archive/            resolved observations, moved here the day after they were resolved
//     log/archive/.id-floor   the highest id ever issued, so ids never restart or repeat
//     last-review.txt         date of the last completed review, or "never"
//     staged/<date>/          changes a review prepared, waiting for the user to approve
//
// The rules live in the write path rather than in prose: create() derives the id, sweeps resolved
// entries into the archive, refuses a restatement of an open finding, and never overwrites a file;
// scan() counts the log two independent ways and says so when they disagree, so an empty result is
// never mistaken for an empty log. Zero dependencies.
//
// The approach is adapted from Task Observer ("One Skill to Rule Them All") by Eoghan Henn and
// contributors (github.com/rebelytics/one-skill-to-rule-them-all, CC BY 4.0); the code is new.

const fs = require('fs');
const os = require('os');
const path = require('path');

const STATUSES = ['open', 'actioned', 'declined', 'superseded', 'parked'];
const RESOLVED = ['actioned', 'declined', 'superseded'];
const KINDS = ['improve', 'new-skill', 'simplify', 'violation'];
const TYPES = ['open-source', 'internal'];
const REVIEW_DAYS = 7;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const root = (env = process.env, home = os.homedir()) => path.resolve(env.KETE_LOOM_OBSERVATIONS_DIR || path.join(home, '.kete-loom', 'observations'));
const paths = (dir = root()) => ({
  root: dir,
  log: path.join(dir, 'log'),
  archive: path.join(dir, 'log', 'archive'),
  floor: path.join(dir, 'log', 'archive', '.id-floor'),
  lastReview: path.join(dir, 'last-review.txt'),
  staged: path.join(dir, 'staged'),
});
const today = (now = new Date()) => now.toISOString().slice(0, 10);

// Idempotent: creates whatever is missing and leaves everything else alone.
function init(dir = root()) {
  const p = paths(dir);
  fs.mkdirSync(path.join(p.archive, '.id-claims'), { recursive: true });
  fs.mkdirSync(p.staged, { recursive: true });
  if (!fs.existsSync(p.floor)) fs.writeFileSync(p.floor, '0\n');
  if (!fs.existsSync(p.lastReview)) fs.writeFileSync(p.lastReview, 'never\n');
  return p;
}

// --- frontmatter: scalars and inline lists only, the subset this log writes -------------------------

const q = (s) => JSON.stringify(String(s)); // a JSON string is a valid double-quoted YAML scalar
const list = (a) => `[${(a || []).map(q).join(', ')}]`;

const DQ = /^"(?:[^"\\]|\\.)*"/;

function parseValue(raw) {
  const t = raw.trim();
  // A quoted value ends at its closing quote; only text after that can be a comment.
  if (t.startsWith('"')) {
    const m = DQ.exec(t);
    if (!m || !/^\s*(?:#.*)?$/.test(t.slice(m[0].length))) return null; // broken quoting: reported as suspect
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  if (t.startsWith('[')) {
    const close = t.lastIndexOf(']');
    if (close < 0) return null;
    const inner = t.slice(1, close).trim();
    if (!inner) return [];
    const out = [];
    for (const m of inner.matchAll(/\s*("(?:[^"\\]|\\.)*"|'[^']*'|[^,]+)\s*(?:,|$)/g)) {
      const v = parseValue(m[1]);
      if (v === null) return null;
      if (v !== '') out.push(v);
    }
    return out;
  }
  if (t.startsWith("'")) {
    const m = /^'((?:[^']|'')*)'/.exec(t);
    return m ? m[1].replace(/''/g, "'") : null;
  }
  return t.replace(/\s+#.*$/, '').trim();
}

// { data, body, suspect: [keys] } or null when the file has no frontmatter block.
function parse(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return null;
  const data = {};
  const suspect = [];
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!kv) {
      suspect.push(line.trim().slice(0, 40));
      continue;
    }
    const value = parseValue(kv[2]);
    // `key: a: b` unquoted is invalid YAML that some readers accept and others reject.
    if (value === null || (typeof value === 'string' && /:\s/.test(value) && !/^["']/.test(kv[2].trim()))) suspect.push(kv[1]);
    data[kv[1]] = value === null ? kv[2] : value;
  }
  return { data, body: text.slice(m[0].length), suspect };
}

function render(o) {
  const lines = [
    '---',
    `id: ${o.id}`,
    `title: ${q(o.title)}`,
    `status: ${o.status || 'open'}`,
    `kind: ${o.kind}`,
    `type: ${o.type}`,
    `skill: ${list(o.skill)}`,
    `proposes_skill: ${list(o.proposes_skill)}`,
    `target_file: ${list(o.target_file)}`,
    `rule: ${o.rule ? q(o.rule) : '""'}`,
    `siblings_checked: ${q(o.siblings_checked)}`,
    `area: ${q(o.area || '')}`,
    `date: ${o.date}`,
    `session_context: ${q(o.session_context || '')}`,
    `parked_until: ${q(o.parked_until || '')}`,
    `resolved: ${o.resolved || '""'}`,
    `resolution: ${q(o.resolution || '')}`,
    '---',
    '',
    `**Issue:** ${o.issue || ''}`,
    '',
    `**Suggested improvement:** ${o.improvement || ''}`,
    '',
    `**Principle:** ${o.principle || ''}`,
    '',
  ];
  return lines.join('\n');
}

// --- reading -------------------------------------------------------------------------------------

const idOf = (file) => {
  const m = /^(\d+)-/.exec(path.basename(file));
  return m ? Number(m[1]) : null;
};
const entries = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d+-.*\.md$/.test(f)).map((f) => path.join(dir, f)) : []);

function read(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    // A directory with an .md name, a file moved mid-scan, no permission: a suspect entry, never a crash.
    return { file, id: idOf(file), data: { status: 'open' }, body: '', suspect: [`unreadable (${e.code || e.message})`], hasFrontmatter: false };
  }
  const parsed = parse(text);
  const data = parsed ? parsed.data : {};
  // A missing status is open, never nonexistent: a review must still see it.
  return { file, id: idOf(file), data: { ...data, status: STATUSES.includes(data.status) ? data.status : 'open' }, body: parsed ? parsed.body : text, suspect: parsed ? parsed.suspect : ['no frontmatter'], hasFrontmatter: Boolean(parsed) };
}

const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// --- writing -------------------------------------------------------------------------------------

// Moves resolved observations into the archive once their resolved date is before today. Runs inside
// every create, so archival can't be forgotten.
function sweep(p, now = new Date()) {
  const moved = [];
  for (const file of entries(p.log)) {
    const o = read(file);
    const r = String(o.data.resolved || '');
    if (!RESOLVED.includes(o.data.status) || !/^\d{4}-\d{2}-\d{2}$/.test(r) || r >= today(now)) continue;
    const dest = path.join(p.archive, path.basename(file));
    if (fs.existsSync(dest)) continue;
    fs.renameSync(file, dest);
    moved.push(path.basename(file));
  }
  return moved;
}

function nextId(p) {
  const floorText = fs.existsSync(p.floor) ? fs.readFileSync(p.floor, 'utf8') : '0';
  const floor = Number((floorText.match(/\d+/) || ['0'])[0]);
  const claimDir = path.join(p.archive, '.id-claims');
  const claimed = fs.existsSync(claimDir) ? fs.readdirSync(claimDir).map(Number).filter(Number.isFinite) : [];
  const ids = [...entries(p.log), ...entries(p.archive)].map(idOf).filter((n) => n !== null).concat(claimed);
  return Math.max(floor, ...ids, 0) + 1;
}

const STOP = new Set(['the', 'and', 'for', 'not', 'does', 'did', 'with', 'when', 'that', 'this', 'into', 'from', 'was', 'were', 'are', 'its', 'has', 'had', 'but', 'again', 'agent', 'skill', 'still']);
const words = (s) => new Set(String(s).toLowerCase().normalize('NFKC').split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !STOP.has(w)));
// Jaccard over content words: titles that share most of their meaning, not merely a common prefix.
const overlap = (a, b) => {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return String(a).trim().toLowerCase() === String(b).trim().toLowerCase() ? 1 : 0;
  let n = 0;
  for (const w of x) if (y.has(w)) n++;
  return n / (x.size + y.size - n);
};

// Open observations that look like the same finding: a shared target and a mostly shared title.
function similar(dir, { title, skill = [], target_file = [] }) {
  const targets = new Set([...asList(skill), ...asList(target_file)]);
  return entries(paths(dir).log).map(read).filter((o) => o.data.status === 'open' && [...asList(o.data.skill), ...asList(o.data.target_file)].some((t) => targets.has(t)) && overlap(o.data.title, title) >= 0.6);
}

function validateNew(o) {
  const errors = [];
  if (!SLUG_RE.test(o.slug || '')) errors.push('slug must be kebab-case (a-z, 0-9, -)');
  if (!o.title || !String(o.title).trim()) errors.push('title is required');
  if (!KINDS.includes(o.kind)) errors.push(`kind must be one of ${KINDS.join(', ')}`);
  if (!TYPES.includes(o.type)) errors.push(`type must be one of ${TYPES.join(', ')}`);
  if (!asList(o.skill).length && !asList(o.proposes_skill).length && !asList(o.target_file).length) errors.push('name a target: --skill, --proposes-skill or --target-file');
  // The field that makes a skipped judgement visible: never blank.
  if (!o.siblings_checked || !String(o.siblings_checked).trim()) errors.push('siblings-checked is required: name the related skills you checked and the verdict, or "none: no related skills"');
  if (o.kind === 'violation' && !o.rule) errors.push('a violation names the rule it broke: --rule "<file or skill>: <rule>"');
  return errors;
}

// Creates one observation. Returns { file, id, archived } or throws with .code 'INVALID' | 'SIMILAR' | 'EXISTS'.
function create(dir, o, { force = false, now = new Date() } = {}) {
  const errors = validateNew(o);
  if (errors.length) throw Object.assign(new Error(errors.join('; ')), { code: 'INVALID' });
  const p = init(dir);
  const archived = sweep(p, now);
  const dupes = force ? [] : similar(dir, o);
  if (dupes.length) throw Object.assign(new Error('an open observation already records this finding'), { code: 'SIMILAR', similar: dupes.map((d) => ({ id: d.id, title: d.data.title, file: d.file })) });
  // Two sessions writing at once: each claims its id with an exclusive create, so they can't share one.
  const claims = path.join(p.archive, '.id-claims');
  fs.mkdirSync(claims, { recursive: true });
  let id = nextId(p);
  for (let tries = 0; ; tries++) {
    try {
      fs.writeFileSync(path.join(claims, String(id)), '', { flag: 'wx' });
      break;
    } catch (e) {
      if (e.code !== 'EEXIST' || tries > 50) throw e;
      id++;
    }
  }
  const file = path.join(p.log, `${String(id).padStart(4, '0')}-${o.slug}.md`);
  if ([...entries(p.log), ...entries(p.archive)].some((f) => idOf(f) === id)) throw Object.assign(new Error(`id ${id} is already used`), { code: 'EXISTS' });
  // 'wx' fails if the file exists: a create never overwrites.
  fs.writeFileSync(file, render({ ...o, id, date: today(now), status: 'open' }), { flag: 'wx' });
  const floor = Number((fs.readFileSync(p.floor, 'utf8').match(/\d+/) || ['0'])[0]);
  if (id > floor) fs.writeFileSync(p.floor, `${id}\n`); // after the create, so a failed write never moves the floor
  return { file, id, archived };
}

// Changes only the status-related frontmatter fields of one observation, leaving the rest byte for byte.
function setStatus(dir, id, { status, resolution = '', parked_until = '' }, { now = new Date() } = {}) {
  if (!STATUSES.includes(status)) throw Object.assign(new Error(`status must be one of ${STATUSES.join(', ')}`), { code: 'INVALID' });
  if (status === 'parked' && !parked_until.trim()) throw Object.assign(new Error('parked needs --until "<the condition that unparks it>"'), { code: 'INVALID' });
  if (RESOLVED.includes(status) && !resolution.trim()) throw Object.assign(new Error(`${status} needs --resolution "<what was done and where it now lives>"`), { code: 'INVALID' });
  const p = paths(dir);
  const file = [...entries(p.log), ...entries(p.archive)].find((f) => idOf(f) === Number(id));
  if (!file) throw Object.assign(new Error(`no observation ${id}`), { code: 'NOT_FOUND' });
  const text = fs.readFileSync(file, 'utf8');
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) throw Object.assign(new Error(`${path.basename(file)} has no frontmatter; fix it by hand`), { code: 'INVALID' });
  const set = { status, resolved: RESOLVED.includes(status) ? today(now) : '""', resolution: q(resolution), parked_until: q(status === 'parked' ? parked_until : '') };
  let head = m[1];
  const eol = head.includes('\r\n') ? '\r\n' : '\n';
  // Function replacers: user text such as "$&" or "$'" must be written literally.
  for (const [k, v] of Object.entries(set)) head = new RegExp(`^${k}:.*$`, 'm').test(head) ? head.replace(new RegExp(`^${k}:.*$`, 'm'), () => `${k}: ${v}`) : `${head}${eol}${k}: ${v}`;
  fs.writeFileSync(file, text.replace(m[1], () => head));
  // Reopening an archived observation brings it back where scans and hooks look.
  if (!RESOLVED.includes(status) && path.dirname(file) === p.archive) {
    const back = path.join(p.log, path.basename(file));
    if (!fs.existsSync(back)) {
      fs.renameSync(file, back);
      return { file: back };
    }
  }
  return { file };
}

// --- scanning ------------------------------------------------------------------------------------

// Reads frontmatter only. Counts files two ways; if they disagree, or files exist but none parsed,
// the scan reports itself broken instead of an empty log.
function scan(dir, { now = new Date() } = {}) {
  const p = paths(dir);
  if (!fs.existsSync(p.log)) return { exists: false, root: p.root };
  const files = entries(p.log);
  const listed = fs.readdirSync(p.log).filter((f) => f.endsWith('.md')).length;
  const items = files.map(read);
  const broken = [];
  if (listed !== files.length) broken.push(`${listed - files.length} .md file(s) in log/ without an NNNN- id prefix`);
  if (files.length && !items.some((o) => o.hasFrontmatter)) broken.push(`${files.length} file(s) present but no frontmatter could be read`);
  const open = items.filter((o) => o.data.status === 'open');
  const byTarget = {};
  for (const o of open) for (const t of [...asList(o.data.skill), ...asList(o.data.target_file), ...asList(o.data.proposes_skill).map((s) => `new: ${s}`)]) byTarget[t] = (byTarget[t] || 0) + 1;
  // A rule broken twice with no fix in between needs a barrier (a hook, a lint rule, a default), not new wording.
  const violations = {};
  for (const o of [...items, ...entries(p.archive).map(read)]) {
    if (o.data.kind !== 'violation' || !o.data.rule) continue;
    const v = (violations[o.data.rule] ||= { open: 0, ids: [] });
    if (o.data.status === 'open') {
      v.open++;
      v.ids.push(o.id);
    }
  }
  const barriers = Object.entries(violations).filter(([, v]) => v.open >= 2).map(([rule, v]) => ({ rule, ids: v.ids }));
  const last = fs.existsSync(p.lastReview) ? fs.readFileSync(p.lastReview, 'utf8').trim() : 'never';
  const days = /^\d{4}-\d{2}-\d{2}$/.test(last) ? Math.floor((Date.parse(today(now)) - Date.parse(last)) / 86400000) : null;
  const staged = fs.existsSync(p.staged) ? fs.readdirSync(p.staged).filter((d) => !d.startsWith('.')) : [];
  return {
    exists: true,
    root: p.root,
    total: items.length,
    open: open.length,
    parked: items.filter((o) => o.data.status === 'parked').length,
    archived: entries(p.archive).length,
    byTarget,
    barriers,
    suspect: items.filter((o) => o.suspect.length).map((o) => ({ id: o.id, keys: o.suspect })),
    missingSiblings: open.filter((o) => !String(o.data.siblings_checked || '').trim()).map((o) => o.id),
    lastReview: last,
    reviewDue: open.length > 0 && (days === null || days >= REVIEW_DAYS),
    daysSinceReview: days,
    staged,
    broken,
    items: open.map((o) => ({ id: o.id, title: o.data.title, kind: o.data.kind, skill: asList(o.data.skill), proposes_skill: asList(o.data.proposes_skill), target_file: asList(o.data.target_file), date: o.data.date })),
  };
}

function show(dir, id) {
  const p = paths(dir);
  const file = [...entries(p.log), ...entries(p.archive)].find((f) => idOf(f) === Number(id));
  if (!file) throw Object.assign(new Error(`no observation ${id}`), { code: 'NOT_FOUND' });
  return { file, text: fs.readFileSync(file, 'utf8') };
}

function markReviewed(dir, { now = new Date() } = {}) {
  const p = init(dir);
  fs.writeFileSync(p.lastReview, `${today(now)}\n`);
  return today(now);
}

module.exports = { root, paths, init, parse, render, create, setStatus, scan, show, similar, sweep, markReviewed, STATUSES, KINDS, TYPES, REVIEW_DAYS };
