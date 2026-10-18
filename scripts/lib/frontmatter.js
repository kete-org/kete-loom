'use strict';

// Minimal parser for the frontmatter subset Kete Loom allows:
//   key: value              (plain or quoted scalar, single line)
//   metadata:               (one nested level of key: "string" pairs)
// Anything else (folded scalars, lists, deeper nesting) is reported as an
// error, because not every host parses full YAML the same way.

// A value that opens with a quote must close with the same one (`"git"\n  key: x` is a broken line, not a string).
const brokenQuote = (raw) => {
  const v = raw.trim();
  if (v.startsWith('"')) return !/^"(?:[^"\\]|\\.)*"\s*(?:#.*)?$/.test(v);
  if (v.startsWith("'")) return !/^'(?:[^']|'')*'\s*(?:#.*)?$/.test(v);
  return false;
};

function unquote(raw) {
  const v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return { value: v.slice(1, -1), quoted: true };
  }
  return { value: v, quoted: false };
}

function parseFrontmatter(text) {
  const errors = [];
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) {
    return { data: null, body: text, errors: ['missing frontmatter block (--- ... ---) at top of file'] };
  }
  const data = {};
  let current = null;
  const lines = match[1].split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith('#')) return;
    const nested = /^ {2}([^\s:][^:]*):\s*(.*)$/.exec(line);
    const top = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (top) {
      const [, key, rest] = top;
      if (rest === '') {
        data[key] = {};
        current = key;
      } else {
        if (/^[>|]/.test(rest.trim())) {
          errors.push(`line ${i + 2}: "${key}" uses a multi-line YAML scalar; keep it on one line`);
        }
        if (rest.trim().startsWith('[') || rest.trim().startsWith('{')) {
          errors.push(`line ${i + 2}: "${key}" uses an inline list/map; only plain strings are portable`);
        }
        if (brokenQuote(rest)) errors.push(`line ${i + 2}: "${key}" has an unclosed or mismatched quote`);
        data[key] = unquote(rest).value;
        current = null;
      }
    } else if (nested && current) {
      const [, key, rest] = nested;
      if (brokenQuote(rest)) errors.push(`line ${i + 2}: "${key.trim()}" has an unclosed or mismatched quote`);
      data[current][key.trim()] = unquote(rest).value;
    } else {
      errors.push(`line ${i + 2}: unsupported frontmatter syntax: ${line.trim()}`);
    }
  });
  return { data, body: text.slice(match[0].length), errors };
}

module.exports = { parseFrontmatter };
