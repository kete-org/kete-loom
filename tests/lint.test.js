'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadSkill } = require('../scripts/lib/skills');
const { lintSkill, lintManifests } = require('../scripts/lint-skills');
const { parseFrontmatter } = require('../scripts/lib/frontmatter');

function makeSkill(name, frontmatter, body = '# Title\n', withEvals = true) {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kl-lint-')), name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n${body}`);
  if (withEvals) {
    fs.mkdirSync(path.join(dir, 'evals'));
    fs.writeFileSync(
      path.join(dir, 'evals', 'triggers.json'),
      JSON.stringify({ should_trigger: ['aaaaaaaaaaa1', 'aaaaaaaaaaa2', 'aaaaaaaaaaa3'], should_not_trigger: ['bbbbbbbbbbb1', 'bbbbbbbbbbb2', 'bbbbbbbbbbb3'] })
    );
  }
  return loadSkill(dir);
}

const GOOD = `name: good-skill
description: Does a well-defined thing for coding agents in a careful and repeatable way. Use when the user asks for that thing.
license: MIT
metadata:
  kete-loom/version: "1.0.0"
  kete-loom/category: coding
  kete-loom/risk: read-only`;

test('a valid skill passes', () => {
  const { errors } = lintSkill(makeSkill('good-skill', GOOD));
  assert.deepStrictEqual(errors, []);
});

test('name must match folder and pattern', () => {
  const { errors } = lintSkill(makeSkill('other-folder', GOOD));
  assert.ok(errors.some((e) => e.includes('must equal folder name')));
  const bad = lintSkill(makeSkill('Bad_Name', GOOD.replace('good-skill', 'Bad_Name')));
  assert.ok(bad.errors.some((e) => e.includes('must match')));
});

test('description must say when to use it', () => {
  const { errors } = lintSkill(makeSkill('good-skill', GOOD.replace('Use when the user asks for that thing.', 'It is very good indeed and helpful.')));
  assert.ok(errors.some((e) => e.includes('Use when')));
});

test('unknown top-level keys and multi-line scalars are rejected', () => {
  const { errors } = lintSkill(makeSkill('good-skill', GOOD + '\ntools: Bash'));
  assert.ok(errors.some((e) => e.includes('unknown top-level key')));
  const p = parseFrontmatter('---\ndescription: >\n  folded\n---\n');
  assert.ok(p.errors.length > 0);
});

test('missing evals and broken references fail', () => {
  const { errors } = lintSkill(makeSkill('good-skill', GOOD, 'See `references/missing.md`.\n', false));
  assert.ok(errors.some((e) => e.includes('evals/triggers.json')));
  assert.ok(errors.some((e) => e.includes('references/missing.md')));
});

test('overlong SKILL.md fails', () => {
  const { errors } = lintSkill(makeSkill('good-skill', GOOD, 'line\n'.repeat(400)));
  assert.ok(errors.some((e) => e.includes('limit is 300')));
});

test('plugin manifests agree on version', () => {
  assert.deepStrictEqual(lintManifests(), []);
});

test('a SKILL.md of exactly 300 lines passes', () => {
  const head = `---\n${GOOD}\n---\n`.split('\n').length - 1;
  const { errors } = lintSkill(makeSkill('good-skill', GOOD, 'line\n'.repeat(300 - head)));
  assert.ok(!errors.some((e) => e.includes('limit is 300')), errors.join('; '));
});

test('a quoted metadata value must be one complete string', () => {
  const broken = parseFrontmatter('---\nname: x\nmetadata:\n  kete-loom/requires: "git"\\n  kete-loom/argument-hint: "a"\n---\n');
  assert.ok(broken.errors.some((e) => e.includes('unclosed or mismatched quote')));
  assert.deepStrictEqual(parseFrontmatter('---\nname: x\nmetadata:\n  a: "git, node"\n  b: \'it\'\'s\'\n  c: "x" # note\n---\n').errors, []);
});

test('an unquoted description containing " #" is an error, a quoted one is fine', () => {
  const { lintItem } = require('../scripts/lib/lint');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { loadSkill } = require('../scripts/lib/skills');
  const make = (desc) => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kl-hash-')), 'rust-thing');
    fs.mkdirSync(path.join(dir, 'evals'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: rust-thing\ndescription: ${desc}\nlicense: MIT\nmetadata:\n  kete-loom/version: "0.1.0"\n  kete-loom/category: coding\n  kete-loom/risk: read-only\n---\n\n# Rust thing\n\nBody.\n`);
    fs.writeFileSync(path.join(dir, 'evals', 'triggers.json'), JSON.stringify({ should_trigger: ['a a a a a a a a a a', 'b b b b b b b b b b', 'c c c c c c c c c c'], should_not_trigger: ['d d d d d d d d d d', 'e e e e e e e e e e', 'f f f f f f f f f f'] }));
    return lintItem(loadSkill(dir)).errors;
  };
  const text = 'Writes Rust tests with cargo test, covering #[cfg(test)] unit modules and integration tests. Use when writing Rust tests.';
  assert.ok(make(text).some((e) => /contains " #" unquoted/.test(e)));
  assert.ok(!make(JSON.stringify(text)).some((e) => /contains " #"/.test(e)));
});

test('a missing description is reported, not a crash', () => {
  const { lintItem } = require('../scripts/lib/lint');
  const errors = lintItem({ kind: 'skill', dir: 'x', path: '/nonexistent', file: '/nonexistent/SKILL.md', text: '---\nname: x\nlicense: MIT\n---\n', body: '', data: { name: 'x', license: 'MIT', metadata: {} }, parseErrors: [], tools: null, paths: [] }).errors;
  assert.ok(errors.includes('missing "description"'), errors.join('; '));
});
