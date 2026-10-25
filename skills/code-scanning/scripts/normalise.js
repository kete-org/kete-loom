#!/usr/bin/env node
'use strict';

// Merges the SARIF files written by run-scanners.js into findings.json and one results.sarif.
//   node normalise.js <out-dir> [--fail-on critical|high|medium|low]
// Drops findings in vendored, generated and build-output folders, keeps only changed files in a
// diff scan, de-duplicates the same issue reported by several tools, and gives every finding a
// fingerprint that survives line shifts. Exit 0; 1 when --fail-on is met; 2 on bad input.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const CATEGORY = { opengrep: 'sast', semgrep: 'sast', eslint: 'sast', bandit: 'sast', gosec: 'sast', gitleaks: 'secrets', 'scan-secrets': 'secrets', 'osv-scanner': 'deps', checkov: 'iac', trivy: 'iac', hadolint: 'docker', zizmor: 'actions' };
const EXCLUDED_DIR = /(^|\/)(node_modules|vendor|third_party|bower_components|dist|build|out|target|\.next|\.nuxt|coverage|__pycache__|\.venv|venv|\.tox|\.git)\//;
const GENERATED = /(\.min\.(js|css)|\.bundle\.js|\.map|\.pb\.go|_pb2\.py|\.g\.dart|\.freezed\.dart|_generated\.[a-z]+|\.generated\.[a-z]+|\.gen\.[a-z]+)$/;

function severityOf(result, rule) {
  // security-severity is the CVSS-style score GitHub code scanning reads; prefer it to the level.
  const score = Number((result.properties || {})['security-severity'] ?? ((rule || {}).properties || {})['security-severity']);
  if (Number.isFinite(score) && score > 0) return score >= 9 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';
  const level = result.level || ((rule || {}).defaultConfiguration || {}).level || 'warning';
  return { error: 'high', warning: 'medium', note: 'low', none: 'info' }[level] || 'medium';
}

