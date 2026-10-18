'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { html, items } = require('../scripts/build-site');
const catalog = require('../catalog.json');

test('the catalog site lists every item and loads nothing from elsewhere', () => {
  const total = ['skills', 'agents', 'commands', 'rules', 'hooks', 'mcp'].reduce((n, k) => n + catalog[k].length, 0);
  assert.strictEqual(items.length, total);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|@import|url\(http/i, 'no external scripts, styles or fonts');
  const data = html.slice(html.indexOf('<script id="data"'), html.indexOf('</script>', html.indexOf('<script id="data"')));
  assert.doesNotMatch(data.slice(data.indexOf('>') + 1), /</, 'embedded data cannot close its script tag');
  assert.ok(items.every((i) => i.install.startsWith('npx @ketecode/loom install --')));
});
