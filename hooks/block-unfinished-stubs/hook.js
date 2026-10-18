'use strict';

// When the agent ends its turn, looks at the lines its uncommitted changes add to code files and
// sends it back once if they leave work unfinished: TODO/FIXME markers, "not implemented" stubs, or
// focused or skipped tests. check({ cwd, again }) -> verdict.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CODE = /\.(?:[cm]?[jt]sx?|vue|svelte|py|go|rs|rb|php|java|kt|kts|swift|cs|fs|dart|scala|ex|exs|c|cc|cpp|h|hpp)$/;
const MAX_FILE_BYTES = 200000;
const RULES = [
  [/\b(?:TODO|FIXME|XXX)\b/, 'a TODO/FIXME marker'],
  [/\bnot\s+(?:yet\s+)?implemented\b|\bNotImplementedError\b|\bunimplemented!\s*\(|\btodo!\s*\(|\bNotImplementedException\b|\bTODO\(\)/i, 'a "not implemented" stub'],
  [/\b(?:it|test|describe|context)\.only\s*\(|\bf(?:it|describe)\s*\(|\btest\.only\b/, 'a focused test (.only) that silently skips the rest of the suite'],
  [/\b(?:it|test|describe)\.skip\s*\(|\bx(?:it|describe)\s*\(|@pytest\.mark\.skip\b|@unittest\.skip\b|\bt\.Skip(?:f|Now)?\s*\(|#\[ignore\]|@Disabled\b|\[Ignore\]|\bmarkTestSkipped\s*\(/, 'a skipped test'],
];

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000, maxBuffer: 20 * 1024 * 1024 });
  } catch {
    return null;
  }
};

// [file, line] pairs for lines added to code files by uncommitted changes, including new files.
function addedLines(root) {
  const out = [];
  let file = null;
  for (const line of (git(root, ['diff', 'HEAD', '--unified=0', '--no-color', '--no-ext-diff']) || '').split('\n')) {
    const header = /^\+\+\+ b\/(.+)$/.exec(line);
    if (header) file = CODE.test(header[1]) ? header[1] : null;
    else if (file && line.startsWith('+') && !line.startsWith('+++')) out.push([file, line.slice(1)]);
  }
  for (const f of (git(root, ['ls-files', '--others', '--exclude-standard']) || '').split('\n')) {
    if (!f || !CODE.test(f)) continue;
    try {
      const p = path.join(root, f);
      if (fs.statSync(p).size > MAX_FILE_BYTES) continue;
      for (const l of fs.readFileSync(p, 'utf8').split('\n')) out.push([f, l]);
    } catch {
      // unreadable file: nothing to check
    }
  }
  return out;
}

function check(event) {
  if (event.again) return { block: false };
  const root = (git(event.cwd || process.cwd(), ['rev-parse', '--show-toplevel']) || '').trim();
  if (!root) return { block: false };
  const found = [];
  for (const [file, line] of addedLines(root)) {
    const rule = RULES.find(([re]) => re.test(line));
    if (rule) found.push(`- ${file}: ${rule[1]}: \`${line.trim().slice(0, 120)}\``);
    if (found.length >= 10) break;
  }
  if (!found.length) return { block: false };
  return {
    block: true,
    reason: `kete-loom (block-unfinished-stubs): your changes add unfinished work:\n${found.join('\n')}\n\nFinish it, or remove what was left by accident (a stray .only, a skip). If something is deliberately left for later, say so explicitly to the user with the reason, instead of finishing as if it were done.`,
  };
}

module.exports = { check, addedLines };
