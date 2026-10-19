#!/usr/bin/env node
'use strict';

// Checks WCAG 2.x contrast for colour pairs, given as literals or as custom properties from a CSS file.
// Usage: node contrast.js [--css tokens.css] [--scope '.dark'] [--min 4.5] [--json] "<fg>/<bg>" ...
//   colours: #rgb #rrggbb #rrggbbaa, rgb(), hsl(), oklch(), bare shadcn triples ("222 47% 11%"), white, black
//   with --css, a side can be a token name (--color-text); var() chains are resolved. Base values come from
//   top-level :root and @theme blocks; --scope overlays a block by its selector path, for example '.dark' or
//   '@media (prefers-color-scheme: dark) :root'.
// Exit: 0 all pairs meet --min, 1 a pair is below it, 2 bad arguments or an unreadable colour. Read-only.

const fs = require('fs');

const clamp = (x) => Math.min(1, Math.max(0, x));
const num = (s, scale = 1) => (String(s).trim().endsWith('%') ? (parseFloat(s) / 100) * scale : parseFloat(s));

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)));
}

function oklchToRgb(L, C, H) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  // shortcut: out-of-gamut colours are clipped per channel, not gamut-mapped; fine for contrast checks
  return lin.map((c) => clamp(c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
}

// Returns { rgb: [0..1 x3], alpha } or null.
function parseColor(input) {
  const s = String(input).trim().toLowerCase();
  if (s === 'white') return { rgb: [1, 1, 1], alpha: 1 };
  if (s === 'black') return { rgb: [0, 0, 0], alpha: 1 };
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m && [3, 4, 6, 8].includes(m[1].length)) {
    const h = m[1].length < 6 ? [...m[1]].map((c) => c + c).join('') : m[1];
    const v = h.match(/../g).map((x) => parseInt(x, 16) / 255);
    return { rgb: v.slice(0, 3), alpha: v[3] ?? 1 };
  }
  if (/^[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%$/.test(s)) return parseColor(`hsl(${s})`);
  m = s.match(/^(rgba?|hsla?|oklch)\(\s*([^)]*)\)$/);
  if (!m) return null;
  const [body, a] = m[2].split('/');
  const p = body.split(/[\s,]+/).filter(Boolean);
  const parts = a === undefined && p.length === 4 ? p.slice(0, 3) : p;
  const alpha = a !== undefined ? num(a) : p.length === 4 ? num(p[3]) : 1;
  if (parts.length !== 3 || parts.some((x) => Number.isNaN(parseFloat(x))) || Number.isNaN(alpha)) return null;
  let rgb;
  if (m[1].startsWith('rgb')) rgb = parts.map((x) => clamp(num(x, 255) / 255));
  else if (m[1].startsWith('hsl')) rgb = hslToRgb(parseFloat(parts[0]), clamp(num(parts[1])), clamp(num(parts[2])));
  else rgb = oklchToRgb(clamp(num(parts[0])), parseFloat(parts[1]), parseFloat(parts[2]));
  return { rgb, alpha: clamp(alpha) };
}

const luminance = (rgb) =>
  rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((t, c, i) => t + c * [0.2126, 0.7152, 0.0722][i], 0);

// A translucent foreground is composited onto the background; a translucent background onto white.
function ratio(fg, bg) {
  const over = (top, under) => top.rgb.map((c, i) => c * top.alpha + under[i] * (1 - top.alpha));
  const b = bg.alpha < 1 ? over(bg, [1, 1, 1]) : bg.rgb;
  const f = fg.alpha < 1 ? over(fg, b) : fg.rgb;
  const [hi, lo] = [luminance(f), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Custom properties per block, keyed by the block's selector path ("@media (...) :root").
function parseCss(text) {
  const blocks = [];
  const stack = [];
  let buf = '';
  const decl = () => {
    const m = buf.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m && stack.length) stack[stack.length - 1].decls[m[1]] = m[2].replace(/\s*!important$/, '');
    buf = '';
  };
  for (const ch of text.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') {
      stack.push({ prelude: buf.trim().replace(/\s+/g, ' '), decls: {} });
      buf = '';
    } else if (ch === '}') {
      decl();
      const b = stack.pop();
      if (b) blocks.push({ path: [...stack.map((x) => x.prelude), b.prelude].join(' '), decls: b.decls });
    } else if (ch === ';') decl();
    else buf += ch;
  }
  return blocks;
}

