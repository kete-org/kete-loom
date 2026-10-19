#!/usr/bin/env node
'use strict';

// Checks a LinkedIn post or comment draft for format problems before the user copies it.
// Errors: over the length limit, unfilled {{placeholders}} or [brackets]. Warnings: a hook line likely to
// be cut before "see more", hashtag walls, reflex engagement bait, wall-of-text paragraphs, words the
// voice profile bans. Notes: links in the body, the character count against the usual working range.
// Usage: node post-check.js <file | -> [--kind post|comment] [--voice voice.md] [--json]
// Exit: 0 no errors, 1 errors, 2 bad arguments or unreadable input. Read-only; it never posts anything.

const fs = require('fs');

const LIMITS = { post: 3000, comment: 1250 };
// Approximate: LinkedIn truncates by rendered width and line count, which vary by device.
const HOOK_MOBILE = 140;
const BAIT = /(?:^|\n)\s*(?:thoughts\??|agree\??|what do you think\??|comment ["']?\w+["']? (?:below|if)|like (?:if|this if)|tag (?:someone|a friend)|repost if|follow me for more)\s*[.!?]*\s*$/im;

const chars = (s) => [...s].length;

function bannedWords(voiceFile) {
  const text = fs.readFileSync(voiceFile, 'utf8');
  const m = text.match(/words i would never use[^:\n]*:\**\s*([^\n]*)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;]/)
    .map((w) => w.replace(/["'`*()]/g, '').trim().toLowerCase())
    .filter((w) => w && !/^\(.*\)$/.test(w));
}

function check(text, { kind = 'post', banned = [] } = {}) {
  const issues = [];
  const add = (level, rule, detail) => issues.push({ level, rule, detail });
  const body = text.replace(/\s+$/, '');
  const length = chars(body);
  const limit = LIMITS[kind];
  if (length > limit) add('error', 'length', `${length} characters; LinkedIn allows ${limit} for a ${kind}`);

  for (const m of body.matchAll(/\{\{[^}]*\}\}|\[(?!\d+\])[^\]\n]{1,40}\]/g)) add('error', 'placeholder', `unfilled "${m[0]}": fill it from the user's own material or ask; never invent it`);

  const lines = body.split('\n');
  const hook = lines.find((l) => l.trim()) || '';
  if (kind === 'post') {
    if (chars(hook) > HOOK_MOBILE) add('warn', 'hook', `first line is ${chars(hook)} characters; around ${HOOK_MOBILE} show on mobile before "see more"`);
    if (length < 400) add('note', 'length', `${length} characters is short for a text post; a common working range is 900-1,300`);
    else if (length > 2000) add('note', 'length', `${length} characters; every line past the first screen has to earn its place`);
  }

  const tags = body.match(/(?:^|\s)#[\p{L}\p{N}_]+/gu) || [];
  if (tags.length > 3) add('warn', 'hashtags', `${tags.length} hashtags; use at most three real topics people follow`);

  const bait = body.match(BAIT);
  if (bait) add('warn', 'engagement-bait', `closing line "${bait[0].trim()}" could end any post; ask a question only this post can ask, or give one instruction`);

  for (const para of body.split(/\n\s*\n/)) {
    if (para.split('\n').length > 4 || chars(para) > 400) add('warn', 'wall-of-text', `paragraph starting "${para.trim().slice(0, 40)}..." is long for the feed; split it`);
  }

  const urls = body.match(/https?:\/\/\S+/g) || [];
  if (urls.length && kind === 'post') add('note', 'links', `${urls.length} link(s) in the body; many writers put links in the first comment instead. Follow the user's practice`);

  const lower = body.toLowerCase();
  for (const w of banned) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
    if (re.test(lower)) add('warn', 'voice', `uses "${w}", which the voice profile says you would never use`);
  }

  return { kind, length, limit, hookLength: chars(hook), hashtags: tags.length, links: urls.length, issues, errors: issues.filter((i) => i.level === 'error').length };
}

function main(argv) {
  let file;
  const opts = { kind: 'post' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--kind' || a === '--voice') {
      if (argv[i + 1] === undefined) return fail(`${a} needs a value`);
      opts[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--')) return fail(`unknown option ${a}`);
    else if (file) return fail('give one file, or - for stdin');
    else file = a;
  }
  if (!file) return fail('give a file, or - for stdin');
  if (!LIMITS[opts.kind]) return fail('--kind must be post or comment');
  let text;
  let banned = [];
  try {
    text = fs.readFileSync(file === '-' ? 0 : file, 'utf8');
    if (opts.voice) banned = bannedWords(opts.voice);
  } catch (e) {
    return fail(`cannot read ${e.path || file}: ${e.code || e.message}`);
  }
  const r = check(text, { kind: opts.kind, banned });
  if (opts.json) process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  else {
    process.stdout.write(`${r.kind}: ${r.length}/${r.limit} characters, hook ${r.hookLength}, ${r.hashtags} hashtag(s), ${r.links} link(s)\n`);
    for (const i of r.issues) process.stdout.write(`  ${i.level.toUpperCase().padEnd(5)} ${i.rule}: ${i.detail}\n`);
    if (!r.issues.length) process.stdout.write('  no format issues\n');
  }
  return r.errors ? 1 : 0;
}

function fail(msg) {
  process.stderr.write(`post-check: ${msg}\n`);
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { check, bannedWords };
