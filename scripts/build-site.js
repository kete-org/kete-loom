#!/usr/bin/env node
'use strict';

// Builds site/index.html: a single static, searchable page of the whole catalog (no dependencies, no
// external requests). CI deploys it to GitHub Pages; the output isn't committed, so it can't go stale.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
const profiles = JSON.parse(fs.readFileSync(path.join(ROOT, 'profiles.json'), 'utf8'));
const pkg = require(path.join(ROOT, 'package.json'));
const { LANGUAGES } = require('./lib/i18n');

const repo = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
const KINDS = [
  ['skills', 'skill', '--skill', 'Skills', 'Folders the agent loads when a request needs them'],
  ['agents', 'agent', '--agent', 'Agents', 'Subagents your agent delegates to'],
  ['commands', 'command', '--command', 'Commands', 'Slash commands you type'],
  ['rules', 'rule', '--rule', 'Rules', 'Short always-on conventions'],
  ['hooks', 'hook', '--hook', 'Hooks', 'Checks that run automatically and can block'],
  ['mcp', 'mcp', '--mcp', 'MCP servers', 'Curated MCP server configs, no secrets'],
];

const items = KINDS.flatMap(([key, kind, flag]) =>
  (catalog[key] || []).map((i) => ({
    kind,
    name: i.name,
    category: i.category,
    risk: i.risk,
    description: i.description,
    install: `npx @ketecode/loom install ${flag} ${i.name}`,
    source: `${repo}/blob/main/${i.path}${kind === 'skill' ? '/SKILL.md' : kind === 'agent' ? '/AGENT.md' : kind === 'hook' ? '/HOOK.md' : ''}`,
  }))
);
const profileList = Object.entries(profiles).map(([name, p]) => ({ name, description: p.description }));
const counts = Object.fromEntries(KINDS.map(([key, kind]) => [kind, (catalog[key] || []).length]));

// JSON inside <script>: escape `<` so no value can close the tag.
const data = JSON.stringify({ items, profiles: profileList }).replace(/</g, '\\u003c');
const logo = fs.readFileSync(path.join(ROOT, 'assets', 'brand', 'kete-loom.svg'), 'utf8').replace(/<\?xml[^>]*>/, '').trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const languages = [['README.md', 'English'], ...Object.entries(LANGUAGES).map(([code, label]) => [`docs/i18n/README.${code}.md`, label])]
  .map(([file, label]) => `<a href="${esc(`${repo}/blob/main/${file}`)}">${esc(label)}</a>`)
  .join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kete Loom catalog</title>