function tokenValues(blocks, scope) {
  const vars = {};
  for (const b of blocks) if (b.path === ':root' || b.path.startsWith('@theme')) Object.assign(vars, b.decls);
  if (scope) {
    const hit = blocks.filter((b) => b.path === scope.trim().replace(/\s+/g, ' '));
    if (!hit.length) throw new Error(`no block with selector path "${scope}"; paths found: ${[...new Set(blocks.map((b) => b.path))].join(', ')}`);
    for (const b of hit) Object.assign(vars, b.decls);
  }
  return vars;
}

function resolve(value, vars, depth = 0) {
  if (depth > 10) throw new Error(`var() chain too deep or circular at "${value}"`);
  const v = String(value).trim();
  if (/^--[\w-]+$/.test(v)) {
    if (!(v in vars)) throw new Error(`token ${v} is not defined`);
    return resolve(vars[v], vars, depth + 1);
  }
  const out = v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, name, fallback) => {
    if (name in vars) return resolve(vars[name], vars, depth + 1);
    if (fallback !== undefined) return resolve(fallback, vars, depth + 1);
    throw new Error(`token ${name} is not defined`);
  });
  return out.includes('var(') ? resolve(out, vars, depth + 1) : out;
}

// Splits "fg/bg" on the slash outside parentheses, so rgb(0 0 0 / 50%) stays whole.
function splitPair(pair) {
  let depth = 0;
  for (let i = 0; i < pair.length; i++) {
    if (pair[i] === '(') depth++;
    else if (pair[i] === ')') depth--;
    else if (pair[i] === '/' && depth === 0) return [pair.slice(0, i), pair.slice(i + 1)];
  }
  return null;
}

function check(pair, vars) {
  const sides = splitPair(pair);
  if (!sides) throw new Error(`"${pair}" is not a <fg>/<bg> pair`);
  const [fg, bg] = sides.map((s) => {
    const value = vars ? resolve(s, vars) : s.trim();
    const c = parseColor(value);
    if (!c) throw new Error(`cannot read colour "${value}"${value !== s.trim() ? ` (from ${s.trim()})` : ''}`);
    return { input: s.trim(), value, c };
  });
  const r = Math.floor(ratio(fg.c, bg.c) * 100) / 100;
  return { pair, fg: fg.value, bg: bg.value, ratio: r, aaText: r >= 4.5, aaLarge: r >= 3, uiComponent: r >= 3, aaaText: r >= 7 };
}

function main(argv) {
  const opts = { min: 4.5, pairs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--css' || a === '--scope' || a === '--min') {
      if (argv[i + 1] === undefined) return fail(`${a} needs a value`);
      opts[a.slice(2)] = argv[++i];
    } else if (a === '--json') opts.json = true;
    else if (a === '-h' || a === '--help') {
      process.stdout.write(fs.readFileSync(__filename, 'utf8').split('\n').slice(3, 10).join('\n').replace(/^\/\/ ?/gm, '') + '\n');
      return 0;
    } else if (a.startsWith('--') && !splitPair(a)) return fail(`unknown option ${a}`);
    else opts.pairs.push(a);
  }
  const min = Number(opts.min);
  if (!opts.pairs.length) return fail('give at least one "<fg>/<bg>" pair');
  if (!(min > 0)) return fail('--min must be a positive number');
  let results;
  try {
    const vars = opts.css ? tokenValues(parseCss(fs.readFileSync(opts.css, 'utf8')), opts.scope) : null;
    if (opts.scope && !opts.css) return fail('--scope needs --css');
    results = opts.pairs.map((p) => check(p, vars));
  } catch (e) {
    return fail(e.message);
  }
  const bad = results.filter((r) => r.ratio < min);
  if (opts.json) process.stdout.write(JSON.stringify({ min, results, failing: bad.length }, null, 2) + '\n');
  else {
    const mark = (ok) => (ok ? 'pass' : 'FAIL');
    for (const r of results) {
      process.stdout.write(
        `${r.ratio.toFixed(2).padStart(6)}:1  ${r.ratio >= min ? 'ok  ' : 'LOW '} ${r.pair}` +
          `${r.pair !== `${r.fg}/${r.bg}` ? `  (${r.fg} on ${r.bg})` : ''}` +
          `  [text AA ${mark(r.aaText)}, large/UI 3:1 ${mark(r.aaLarge)}, AAA ${mark(r.aaaText)}]\n`,
      );
    }
    process.stdout.write(`${results.length - bad.length}/${results.length} pair(s) meet ${min}:1\n`);
  }
  return bad.length ? 1 : 0;
}

function fail(msg) {
  process.stderr.write(`contrast: ${msg}\n`);
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { parseColor, ratio, parseCss, tokenValues, resolve, check };