function relPath(uri, root, base) {
  if (!uri) return null;
  let p = uri;
  if (/^file:/.test(p)) p = decodeURIComponent(new URL(p).pathname);
  else if (base && !path.isAbsolute(p)) p = path.join(base, p);
  if (path.isAbsolute(p)) p = path.relative(root, p);
  return p.split(path.sep).join('/').replace(/^\.\//, '');
}

function lineText(lineCache, root, file, line) {
  if (!lineCache.has(file)) {
    try {
      lineCache.set(file, fs.readFileSync(path.join(root, file), 'utf8').split('\n'));
    } catch {
      lineCache.set(file, null);
    }
  }
  const lines = lineCache.get(file);
  return lines && lines[line - 1] !== undefined ? lines[line - 1].trim().replace(/\s+/g, ' ') : null;
}

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');

function normalise(outDir) {
  const run = JSON.parse(fs.readFileSync(path.join(outDir, 'run.json'), 'utf8'));
  const root = run.scope.root;
  const onlyFiles = run.scope.files ? new Set(run.scope.files) : null;
  // Opengrep and Semgrep prefix rule ids with the rules folder's path in dots (Users.me..cache.rules.javascript...);
  // strip it so ids, and fingerprints built from them, don't carry a home folder or differ between machines.
  const rulePrefix = run.rules ? `${path.dirname(run.rules).replace(/^[A-Za-z]:/, '').split(/[\\/]/).join('.').replace(/^\./, '')}.` : null;
  const sarifFiles = fs.readdirSync(outDir).filter((f) => f.endsWith('.sarif') && f !== 'results.sarif').sort();
  const lineCache = new Map();
  const occurrences = new Map();
  const findings = [];
  const runs = [];
  const dropped = { excluded: 0, outsideDiff: 0, duplicates: 0 };

  for (const name of sarifFiles) {
    const report = JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8'));
    const tool = name.replace(/\.sarif$/, '');
    for (const sr of report.runs || []) {
      const driver = (sr.tool && sr.tool.driver) || {};
      const strip = (id) => (rulePrefix && id && id.startsWith(rulePrefix) ? id.slice(rulePrefix.length) : id);
      for (const r of driver.rules || []) r.id = strip(r.id);
      const rules = Object.fromEntries((driver.rules || []).map((r) => [r.id, r]));
      const srcRoot = ((sr.originalUriBaseIds || {}).SRCROOT || {}).uri;
      const base = srcRoot && /^file:/.test(srcRoot) ? decodeURIComponent(new URL(srcRoot).pathname) : null;
      const kept = [];
      // Line order, so the nth copy of an identical line keeps the same occurrence number between runs.
      const lineOf = (r) => ((((r.locations || [])[0] || {}).physicalLocation || {}).region || {}).startLine || 0;
      for (const result of [...(sr.results || [])].sort((a, b) => lineOf(a) - lineOf(b))) {
        const loc = ((result.locations || [])[0] || {}).physicalLocation || {};
        const file = relPath((loc.artifactLocation || {}).uri, root, base);
        const line = (loc.region || {}).startLine || 1;
        if (file && (EXCLUDED_DIR.test(file) || GENERATED.test(file))) { dropped.excluded++; continue; }
        if (onlyFiles && file && !onlyFiles.has(file)) { dropped.outsideDiff++; continue; }
        const category = CATEGORY[tool.replace(/-image$/, '')] || 'other';
        const ruleId = strip(result.ruleId || (result.rule && result.rule.id)) || 'unknown';
        if (result.ruleId) result.ruleId = ruleId;
        // Code scanning maps results to files by repository-relative URI, not this machine's absolute path.
        if (file && loc.artifactLocation) loc.artifactLocation = { uri: file };
        // Hash the line's text, not its number, so a finding keeps its id when code above it moves.
        const text = file ? lineText(lineCache, root, file, line) : null;
        const identity = [tool, ruleId, file || '', text ?? `line:${line}`].join('|');
        const seenAt = occurrences.get(identity) || [];
        // The same rule on the same line again is a duplicate (same id); on an identical line elsewhere it is not.
        const nth = seenAt.includes(line) ? seenAt.indexOf(line) : seenAt.push(line) - 1;
        occurrences.set(identity, seenAt);
        const fingerprint = hash(`${identity}|${nth}`).slice(0, 32);
        // Never carry the matched text of a secret into the combined report.
        if (category === 'secrets' && loc.region) delete loc.region.snippet;
        result.partialFingerprints = { ...result.partialFingerprints, 'keteLoom/v1': fingerprint };
        kept.push(result);
        findings.push({
          id: fingerprint.slice(0, 12), fingerprint, tool, tools: [tool], category, rule: ruleId,
          severity: severityOf(result, rules[ruleId]), file, line,
          message: ((result.message && result.message.text) || (rules[ruleId] && rules[ruleId].shortDescription && rules[ruleId].shortDescription.text) || '').trim(),
        });
      }
      runs.push({ ...sr, results: kept });
    }
  }

  // The same issue from two tools (gitleaks and scan-secrets, opengrep and bandit) becomes one finding;
  // two rules from one tool on the same line stay separate, and one rule matching a line twice is one finding.
  const list = [];
  const byLine = new Map();
  for (const f of findings) {
    const key = `${f.category}|${f.file}|${f.line}`;
    const prev = f.file && (byLine.get(key) || []).find((p) => !p.tools.includes(f.tool) || p.fingerprint === f.fingerprint);
    if (!prev) {
      list.push(f);
      byLine.set(key, [...(byLine.get(key) || []), f]);
      continue;
    }
    dropped.duplicates++;
    if (prev.fingerprint === f.fingerprint) continue;
    prev.tools.push(f.tool);
    prev.also = [...(prev.also || []), `${f.tool}:${f.rule}`];
    if (SEVERITIES.indexOf(f.severity) < SEVERITIES.indexOf(prev.severity)) prev.severity = f.severity;
  }
  list.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || String(a.file).localeCompare(String(b.file)) || a.line - b.line);
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, list.filter((f) => f.severity === s).length]));

  // Triage goes rule by rule: one trace often settles every hit of a noisy audit rule.
  const byRule = {};
  for (const f of list) byRule[`${f.tool}:${f.rule}`] = (byRule[`${f.tool}:${f.rule}`] || 0) + 1;
  const summary = { scope: run.scope, tools: run.tools, counts, byRule, dropped, findings: list };
  fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify(summary, null, 2));
  // Rule names, descriptions and code-flow details repeat the same local paths; drop them all at once.
  let combined = JSON.stringify({ $schema: 'https://json.schemastore.org/sarif-2.1.0.json', version: '2.1.0', runs }, null, 2);
  for (const local of [`${root}${path.sep}`, rulePrefix].filter(Boolean)) combined = combined.split(JSON.stringify(local).slice(1, -1)).join('');
  fs.writeFileSync(path.join(outDir, 'results.sarif'), combined);
  return summary;
}

