'use strict';

// Turns one portable agent or command into the file each host expects.
// Every rendered file carries a `# kete-loom <name>@<version>` comment (YAML or TOML),
// which is how install and uninstall recognise files kete-loom wrote.

const TOOLS = ['read', 'search', 'shell', 'edit', 'web'];
// `# kete-loom name@version` inside YAML/TOML, or `<!-- kete-loom name@version -->` in plain Markdown.
const MARKER_RE = /^(?:# |<!-- )kete-loom [a-z0-9-]+@/m;

const CLAUDE_TOOLS = { read: ['Read'], search: ['Grep', 'Glob'], shell: ['Bash'], edit: ['Edit', 'Write'], web: ['WebFetch', 'WebSearch'] };
const COPILOT_TOOLS = { read: 'read', search: 'search', shell: 'execute', edit: 'edit', web: 'web' };
const KIRO_TOOLS = { read: ['read'], search: ['glob', 'grep'], shell: ['shell'], edit: ['write'], web: ['web_search', 'web_fetch'] };

const marker = (item) => `# kete-loom ${item.dir}@${item.version}`;
// JSON strings are valid YAML double-quoted scalars and TOML basic strings (TOML also bans raw DEL).
const str = (s) => JSON.stringify(String(s)).replace(/\x7f/g, '\\u007f');
const body = (item) => item.body.replace(/^\s*\n/, '');

function markdown(item, fields) {
  const lines = [marker(item)];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) lines.push(`${k}: [${v.map(str).join(', ')}]`);
    else if (typeof v === 'object') {
      lines.push(`${k}:`);
      for (const [k2, v2] of Object.entries(v)) lines.push(`  ${k2}: ${v2}`);
    } else lines.push(`${k}: ${typeof v === 'string' ? str(v) : v}`);
  }
  return `---\n${lines.join('\n')}\n---\n\n${body(item)}`;
}

// Multi-line literal ('''...''') keeps prompts readable; it can't hold ''' or control characters other than tab/newline.
const tomlValue = (v) => (/\n/.test(v) && !v.includes("'''") && !/[\x00-\x08\x0b-\x1f\x7f]/.test(v) ? `'''\n${v}'''` : str(v));

function toml(item, fields) {
  return [marker(item), ...Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => `${k} = ${tomlValue(v)}`)].join('\n') + '\n';
}

const has = (item, tool) => !item.tools || item.tools.includes(tool);

// OpenCode restricts with permissions rather than a tool list.
function opencodePermission(item) {
  if (!item.tools) return undefined;
  const p = {};
  if (!has(item, 'edit')) p.edit = 'deny';
  if (!has(item, 'shell')) p.bash = 'deny';
  if (!has(item, 'web')) p.webfetch = 'deny';
  return Object.keys(p).length ? p : undefined;
}

// shortcut: Codex and Gemini agents inherit every tool (Codex can't set a sandbox per agent; Gemini's
// tool names aren't mapped yet), so `kete-loom/tools` is advisory there. Map them when hosts allow it.
const AGENT = {
  claude: (a) => ({ file: `${a.dir}.md`, content: markdown(a, { name: a.dir, description: a.description, tools: a.tools && a.tools.flatMap((t) => CLAUDE_TOOLS[t]).join(', ') }) }),
  codex: (a) => ({ file: `${a.dir}.toml`, content: toml(a, { name: a.dir, description: a.description, developer_instructions: body(a) }) }),
  opencode: (a) => ({ file: `${a.dir}.md`, content: markdown(a, { description: a.description, mode: 'subagent', permission: opencodePermission(a) }) }),
  cursor: (a) => ({ file: `${a.dir}.md`, content: markdown(a, { name: a.dir, description: a.description, readonly: a.tools && !has(a, 'edit') && !has(a, 'shell') ? true : undefined }) }),
  gemini: (a) => ({ file: `${a.dir}.md`, content: markdown(a, { name: a.dir, description: a.description }) }),
  kete: (a) => AGENT.opencode(a), // Kete Code reads the OpenCode agent format
  copilot: (a) => ({ file: `${a.dir}.agent.md`, content: markdown(a, { name: a.dir, description: a.description, tools: a.tools && a.tools.map((t) => COPILOT_TOOLS[t]) }) }),
  kiro: (a) => ({ file: `${a.dir}.md`, content: markdown(a, { name: a.dir, description: a.description, tools: a.tools && a.tools.flatMap((t) => KIRO_TOOLS[t]) }) }),
};

const COMMAND = {
  claude: (c) => ({ file: `${c.dir}.md`, content: markdown(c, { description: c.description, 'argument-hint': c.argumentHint }) }),
  opencode: (c) => ({ file: `${c.dir}.md`, content: markdown(c, { description: c.description }) }),
  kete: (c) => COMMAND.opencode(c),
  // Kiro prompts are plain Markdown and take $ARGUMENTS as is.
  kiro: (c) => ({ file: `${c.dir}.md`, content: `<!-- ${marker(c).slice(2)} -->\n${body(c)}` }),
  gemini: (c) => ({ file: `${c.dir}.toml`, content: toml(c, { description: c.description, prompt: body(c).replace(/\$ARGUMENTS/g, '{{args}}') }) }),
};

// Rules: path-scoped where the host supports it (Claude Code, Copilot, Cursor). Hosts that can't scope
// get plain Markdown that says which files it is about (scripts/lib/rules-install.js).
const appliesTo = (r) => (r.paths.length ? `Applies when working on files matching: ${r.paths.join(', ')}.\n\n` : '');
const RULE = {
  claude: (r) => ({ file: `${r.dir}.md`, content: markdown(r, { paths: r.paths.length ? r.paths : undefined }) }),
  copilot: (r) => ({ file: `${r.dir}.instructions.md`, content: markdown(r, { applyTo: r.paths.length ? r.paths.join(',') : '**' }) }),
  cursor: (r) => ({ file: `${r.dir}.mdc`, content: markdown(r, { description: r.description, globs: r.paths.length ? r.paths.join(', ') : undefined, alwaysApply: !r.paths.length }) }),
  // Steering front matter must come first; inclusion: fileMatch scopes it like a path rule.
  kiro: (r) => ({ file: `${r.dir}.md`, content: markdown(r, r.paths.length ? { inclusion: 'fileMatch', fileMatchPattern: r.paths } : { inclusion: 'always' }) }),
  plain: (r) => ({ file: `${r.dir}.md`, content: `<!-- ${marker(r).slice(2)} -->\n# ${r.dir} rules\n\n${appliesTo(r)}${body(r)}` }),
};

function render(item, target) {
  if (item.kind === 'rule') return RULE[target] ? RULE[target](item) : null;
  const table = item.kind === 'agent' ? AGENT : COMMAND;
  return table[target] ? table[target](item) : null;
}

module.exports = { TOOLS, MARKER_RE, render };
