'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { sourceHash, switcher } = require('../scripts/lib/i18n');

const doc = (table, prose) => `# Title\n\n<!-- languages:start -->\nlinks\n<!-- languages:end -->\n\n${prose}\n\n<!-- catalog:start -->\n${table}\n<!-- catalog:end -->\n`;

test('the source hash follows the prose, not the generated tables or the language switcher', () => {
  const base = sourceHash(doc('| a |', 'Install with npx.'));
  assert.strictEqual(sourceHash(doc('| a |\n| b |', 'Install with npx.')), base, 'a new catalog row does not make translations stale');
  assert.strictEqual(sourceHash(doc('| a |', 'Install with npx.').replace('links', 'other links')), base);
  assert.notStrictEqual(sourceHash(doc('| a |', 'Install with pnpm.')), base, 'changed prose does');
});

test('the language switcher links work from the root and from docs/i18n', () => {
  assert.match(switcher(), /href="docs\/i18n\/README\.fr\.md">Français</);
  const fromI18n = switcher('docs/i18n');
  assert.match(fromI18n, /href="\.\.\/\.\.\/README\.md">English</);
  assert.match(fromI18n, /href="README\.sw\.md">Kiswahili</);
});
