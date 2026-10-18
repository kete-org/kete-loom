'use strict';

// Install profiles (profiles.json): named selections of skills, agents, commands and hooks.
// A profile can extend others, add whole categories, and `detect` the project's languages,
// frameworks and tools so only the packs it uses are installed.

const fs = require('fs');
const path = require('path');

const PROFILES_FILE = path.join(__dirname, '..', '..', 'profiles.json');
const KINDS = ['skills', 'agents', 'commands', 'hooks'];

const loadProfiles = (file = PROFILES_FILE) => JSON.parse(fs.readFileSync(file, 'utf8'));

// What a project uses -> the items that help with it. `when` gets helpers over the project folder.
const lang = (name) => ({ skills: [`${name}-patterns`, `${name}-testing`], agents: [`${name}-reviewer`, `${name}-build-resolver`] });
const DETECT = [
  { what: 'TypeScript/JavaScript', when: (p) => p.has('package.json') || p.has('tsconfig.json'), ...lang('typescript') },
  { what: 'Python', when: (p) => p.has('pyproject.toml') || p.has('requirements.txt') || p.has('setup.py') || p.has('Pipfile'), ...lang('python') },
  { what: 'Go', when: (p) => p.has('go.mod'), ...lang('go') },
  { what: 'Rust', when: (p) => p.has('Cargo.toml'), ...lang('rust') },
  { what: 'Java', when: (p) => p.has('pom.xml') || p.has('build.gradle') || p.ext('.java'), ...lang('java') },
  { what: 'Kotlin', when: (p) => p.has('build.gradle.kts') || p.ext('.kt'), ...lang('kotlin') },
  { what: 'C#', when: (p) => p.ext('.csproj') || p.ext('.sln'), ...lang('csharp') },
  { what: 'F#', when: (p) => p.ext('.fsproj'), ...lang('fsharp') },
  { what: 'C++', when: (p) => p.has('CMakeLists.txt') || p.ext('.cpp') || p.ext('.hpp'), ...lang('cpp') },
  { what: 'Swift', when: (p) => p.has('Package.swift') || p.ext('.xcodeproj'), ...lang('swift') },
  { what: 'Dart', when: (p) => p.has('pubspec.yaml'), ...lang('dart') },
  { what: 'PHP', when: (p) => p.has('composer.json'), ...lang('php') },
  { what: 'Ruby', when: (p) => p.has('Gemfile'), ...lang('ruby') },
  { what: 'Perl', when: (p) => p.has('cpanfile') || p.has('Makefile.PL'), ...lang('perl') },
  { what: 'React', when: (p) => p.dep('react'), skills: ['react-patterns', 'react-performance'], agents: ['react-reviewer'] },
  { what: 'Next.js', when: (p) => p.dep('next'), skills: ['nextjs-patterns'] },
  { what: 'Vue', when: (p) => p.dep('vue'), skills: ['vue-patterns'], agents: ['vue-reviewer'] },
  { what: 'Nuxt', when: (p) => p.dep('nuxt'), skills: ['nuxt-patterns'] },
  { what: 'Angular', when: (p) => p.dep('@angular/core'), skills: ['angular-patterns'] },
  { what: 'Svelte', when: (p) => p.dep('svelte'), skills: ['svelte-patterns'] },
  { what: 'React Native', when: (p) => p.dep('react-native'), skills: ['react-native-patterns'] },
  { what: 'NestJS', when: (p) => p.dep('@nestjs/core'), skills: ['nestjs-patterns'] },
  { what: 'Node HTTP server', when: (p) => p.dep('express') || p.dep('fastify'), skills: ['node-backend-patterns'] },
  { what: 'Prisma', when: (p) => p.dep('prisma') || p.dep('@prisma/client'), skills: ['prisma-patterns'] },
  { what: 'Vite', when: (p) => p.dep('vite'), skills: ['vite-patterns'] },
  { what: 'Playwright', when: (p) => p.dep('@playwright/test'), skills: ['e2e-testing-playwright'], agents: ['e2e-runner'] },
  { what: 'Django', when: (p) => p.py('django'), skills: ['django-patterns'], agents: ['django-reviewer'] },
  { what: 'FastAPI', when: (p) => p.py('fastapi'), skills: ['fastapi-patterns'], agents: ['fastapi-reviewer'] },
  { what: 'Flask', when: (p) => p.py('flask'), skills: ['flask-patterns'] },
  { what: 'PyTorch', when: (p) => p.py('torch'), skills: ['pytorch-patterns'], agents: ['mle-reviewer'] },
  { what: 'Rails', when: (p) => /\brails\b/.test(p.read('Gemfile')), skills: ['rails-patterns'] },
  { what: 'Laravel', when: (p) => /laravel\/framework/.test(p.read('composer.json')), skills: ['laravel-patterns'] },
  { what: 'Spring Boot', when: (p) => /spring-boot/.test(p.read('pom.xml') + p.read('build.gradle') + p.read('build.gradle.kts')), skills: ['spring-boot-patterns', 'jpa-hibernate'] },
  { what: 'Quarkus', when: (p) => /io\.quarkus/.test(p.read('pom.xml') + p.read('build.gradle') + p.read('build.gradle.kts')), skills: ['quarkus-patterns'] },
  { what: 'Ktor', when: (p) => /io\.ktor/.test(p.read('build.gradle.kts') + p.read('build.gradle')), skills: ['ktor-patterns'] },
  { what: 'ASP.NET Core', when: (p) => p.ext('.csproj') && /Microsoft\.NET\.Sdk\.Web|AspNetCore/.test(p.readExt('.csproj')), skills: ['aspnet-core-patterns'] },
  { what: 'EF Core', when: (p) => /EntityFrameworkCore/.test(p.readExt('.csproj')), skills: ['ef-core-patterns'] },
  { what: 'Flutter', when: (p) => /\bflutter:/.test(p.read('pubspec.yaml')), skills: ['flutter-patterns'], agents: ['flutter-reviewer'] },
  { what: 'Docker', when: (p) => p.has('Dockerfile') || p.has('compose.yaml') || p.has('docker-compose.yml'), skills: ['docker-patterns'] },
  { what: 'Terraform', when: (p) => p.ext('.tf'), skills: ['terraform-patterns'], agents: ['infra-reviewer'] },
  { what: 'GitHub Actions', when: (p) => p.has('.github/workflows'), skills: ['github-actions-ci'] },
  { what: 'dbt', when: (p) => p.has('dbt_project.yml'), skills: ['dbt-patterns'] },
  { what: 'Solidity', when: (p) => p.has('foundry.toml') || p.has('hardhat.config.ts') || p.has('hardhat.config.js'), skills: ['solidity-patterns', 'smart-contract-security'], agents: ['solidity-reviewer'] },
];

