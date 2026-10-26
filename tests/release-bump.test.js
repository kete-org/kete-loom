'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { nextVersion, writeVersion, VERSION_FILES } = require('../scripts/release-bump');

test('nextVersion returns null when there is nothing to release', () => {
  assert.strictEqual(nextVersion('0.6.0', []), null);
});

test('nextVersion bumps patch for fixes, docs and chores', () => {
  assert.strictEqual(nextVersion('0.6.0', ['fix(hooks): quote paths', 'docs: typo', 'chore: tidy']), '0.6.1');
});

test('nextVersion bumps minor when any commit is a feat', () => {
  assert.strictEqual(nextVersion('0.6.3', ['fix: x', 'feat(code-scanning): add scanners']), '0.7.0');
});

test('nextVersion bumps major for a ! type or a BREAKING CHANGE footer', () => {
  assert.strictEqual(nextVersion('0.6.0', ['feat(cli)!: rename install flags']), '1.0.0');
  assert.strictEqual(nextVersion('1.2.3', ['fix: x\n\nBREAKING CHANGE: drops Node 18']), '2.0.0');
});

test('nextVersion rejects a version it cannot bump', () => {
  assert.throws(() => nextVersion('1.0.0-beta.1', ['fix: x']), /not a release version/);
});

test('writeVersion sets every manifest and keeps the rest of each file byte for byte', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-bump-'));
  for (const file of VERSION_FILES) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), `{\n  "name": "x",\n  "version": "0.6.0",\n  "dependencies": { "a": "1.0.0" }\n}\n`);
  }
  writeVersion(root, '0.7.0');
  for (const file of VERSION_FILES) {
    assert.strictEqual(fs.readFileSync(path.join(root, file), 'utf8'), `{\n  "name": "x",\n  "version": "0.7.0",\n  "dependencies": { "a": "1.0.0" }\n}\n`);
  }
});

test('writeVersion refuses a file with more than one version field', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-bump-'));
  for (const file of VERSION_FILES) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), '{ "version": "0.6.0", "x": { "version": "1.0.0" } }\n');
  }
  assert.throws(() => writeVersion(root, '0.7.0'), /expected one "version" field, found 2/);
});
