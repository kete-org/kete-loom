'use strict';

// Translated READMEs (docs/i18n/README.<lang>.md) translate the English README's prose. The generated
// catalog tables stay English-only, so the hash below ignores them: a translation is only out of date
// when the prose it was made from changes.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const I18N_DIR = path.join(REPO_ROOT, 'docs', 'i18n');
const LANGUAGES = {
  ar: 'العربية',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  'pt-BR': 'Português (Brasil)',
  sw: 'Kiswahili',
  'zh-CN': '简体中文',
};
// The searchable catalog site, deployed by .github/workflows/pages.yml.
const SITE_URL = 'https://kete-org.github.io/kete-loom/';
const SOURCE_RE = /<!-- translated from README\.md, source ([0-9a-f]{12}) -->/;
const GENERATED_RE = /(<!-- (\w+):start -->)[\s\S]*?(<!-- \2:end -->)/g;
const SWITCHER_RE = /<!-- languages:start -->[\s\S]*?<!-- languages:end -->/;

// The English prose with generated tables and the language switcher emptied.
const prose = (text) => text.replace(SWITCHER_RE, '').replace(GENERATED_RE, '$1$3');
const sourceHash = (text = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8')) =>
  crypto.createHash('sha256').update(prose(text)).digest('hex').slice(0, 12);

const switcher = (from = '') =>
  `<!-- languages:start -->\n<p align="center">${[['README.md', 'English'], ...Object.entries(LANGUAGES).map(([code, label]) => [`docs/i18n/README.${code}.md`, label])]
    .map(([file, label]) => `<a href="${path.posix.relative(from || '.', file)}">${label}</a>`)
    .join(' · ')} · <a href="${SITE_URL}">Browse the catalog ↗</a></p>\n<!-- languages:end -->`;

// Each translation that exists: its language and whether it matches the current English prose.
function translations() {
  const current = sourceHash();
  return Object.keys(LANGUAGES)
    .map((code) => ({ code, file: path.join(I18N_DIR, `README.${code}.md`) }))
    .filter((t) => fs.existsSync(t.file))
    .map((t) => {
      const m = SOURCE_RE.exec(fs.readFileSync(t.file, 'utf8'));
      return { ...t, source: m && m[1], current: Boolean(m) && m[1] === current };
    });
}

module.exports = { LANGUAGES, I18N_DIR, sourceHash, prose, switcher, translations, SOURCE_RE, SWITCHER_RE };