// Read-only view of a project folder (top level only, plus package.json/pyproject dependencies).
function inspect(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    // unreadable or missing folder: nothing detected
  }
  const read = (f) => {
    try {
      return fs.readFileSync(path.join(dir, f), 'utf8');
    } catch {
      return '';
    }
  };
  let pkg = {};
  try {
    pkg = JSON.parse(read('package.json') || '{}');
  } catch {
    // invalid package.json: no JS dependencies detected
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  const python = (read('pyproject.toml') + read('requirements.txt') + read('setup.py') + read('Pipfile')).toLowerCase();
  return {
    has: (f) => fs.existsSync(path.join(dir, f)),
    ext: (e) => entries.some((f) => f.endsWith(e)),
    read,
    readExt: (e) => entries.filter((f) => f.endsWith(e)).map(read).join('\n'),
    dep: (name) => Object.prototype.hasOwnProperty.call(deps, name),
    py: (name) => new RegExp(`(^|[\\s"'\\[,])${name}([\\s"'<>=~!\\],;]|$)`, 'm').test(python),
  };
}

function detect(dir) {
  const p = inspect(dir);
  return DETECT.filter((d) => d.when(p));
}

// Resolves profile names to { all, skills, agents, commands, hooks: Set, detected: [labels] }.
function resolveProfiles(names, { catalog, cwd = process.cwd(), profiles = loadProfiles() }) {
  const out = { all: false, detected: [], ...Object.fromEntries(KINDS.map((k) => [k, new Set()])) };
  const seen = new Set();
  const visit = (name, chain = []) => {
    const p = profiles[name];
    if (!p) throw new Error(`unknown profile "${name}". Known: ${Object.keys(profiles).join(', ')}`);
    if (chain.includes(name)) throw new Error(`profile "${name}" extends itself: ${[...chain, name].join(' -> ')}`);
    if (seen.has(name)) return;
    seen.add(name);
    for (const parent of p.extends || []) visit(parent, [...chain, name]);
    if (p.all) out.all = true;
    for (const k of KINDS) for (const n of p[k] || []) out[k].add(n);
    for (const cat of p.categories || []) for (const k of KINDS) for (const item of catalog[k]) if (item.category === cat) out[k].add(item.dir);
    if (p.detect) {
      for (const d of detect(cwd)) {
        out.detected.push(d.what);
        for (const k of ['skills', 'agents']) for (const n of d[k] || []) out[k].add(n);
      }
    }
  };
  for (const n of names) visit(n);
  out.detected = [...new Set(out.detected)];
  return out;
}

module.exports = { loadProfiles, resolveProfiles, detect, DETECT, PROFILES_FILE };