function main(argv) {
  const failIdx = argv.indexOf('--fail-on');
  const failOn = failIdx >= 0 ? argv[failIdx + 1] : null;
  const rest = failIdx >= 0 ? argv.filter((_, i) => i !== failIdx && i !== failIdx + 1) : argv;
  if (rest.length !== 1 || (failIdx >= 0 && !SEVERITIES.slice(0, 4).includes(failOn))) {
    console.error('usage: normalise.js <out-dir> [--fail-on critical|high|medium|low]');
    return 2;
  }
  const outDir = path.resolve(rest[0]);
  if (!fs.existsSync(path.join(outDir, 'run.json'))) {
    console.error(`no run.json in ${outDir}: run run-scanners.js first`);
    return 2;
  }
  let s;
  try {
    s = normalise(outDir);
  } catch (e) {
    console.error(`cannot normalise ${outDir}: ${e.message}`);
    return 2;
  }
  const ran = s.tools.filter((t) => t.status === 'ok' || t.status === 'partial');
  const notRun = s.tools.filter((t) => t.status !== 'ok');
  console.log(`Scanned (${s.scope.mode}): ${ran.map((t) => `${t.name} ${t.version || ''}`.trim()).join(', ') || 'nothing'}`);
  if (notRun.length) console.log(`Not scanned or partial: ${notRun.map((t) => `${t.name} (${t.status}: ${t.reason})`).join('; ')}`);
  console.log(`Findings: ${s.findings.length} (${SEVERITIES.map((k) => `${s.counts[k]} ${k}`).join(', ')}); dropped ${s.dropped.excluded} in vendored/generated paths, ${s.dropped.outsideDiff} outside the diff, ${s.dropped.duplicates} duplicates`);
  const rules = Object.entries(s.byRule).sort((a, b) => b[1] - a[1]);
  if (rules.length > 1) console.log(`By rule: ${rules.slice(0, 10).map(([r, n]) => `${n} ${r}`).join(', ')}${rules.length > 10 ? `, and ${rules.length - 10} more` : ''}`);
  for (const f of s.findings.slice(0, 50)) console.log(`  [${f.severity}] ${f.file || '(no file)'}:${f.line}  ${f.tools.join('+')} ${f.rule}  ${f.message.split('\n')[0].slice(0, 120)}`);
  if (s.findings.length > 50) console.log(`  ... ${s.findings.length - 50} more in findings.json`);
  console.log(`\n${path.join(outDir, 'findings.json')}\n${path.join(outDir, 'results.sarif')}`);
  if (failOn && s.findings.some((f) => SEVERITIES.indexOf(f.severity) <= SEVERITIES.indexOf(failOn))) return 1;
  return 0;
}

module.exports = { normalise, severityOf };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
