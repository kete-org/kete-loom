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
