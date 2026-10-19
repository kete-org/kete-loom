#!/usr/bin/env node
'use strict';

// Inventories hard-coded design values in a codebase: colours, font sizes, spacing, radii, shadows and
// z-indexes written as raw literals (CSS, preprocessors, JS/TS styles, templates, Tailwind arbitrary values).
// Custom property definitions (--x: ...) are token definitions and are not counted.
// Usage: node token-audit.js [dir] [--json] [--ignore <path-part>]... [--top 12]
// Exit: 0 report written, 2 bad arguments. Read-only.

const fs = require('fs');
const path = require('path');

const EXT = new Set(['.css', '.scss', '.sass', '.less', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.vue', '.svelte', '.astro', '.html', '.erb', '.blade.php', '.php', '.dart', '.swift', '.kt']);
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', 'coverage', 'vendor', '.turbo', '.cache', 'Pods', '.dart_tool']);
const MAX_BYTES = 512 * 1024;

const RULES = {
  colour: [
    /(?<![&\w-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g,
    /\b(?:rgba?|hsla?|oklch|oklab)\([^)]*\)/g,
    /\bColor\(0x[0-9a-fA-F]{8}\)/g,
  ],
  'font-size': [/font-size\s*:\s*([\d.]+(?:px|rem|em|pt))/g, /fontSize\s*:\s*['"]?([\d.]+(?:px|rem|em)?)\b/g, /\btext-\[([\d.]+(?:px|rem|em))\]/g],
  spacing: [
    /\b(?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-start|-end)?)?\s*:\s*([^;{}\n]*\d(?:px|rem|em)[^;{}\n]*)/g,
    /\b(?:-?(?:m|p)[xytrbl]?|gap(?:-[xy])?|space-[xy])-\[([^\]]+)\]/g,
  ],
  radius: [/border-radius\s*:\s*([^;{}\n]+)/g, /borderRadius\s*:\s*['"]?([\d.]+(?:px|rem)?)\b/g, /\brounded(?:-[a-z]{1,2})?-\[([^\]]+)\]/g],
  shadow: [/box-shadow\s*:\s*([^;{}\n]+)/g, /\bshadow-\[([^\]]+)\]/g],
  'z-index': [/z-index\s*:\s*(-?\d+)/g, /zIndex\s*:\s*(-?\d+)/g, /\bz-\[(-?\d+)\]/g],
};

// Values that are not design decisions.
const NEUTRAL = /^(?:0|0px|auto|inherit|initial|unset|none|100%|50%|9999px)$/;

function walk(dir, ignore, files = [], root = dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    process.stderr.write(`token-audit: skipped ${dir}: ${e.code || e.message}\n`);
    return files;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (ignore.some((part) => path.relative(root, p).includes(part))) continue;
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) walk(p, ignore, files, root);
    } else if (e.isFile() && (EXT.has(path.extname(e.name)) || e.name.endsWith('.blade.php')) && !/\.min\.(?:js|css)$/.test(e.name)) {
      files.push(p);
    }
  }
  return files;
}

const norm = (kind, v) => {
  const s = v.trim().replace(/\s+/g, ' ').replace(/;$/, '');
  return kind === 'colour' && s.startsWith('#') ? s.toLowerCase() : s;
};

function hexRgb(h) {
  const m = h.match(/^#([0-9a-f]{3,8})$/);
  if (!m || ![3, 4, 6, 8].includes(m[1].length)) return null;
  const x = m[1].length < 6 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return x.match(/../g).slice(0, 3).map((c) => parseInt(c, 16));
}

// Groups hex colours closer than `limit` in RGB space: likely the same colour typed twice.
function clusters(values, limit = 12) {
  const hex = values.filter((v) => hexRgb(v.value));
  const seen = new Set();
  const out = [];
  for (const a of hex) {
    if (seen.has(a.value)) continue;
    const group = hex.filter((b) => !seen.has(b.value) && Math.hypot(...hexRgb(a.value).map((c, i) => c - hexRgb(b.value)[i])) < limit);
    if (group.length > 1) {
      group.forEach((g) => seen.add(g.value));
      out.push(group.map((g) => g.value));
    }
  }
  return out;
}

function audit(root, { ignore = [] } = {}) {
  const found = Object.fromEntries(Object.keys(RULES).map((k) => [k, new Map()]));
  const files = walk(root, ignore);
  let scanned = 0;
  for (const file of files) {
    let text;
    try {
      if (fs.statSync(file).size > MAX_BYTES) continue;
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    scanned++;
    const rel = path.relative(root, file) || path.basename(file);
    text.split('\n').forEach((line, i) => {
      if (/^\s*--[\w-]+\s*:/.test(line) || /^\s*(?:\/\/|\*|\/\*)/.test(line)) return;
      const code = line.replace(/\b(?:href|src|xlink:href)=["'][^"']*["']/g, '').replace(/https?:\/\/\S+/g, '').replace(/--[\w-]+\s*:[^;{}]*/g, '');
      for (const [kind, patterns] of Object.entries(RULES)) {
        for (const re of patterns) {
          for (const m of code.matchAll(re)) {
            const value = norm(kind, m[1] ?? m[0]);
            if (!value || NEUTRAL.test(value) || /^var\(/.test(value) || /^\$|^theme\(/.test(value)) continue;
            const entry = found[kind].get(value) || { value, count: 0, at: [] };
            entry.count++;
            if (entry.at.length < 3) entry.at.push(`${rel}:${i + 1}`);
            found[kind].set(value, entry);
          }
        }
      }
    });
  }
  const result = { root, filesScanned: scanned, kinds: {} };
  for (const [kind, map] of Object.entries(found)) {
    const values = [...map.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    result.kinds[kind] = { distinct: values.length, uses: values.reduce((t, v) => t + v.count, 0), values };
  }
  result.colourClusters = clusters(result.kinds.colour.values);
  return result;
}

function markdown(r, top) {
  const lines = [`## Token audit: ${r.root}`, '', `Files scanned: ${r.filesScanned}. Custom property definitions are excluded; everything below is a raw literal.`, ''];
  lines.push('| Kind | Distinct values | Uses |', '|---|---|---|');
  for (const [k, v] of Object.entries(r.kinds)) lines.push(`| ${k} | ${v.distinct} | ${v.uses} |`);
  for (const [k, v] of Object.entries(r.kinds)) {
    if (!v.distinct) continue;
    lines.push('', `### ${k} (top ${Math.min(top, v.distinct)} of ${v.distinct})`, '');
    for (const e of v.values.slice(0, top)) lines.push(`- \`${e.value}\` x${e.count}: ${e.at.join(', ')}`);
  }
  if (r.colourClusters.length) {
    lines.push('', '### Near-duplicate colours (likely one token)', '');
    for (const c of r.colourClusters) lines.push(`- ${c.map((x) => `\`${x}\``).join(', ')}`);
  }
  if (!r.filesScanned) lines.push('', 'No style-bearing files were scanned: check the folder and --ignore values before reading this as "no hard-coded values".');
  return lines.join('\n') + '\n';
}

function main(argv) {
  const opts = { ignore: [], top: 12 };
  let dir;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--ignore' || a === '--top') {
      if (argv[i + 1] === undefined) return fail(`${a} needs a value`);
      if (a === '--ignore') opts.ignore.push(argv[++i]);
      else opts.top = Number(argv[++i]);
    } else if (a.startsWith('-')) return fail(`unknown option ${a}`);
    else if (dir) return fail('give one folder');
    else dir = a;
  }
  if (!(opts.top > 0)) return fail('--top must be a positive number');
  const root = path.resolve(dir || '.');
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return fail(`${root} is not a folder`);
  const r = audit(root, opts);
  process.stdout.write(opts.json ? JSON.stringify(r, null, 2) + '\n' : markdown(r, opts.top));
  return 0;
}

function fail(msg) {
  process.stderr.write(`token-audit: ${msg}\n`);
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { audit, clusters };