<meta name="description" content="${esc(pkg.description)}">
<style>
:root{--bg:#fbfaf7;--surface:#fff;--text:#1d1b19;--muted:#615c55;--line:#e4e0d8;--accent:#6d3fd1;--accent-soft:#efe9fb;--chip:#f2efe9;--focus:#6d3fd1;--risk:#8a5a00}
@media (prefers-color-scheme:dark){:root{--bg:#141312;--surface:#1c1b19;--text:#ece9e4;--muted:#a39d94;--line:#2f2d2a;--accent:#b49cf3;--accent-soft:#2a2340;--chip:#26241f;--focus:#b49cf3;--risk:#e2b45a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.wrap{max-width:1120px;margin:0 auto;padding:0 16px}
header{padding:40px 0 24px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:14px}
.brand svg{width:44px;height:44px;flex:none}
h1{margin:0;font-size:28px;letter-spacing:-.01em}
.tag{margin:6px 0 0;color:var(--muted);max-width:70ch}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 0;padding:0;list-style:none}
.stats li{background:var(--chip);border-radius:999px;padding:4px 12px;font-size:14px}
.quick{margin-top:18px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
code,.cmd{font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.cmd{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 10px;overflow-x:auto;white-space:nowrap;max-width:100%}
.langs{margin-top:14px;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:14px}
main{padding:24px 0 56px}
.controls{display:grid;gap:12px;grid-template-columns:1fr auto;align-items:end}
@media (max-width:640px){.controls{grid-template-columns:1fr}}
label{display:block;font-size:13px;color:var(--muted);margin-bottom:4px}
input[type=search],select{width:100%;font:inherit;color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.kinds{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 4px}
.kinds button{font:inherit;font-size:14px;color:var(--text);background:var(--chip);border:1px solid transparent;border-radius:999px;padding:6px 12px;cursor:pointer}
.kinds button[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.count{color:var(--muted);font-size:14px;margin:10px 0 14px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));list-style:none;margin:0;padding:0}
@media (max-width:400px){.grid{grid-template-columns:1fr}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;min-width:0}
.card h3{margin:0;font-size:16px;display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}
.card h3 a{color:var(--text);text-decoration:none}
.card h3 a:hover{text-decoration:underline}
.meta{display:flex;flex-wrap:wrap;gap:6px;font-size:12px}
.meta span{background:var(--chip);border-radius:6px;padding:2px 7px}
.meta .risk{color:var(--risk)}
.card p{margin:0;color:var(--muted);font-size:14px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.install{display:flex;gap:6px;align-items:center;margin-top:auto}
.install .cmd{flex:1;padding:6px 8px}
.copy{font:inherit;font-size:13px;background:var(--accent);color:var(--bg);border:0;border-radius:8px;padding:7px 10px;cursor:pointer;flex:none}
section.profiles{margin-top:40px}
h2{font-size:20px;margin:0 0 12px}
.plist{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));list-style:none;margin:0;padding:0}
.plist li{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px}
.plist p{margin:4px 0 8px;color:var(--muted);font-size:14px}
footer{border-top:1px solid var(--line);padding:20px 0 40px;color:var(--muted);font-size:14px}
.empty{color:var(--muted);padding:24px 0}
</style>
</head>
<body>
<header><div class="wrap">
  <div class="brand">${logo}<div><h1>Kete Loom</h1><p class="tag">${esc(pkg.description)}</p></div></div>
  <ul class="stats" aria-label="Catalog size">${KINDS.map(([, kind, , label]) => `<li>${counts[kind]} ${esc(label === 'MCP servers' ? label : label.toLowerCase())}</li>`).join('')}</ul>
  <div class="quick"><code class="cmd">npx @ketecode/loom install --profile core</code><button class="copy" type="button" data-copy="npx @ketecode/loom install --profile core">Copy</button><a href="${esc(repo)}">GitHub</a></div>
  <nav class="langs" aria-label="README in other languages">${languages}</nav>
</div></header>
<main class="wrap">
  <div class="controls">
    <div><label for="q">Search</label><input id="q" type="search" placeholder="Try: paystack, go reviewer, terraform, secrets" autocomplete="off"></div>
    <div><label for="cat">Category</label><select id="cat"><option value="">All categories</option></select></div>
  </div>
  <div class="kinds" role="group" aria-label="Kind">
    <button type="button" data-kind="" aria-pressed="true">All</button>
    ${KINDS.map(([, kind, , label]) => `<button type="button" data-kind="${kind}" aria-pressed="false">${esc(label)}</button>`).join('\n    ')}
  </div>
  <p class="count" id="count" aria-live="polite"></p>
  <ul class="grid" id="grid"></ul>
  <section class="profiles" aria-labelledby="ph"><h2 id="ph">Profiles</h2><ul class="plist" id="plist"></ul></section>
</main>
<footer><div class="wrap">Kete Loom ${esc(catalog.version)} · MIT · Generated from <a href="${esc(`${repo}/blob/main/catalog.json`)}">catalog.json</a></div></footer>
<script id="data" type="application/json">${data}</script>
<script>
(() => {
  const { items, profiles } = JSON.parse(document.getElementById('data').textContent);
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === 'text' ? (n.textContent = v) : n.setAttribute(k, v);
    for (const k of kids) n.append(k);
    return n;
  };
  const copyButton = (text) => el('button', { type: 'button', class: 'copy', 'data-copy': text, 'aria-label': 'Copy install command', text: 'Copy' });
  const state = { q: '', kind: '', cat: '' };
  try { Object.assign(state, JSON.parse(localStorage.getItem('kete-loom-filters') || '{}')); } catch {}

  const cats = [...new Set(items.map((i) => i.category))].sort();
  for (const c of cats) $('cat').append(el('option', { value: c, text: c }));

  function render() {
    const words = state.q.toLowerCase().split(/\\s+/).filter(Boolean);
    const shown = items.filter((i) => (!state.kind || i.kind === state.kind) && (!state.cat || i.category === state.cat)
      && words.every((w) => (i.name + ' ' + i.description + ' ' + i.category + ' ' + i.kind).toLowerCase().includes(w)));
    $('grid').replaceChildren(...shown.map((i) => el('li', { class: 'card' },
      el('h3', {}, el('a', { href: i.source, text: i.name })),
      el('div', { class: 'meta' }, el('span', { text: i.kind }), el('span', { text: i.category }), el('span', { class: 'risk', text: i.risk })),
      el('p', { text: i.description }),
      el('div', { class: 'install' }, el('code', { class: 'cmd', text: i.install }), copyButton(i.install)))));
    if (!shown.length) $('grid').replaceChildren(el('li', { class: 'empty', text: 'Nothing matches. Try fewer words or another kind.' }));
    $('count').textContent = shown.length + ' of ' + items.length + ' items';
    for (const b of document.querySelectorAll('.kinds button')) b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind));
    try { localStorage.setItem('kete-loom-filters', JSON.stringify({ kind: state.kind, cat: state.cat })); } catch {}
  }

  $('q').value = state.q;
  $('cat').value = state.cat;
  $('q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  $('cat').addEventListener('change', (e) => { state.cat = e.target.value; render(); });
  for (const b of document.querySelectorAll('.kinds button')) b.addEventListener('click', () => { state.kind = b.dataset.kind; render(); });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; }
    catch { b.textContent = 'Select it'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1500);
  });
  $('plist').replaceChildren(...profiles.map((p) => {
    const cmd = 'npx @ketecode/loom install --profile ' + p.name;
    return el('li', {}, el('strong', { text: p.name }), el('p', { text: p.description }), el('div', { class: 'install' }, el('code', { class: 'cmd', text: cmd }), copyButton(cmd)));
  }));
  render();
})();
</script>
</body>
</html>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
if (require.main === module) console.log(`site/index.html written (${items.length} items, ${Math.round(html.length / 1024)} KB)`);

module.exports = { html, items };
