#!/usr/bin/env node
'use strict';

// Detects a project's verification commands and prints them as JSON.
// Usage: node detect-checks.js [project-dir]
// Read-only: it never runs the commands it finds.

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
const has = (f) => fs.existsSync(path.join(root, f));
const read = (f) => {
  try {
    return fs.readFileSync(path.join(root, f), 'utf8');
  } catch {
    return '';
  }
};
const checks = [];
const add = (kind, command, source) => {
  if (!checks.some((c) => c.command === command)) checks.push({ kind, command, source });
};

// JavaScript / TypeScript
if (has('package.json')) {
  let pkg = {};
  try {
    pkg = JSON.parse(read('package.json'));
  } catch {}
  const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') || has('bun.lock') ? 'bun' : 'npm';
  const run = (s) => (pm === 'npm' ? `npm run ${s}` : `${pm} ${s}`);
  const scripts = pkg.scripts || {};
  const map = [
    ['build', /^build$/],
    ['format', /^(format:check|fmt:check|prettier:check|check:format)$/],
    ['lint', /^(lint|eslint|biome)$/],
    ['typecheck', /^(typecheck|type-check|tsc|check:types|types)$/],
    ['test', /^(test|test:unit|vitest|jest)$/],
    ['test-integration', /^test:(integration|int)$/],
  ];
  for (const [kind, re] of map) for (const s of Object.keys(scripts)) if (re.test(s)) add(kind, s === 'test' && pm === 'npm' ? 'npm test' : run(s), 'package.json');
  if (!Object.keys(scripts).some((s) => /type/.test(s)) && has('tsconfig.json')) add('typecheck', `${pm === 'npm' ? 'npx' : pm + ' exec'} tsc --noEmit`, 'tsconfig.json');
}

// Python
if (has('pyproject.toml') || has('setup.cfg') || has('requirements.txt')) {
  const py = read('pyproject.toml') + read('setup.cfg');
  const runner = has('uv.lock') ? 'uv run ' : has('poetry.lock') ? 'poetry run ' : '';
  if (/\[tool\.ruff/.test(py) || has('ruff.toml')) {
    add('format', `${runner}ruff format --check .`, 'ruff');
    add('lint', `${runner}ruff check .`, 'ruff');
  } else if (/flake8/.test(py) || has('.flake8')) add('lint', `${runner}flake8`, 'flake8');
  if (/\[tool\.black/.test(py)) add('format', `${runner}black --check .`, 'black');
  if (/\[tool\.mypy/.test(py) || has('mypy.ini')) add('typecheck', `${runner}mypy .`, 'mypy');
  if (/\[tool\.pyright/.test(py) || has('pyrightconfig.json')) add('typecheck', `${runner}pyright`, 'pyright');
  if (/pytest/.test(py) || has('pytest.ini') || has('tests') || has('conftest.py')) add('test', `${runner}pytest`, 'pytest');
}

// Go
if (has('go.mod')) {
  add('build', 'go build ./...', 'go.mod');
  add('lint', 'go vet ./...', 'go.mod');
  if (has('.golangci.yml') || has('.golangci.yaml')) add('lint', 'golangci-lint run', '.golangci.yml');
  add('test', 'go test ./...', 'go.mod');
}

// Rust
if (has('Cargo.toml')) {
  add('format', 'cargo fmt --check', 'Cargo.toml');
  add('lint', 'cargo clippy --all-targets -- -D warnings', 'Cargo.toml');
  add('test', 'cargo test', 'Cargo.toml');
}

// JVM
if (has('gradlew')) {
  add('build', './gradlew build -x test', 'gradlew');
  add('test', './gradlew test', 'gradlew');
} else if (has('pom.xml')) {
  add('build', 'mvn -q -DskipTests package', 'pom.xml');
  add('test', 'mvn -q test', 'pom.xml');
}

// .NET
if (fs.readdirSync(root).some((f) => /\.(sln|csproj|fsproj)$/.test(f))) {
  add('build', 'dotnet build', '.NET');
  add('test', 'dotnet test', '.NET');
}

// Makefile targets
const make = read('Makefile');
for (const [kind, target] of [['build', 'build'], ['lint', 'lint'], ['typecheck', 'typecheck'], ['test', 'test']]) {
  if (new RegExp(`^${target}:`, 'm').test(make)) add(kind, `make ${target}`, 'Makefile');
}

const order = ['build', 'format', 'lint', 'typecheck', 'test', 'test-integration'];
checks.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

const ci = has('.github/workflows') ? fs.readdirSync(path.join(root, '.github/workflows')).map((f) => `.github/workflows/${f}`) : [];
console.log(JSON.stringify({ root, checks, ciFilesToReview: ci }, null, 2));
if (!checks.length) process.exitCode = 3;
