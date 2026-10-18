'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

function listSkills(skillsDir = SKILLS_DIR) {
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')))
    .map((d) => loadSkill(path.join(skillsDir, d.name)))
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

function loadSkill(skillPath) {
  const file = path.join(skillPath, 'SKILL.md');
  const text = fs.readFileSync(file, 'utf8');
  const { data, body, errors } = parseFrontmatter(text);
  const meta = (data && data.metadata) || {};
  return {
    dir: path.basename(skillPath),
    path: skillPath,
    file,
    text,
    body,
    data: data || {},
    parseErrors: errors,
    name: data && data.name,
    description: data && data.description,
    version: meta['kete-loom/version'],
    category: meta['kete-loom/category'],
    risk: meta['kete-loom/risk'],
    requires: (meta['kete-loom/requires'] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

module.exports = { REPO_ROOT, SKILLS_DIR, listSkills, loadSkill };
