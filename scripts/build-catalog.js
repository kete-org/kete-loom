#!/usr/bin/env node
'use strict';

// Writes catalog.json (machine-readable index used by the Kete Code portal and
// installers) and refreshes the skills table in README.md between markers.

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, SKILLS_DIR, listSkills } = require('./lib/skills');

const skills = listSkills(SKILLS_DIR);
const version = require(path.join(REPO_ROOT, 'package.json')).version;

const catalog = {
  name: 'kete-loom',
  version,
  skills: skills.map((s) => ({
    name: s.dir,
    version: s.version,
    category: s.category,
    risk: s.risk,
    requires: s.requires,
    description: s.description,
    path: `skills/${s.dir}`,
  })),
};
fs.writeFileSync(path.join(REPO_ROOT, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');

const firstSentence = (d) => d.split(/(?<=\.)\s/)[0];
const table = [
  '| Skill | Category | Risk | What it does |',
  '|---|---|---|---|',
  ...skills.map((s) => `| [\`${s.dir}\`](skills/${s.dir}/SKILL.md) | ${s.category} | ${s.risk} | ${firstSentence(s.description)} |`),
].join('\n');

const readmePath = path.join(REPO_ROOT, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');
const updated = readme.replace(/<!-- catalog:start -->[\s\S]*<!-- catalog:end -->/, `<!-- catalog:start -->\n${table}\n<!-- catalog:end -->`);
fs.writeFileSync(readmePath, updated);
console.log(`catalog.json and README table updated (${skills.length} skills)`);
