#!/usr/bin/env node
'use strict';

// Counts machine-sounding patterns in a text, by the tiers in ../SKILL.md, with line:column for each hit.
// Detect only: it never rewrites wording. --strip-invisible prints the text with invisible format
// characters removed (no-break and thin spaces become plain spaces) and writes nothing else.
// Usage: node prose-scan.js <file | -> [--json] [--strip-invisible]
// Exit: 0 no tier-1 hits, 1 tier-1 hits (chatbot residue, placeholders, unsourced attributions,
// invisible characters), 2 bad arguments or unreadable input.

const fs = require('fs');

// Zero-width and format characters that keyboards don't type and editors don't show.
const INVISIBLE = /[​-‏⁠-⁤﻿­᠎؜‪-‮⁦-⁩]|\uDB40[\uDC00-\uDC7F]/g;
const ODD_SPACE = /[       　]/g;

const TIER1 = [
  ['assistant framing', /\b(?:as an ai(?: language model)?|i hope this helps|great question|certainly!|here is (?:a|the) revised version|let me know if you(?:'d| would) like|as of my last (?:update|training))(?!\w)/gi],
  ['placeholder', /\{\{[^}]*\}\}|\[(?:your|insert|add|company|name|client|number|statistic)[^\]]*\]|\bXX%|\blorem ipsum\b/gi],
  ['unsourced attribution', /\b(?:studies (?:show|suggest|have shown)|research (?:shows|suggests|has shown)|experts (?:agree|say|believe)|it is widely (?:believed|known)|many (?:believe|say))\b/gi],
];
const TIER2 = [
  ['stock vocabulary', /\b(?:delv(?:e|es|ed|ing)|tapestry|realm|leverag(?:e|es|ed|ing)|harness(?:es|ed|ing)?|utiliz(?:e|es|ed|ing)|empower(?:s|ed|ing)?|robust|seamless(?:ly)?|cutting-edge|game-chang(?:er|ing)|transformative|crucial|pivotal|paramount|foster(?:s|ed|ing)?|underscor(?:e|es|ed|ing)|showcas(?:e|es|ed|ing)|testament to|meticulous(?:ly)?|intricate|multifaceted|elevat(?:e|es|ed|ing)|unlock(?:s|ed|ing)?|supercharg(?:e|es|ed|ing)|streamlin(?:e|es|ed|ing))\b/gi],
  ['stock opener or closer', /\b(?:in today's (?:fast-paced|digital|ever-changing) world|in the ever-evolving (?:landscape|world) of|have you ever wondered|in conclusion|at the end of the day|the future is bright|let that sink in|here's the thing)\b/gi],
  ['false contrast', /\b(?:it's not|it is not|it isn't|this isn't|this is not) (?:just|only|merely|about)\b[^.!?\n]{0,60}[,;.]\s*(?:it's|it is)\b/gi],
  ['signposting', /\b(?:it's (?:important|worth) (?:to note|noting|mentioning)|let's (?:break it down|dive in|unpack))\b/gi],
  ['empty intensifier', /\b(?:truly|incredibly|absolutely|deeply)\b/gi],
];
const TYPO = [
  ['em dash', /—/g],
  ['curly quote', /[‘’“”]/g],
  ['ellipsis character', /…/g],
];

function position(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  return `${line}:${index - before.lastIndexOf('\n')}`;
}

function hits(text, rules, tier) {
  const out = [];
  for (const [kind, re] of rules) {
    for (const m of text.matchAll(re)) out.push({ tier, kind, span: m[0], at: position(text, m.index) });
  }
  return out;
}

function sentenceStats(text) {
  const lengths = text
    .replace(/https?:\/\/\S+/g, '')
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim().split(/\s+/).filter((w) => /\w/.test(w)).length)
    .filter((n) => n >= 3);
  if (lengths.length < 6) return { sentences: lengths.length, uniform: false };
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const sd = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length);
  const cv = sd / mean;
  return { sentences: lengths.length, meanWords: +mean.toFixed(1), variation: +cv.toFixed(2), uniform: cv < 0.3 };
}

function scan(text) {
  const words = (text.match(/[\p{L}\p{N}'-]+/gu) || []).length;
  const plain = text.replace(/[\u2018\u2019]/g, "'"); // same length, so positions still match the original
  const found = [...hits(plain, TIER1, 1), ...hits(plain, TIER2, 2), ...hits(text, TYPO, 3)];
  for (const m of text.matchAll(INVISIBLE)) {
    const cp = m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    found.push({ tier: 1, kind: 'invisible character', span: `U+${cp}`, at: position(text, m.index) });
  }
  for (const m of text.matchAll(ODD_SPACE)) {
    found.push({ tier: 3, kind: 'non-standard space', span: `U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`, at: position(text, m.index) });
  }
  const stats = sentenceStats(text);
  if (stats.uniform) found.push({ tier: 3, kind: 'uniform sentence length', span: `variation ${stats.variation} over ${stats.sentences} sentences`, at: '-' });
  const count = (t) => found.filter((f) => f.tier === t).length;
  return {
    words,
    tiers: { 1: count(1), 2: count(2), 3: count(3) },
    tier2Per100Words: words ? +((count(2) * 100) / words).toFixed(1) : 0,
    sentences: stats,
    findings: found.sort((a, b) => a.tier - b.tier || a.at.localeCompare(b.at, undefined, { numeric: true })),
  };
}

const strip = (text) => text.replace(INVISIBLE, '').replace(ODD_SPACE, ' ');

function report(r, label) {
  const lines = [`Prose scan: ${label}  (${r.words} words)`, `Tier 1: ${r.tiers[1]}   Tier 2: ${r.tiers[2]} (${r.tier2Per100Words} per 100 words)   Tier 3: ${r.tiers[3]}`];
  if (r.sentences.meanWords) lines.push(`Sentences: ${r.sentences.sentences}, mean ${r.sentences.meanWords} words, variation ${r.sentences.variation}`);
  if (!r.findings.length) lines.push('', 'No pattern hits. This is a count of known patterns, not a verdict on the writing; still read it.');
  else {
    lines.push('', '| Tier | At | Kind | Span |', '|---|---|---|---|');
    for (const f of r.findings) lines.push(`| ${f.tier} | ${f.at} | ${f.kind} | ${f.span.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
  }
  lines.push('', 'Counts point at spans to read; they do not say who wrote the text.');
  return lines.join('\n') + '\n';
}

function main(argv) {
  let file;
  const opts = {};
  for (const a of argv) {
    if (a === '--json') opts.json = true;
    else if (a === '--strip-invisible') opts.strip = true;
    else if (a.startsWith('--')) return fail(`unknown option ${a}`);
    else if (file) return fail('give one file, or - for stdin');
    else file = a;
  }
  if (!file) return fail('give a file, or - for stdin');
  let text;
  try {
    text = fs.readFileSync(file === '-' ? 0 : file, 'utf8');
  } catch (e) {
    return fail(`cannot read ${file}: ${e.code || e.message}`);
  }
  if (opts.strip) {
    process.stdout.write(strip(text));
    return 0;
  }
  const r = scan(text);
  process.stdout.write(opts.json ? JSON.stringify(r, null, 2) + '\n' : report(r, file === '-' ? 'stdin' : file));
  return r.tiers[1] ? 1 : 0;
}

function fail(msg) {
  process.stderr.write(`prose-scan: ${msg}\n`);
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { scan, strip };
