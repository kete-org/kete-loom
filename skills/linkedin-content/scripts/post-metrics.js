#!/usr/bin/env node
'use strict';

// Computes per-post engagement metrics from a LinkedIn analytics export saved as CSV (or any CSV with
// impressions, reactions, comments and reposts columns), ranks the posts and compares groups.
// It reports observed numbers only; recommendations are the agent's job and must be labelled as such.
// Usage: node post-metrics.js <posts.csv> [--followers N] [--group <column>]... [--top 5] [--json]
// Exit: 0 report written, 2 bad arguments, unreadable file or missing columns. Read-only.

const fs = require('fs');

const COLUMNS = {
  impressions: /^impressions?$|^views?$/,
  reactions: /^reactions?$|^likes?$/,
  comments: /^comments?$/,
  reposts: /^reposts?$|^shares?$|^reshares?$/,
  saves: /^saves?$/,
  sends: /^sends?$/,
  title: /^(?:post title|post|title|text|commentary|post url|url|link)$/,
  date: /^(?:created date|post publish date|date|published|published at)$/,
};
const MIN_POSTS_FOR_PATTERN = 10;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const pct = (x) => (x == null ? '-' : `${(x * 100).toFixed(1)}%`);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function analyse(rows, { followers, groups = [], top = 5 } = {}) {
  const [header, ...data] = rows;
  if (!header) throw new Error('the file is empty');
  const norm = header.map((h) => h.trim().toLowerCase());
  const col = Object.fromEntries(Object.entries(COLUMNS).map(([k, re]) => [k, norm.findIndex((h) => re.test(h))]));
  const missing = ['impressions', 'reactions', 'comments'].filter((k) => col[k] < 0);
  if (missing.length) throw new Error(`missing column(s): ${missing.join(', ')}; columns found: ${header.join(', ')}`);
  const groupIdx = groups.map((g) => {
    const i = norm.indexOf(g.toLowerCase());
    if (i < 0) throw new Error(`no column "${g}" to group by`);
    return [g, i];
  });

  const posts = [];
  const skipped = [];
  data.forEach((r, n) => {
    const get = (k) => (col[k] >= 0 ? num(r[col[k]]) : null);
    const impressions = get('impressions');
    const label = (col.title >= 0 && r[col.title]) || `row ${n + 2}`;
    if (!impressions || impressions <= 0) return skipped.push(`${label}: no impressions`);
    const reactions = get('reactions') ?? 0;
    const comments = get('comments') ?? 0;
    const reposts = get('reposts') ?? 0;
    posts.push({
      post: label.length > 70 ? `${label.slice(0, 67)}...` : label,
      date: col.date >= 0 ? r[col.date] : undefined,
      impressions,
      reactions,
      comments,
      reposts,
      engagementRate: (reactions + comments + reposts) / impressions,
      commentRatio: reactions ? comments / reactions : null,
      reachMultiple: followers ? impressions / followers : null,
      saveRate: get('saves') != null ? get('saves') / impressions : null,
      groups: Object.fromEntries(groupIdx.map(([g, i]) => [g, (r[i] || '(blank)').trim()])),
    });
  });

  const byRate = [...posts].sort((a, b) => b.engagementRate - a.engagementRate);
  const groupStats = groupIdx.map(([g]) => {
    const buckets = {};
    for (const p of posts) (buckets[p.groups[g]] ||= []).push(p.engagementRate);
    return {
      column: g,
      values: Object.entries(buckets)
        .map(([value, rates]) => ({ value, n: rates.length, meanEngagementRate: mean(rates) }))
        .sort((a, b) => b.meanEngagementRate - a.meanEngagementRate),
    };
  });
  return {
    posts: posts.length,
    skipped,
    followers: followers || null,
    enoughForPatterns: posts.length >= MIN_POSTS_FOR_PATTERN,
    medianEngagementRate: byRate.length ? byRate[Math.floor(byRate.length / 2)].engagementRate : null,
    top: byRate.slice(0, top),
    bottom: byRate.slice(-top).reverse().filter((p) => !byRate.slice(0, top).includes(p)),
    groups: groupStats,
  };
}

function render(r) {
  const row = (p) => `  ${pct(p.engagementRate).padStart(6)}  ${String(p.impressions).padStart(7)} imp  comments/reactions ${p.commentRatio == null ? '-' : p.commentRatio.toFixed(2)}${p.reachMultiple == null ? '' : `  reach x${p.reachMultiple.toFixed(2)}`}  ${p.post}`;
  const out = [`OBSERVED  ${r.posts} post(s)${r.skipped.length ? `, ${r.skipped.length} skipped (no impressions)` : ''}`, `Median engagement rate: ${pct(r.medianEngagementRate)}  ((reactions + comments + reposts) / impressions)`];
  if (!r.followers) out.push('Reach multiple not computed: pass --followers N to compare impressions with audience size.');
  out.push('', 'TOP BY ENGAGEMENT RATE', ...r.top.map(row));
  if (r.bottom.length) out.push('', 'BOTTOM', ...r.bottom.map(row));
  for (const g of r.groups) {
    out.push('', `BY ${g.column.toUpperCase()}`);
    for (const v of g.values) out.push(`  ${pct(v.meanEngagementRate).padStart(6)}  n=${v.n}${v.n < 3 ? ' (too few to compare)' : ''}  ${v.value}`);
  }
  out.push('', r.enoughForPatterns ? `${r.posts} posts: enough to look for patterns; still state each finding with its n.` : `Only ${r.posts} post(s): too few to call a pattern (need ${MIN_POSTS_FOR_PATTERN}+). Report the numbers, not conclusions.`);
  return out.join('\n') + '\n';
}

function main(argv) {
  let file;
  const opts = { groups: [], top: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--followers' || a === '--group' || a === '--top') {
      if (argv[i + 1] === undefined) return fail(`${a} needs a value`);
      const v = argv[++i];
      if (a === '--group') opts.groups.push(v);
      else opts[a.slice(2)] = Number(v);
    } else if (a.startsWith('--')) return fail(`unknown option ${a}`);
    else if (file) return fail('give one CSV file');
    else file = a;
  }
  if (!file) return fail('give a CSV file (save the LinkedIn export sheet with the per-post rows as CSV)');
  if (opts.followers !== undefined && !(opts.followers > 0)) return fail('--followers must be a positive number');
  if (!(opts.top > 0)) return fail('--top must be a positive number');
  let r;
  try {
    r = analyse(parseCsv(fs.readFileSync(file, 'utf8')), opts);
  } catch (e) {
    return fail(e.code ? `cannot read ${file}: ${e.code}` : e.message);
  }
  process.stdout.write(opts.json ? JSON.stringify(r, null, 2) + '\n' : render(r));
  return 0;
}

function fail(msg) {
  process.stderr.write(`post-metrics: ${msg}\n`);
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { parseCsv, analyse };
