#!/usr/bin/env node
'use strict';

// Picks the next version from the Conventional Commits since the last vX.Y.Z tag
// (major for `!` or BREAKING CHANGE, minor for feat, patch otherwise; see docs/RELEASING.md)
// and, with --write, sets it in package.json and every plugin manifest. Prints the new
// version, or nothing when there are no commits to release.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { REPO_ROOT } = require('./lib/skills');

const VERSION_FILES = [
  'package.json',
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  '.codex-plugin/plugin.json',
  '.agents/plugins/marketplace.json',
  'gemini-extension.json',
];

function nextVersion(current, messages) {
  if (!messages.length) return null;
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`not a release version: ${current}`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (messages.some((s) => /^\w+(\([^)]*\))?!:/.test(s) || /^BREAKING[ -]CHANGE:/m.test(s))) return `${major + 1}.0.0`;
  if (messages.some((s) => /^feat(\([^)]*\))?:/.test(s))) return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

// Replaces the one "version" value in each file, keeping its formatting.
function writeVersion(root, version) {
  for (const file of VERSION_FILES) {
    const p = path.join(root, file);
    const text = fs.readFileSync(p, 'utf8');
    const matches = text.match(/"version": "[^"]*"/g) || [];
    if (matches.length !== 1) throw new Error(`${file}: expected one "version" field, found ${matches.length}`);
    fs.writeFileSync(p, text.replace(/"version": "[^"]*"/, `"version": "${version}"`));
  }
}

function commitsSinceTag(root) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const tag = git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*').trim();
  return git('log', '--format=%B%x00', `${tag}..HEAD`).split('\0').map((s) => s.trim()).filter(Boolean);
}

if (require.main === module) {
  const current = require(path.join(REPO_ROOT, 'package.json')).version;
  const next = nextVersion(current, commitsSinceTag(REPO_ROOT));
  if (next && process.argv.includes('--write')) writeVersion(REPO_ROOT, next);
  if (next) console.log(next);
}

module.exports = { nextVersion, writeVersion, VERSION_FILES };
