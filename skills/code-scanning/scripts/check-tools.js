#!/usr/bin/env node
'use strict';

// Finds which scanners are installed and which apply to a repository. Read-only: never installs.
//   node check-tools.js [repo-dir]           table for this OS
//   node check-tools.js [repo-dir] --json    machine-readable, install commands for every OS
// Exit code 0 always (a missing tool is information, not an error); 2 on bad arguments.

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', 'third_party', 'dist', 'build', 'out', 'target', '.venv', 'venv', '__pycache__', 'coverage', '.next']);

// Versions here and in references/tools.md are the pinned ones; bump both together.
const TOOLS = [
  {
    name: 'opengrep', category: 'sast', bin: 'opengrep', version: ['--version'], applies: (r) => r.code,
    install: {
      macos: 'curl -fsSL -o ~/.local/bin/opengrep https://github.com/opengrep/opengrep/releases/download/v1.32.0/opengrep_osx_arm64 && chmod +x ~/.local/bin/opengrep  # verify .sig/.cert with cosign first, see references/tools.md',
      linux: 'curl -fsSL -o ~/.local/bin/opengrep https://github.com/opengrep/opengrep/releases/download/v1.32.0/opengrep_manylinux_x86 && chmod +x ~/.local/bin/opengrep  # verify .sig/.cert with cosign first',
      windows: 'download opengrep_windows_x86.exe from https://github.com/opengrep/opengrep/releases/tag/v1.32.0 and verify it (see references/tools.md)',
    },
  },
  {
    name: 'semgrep', category: 'sast', bin: 'semgrep', version: ['--version'], applies: (r) => r.code, fallbackFor: 'opengrep',
    install: { macos: 'pipx install semgrep==1.182.0', linux: 'pipx install semgrep==1.182.0', windows: 'pipx install semgrep==1.182.0' },
  },
  {
    name: 'eslint', category: 'sast', bin: null, applies: (r) => r.eslintSecurity,
    reason: (r) => (r.eslint && !r.eslintSecurity ? 'project uses ESLint without eslint-plugin-security; adding it is a project change, ask first' : null),
    install: { macos: 'npm install --save-dev eslint-plugin-security  (project change: ask)', linux: 'same as macOS', windows: 'same as macOS' },
  },
  {
    name: 'bandit', category: 'sast', bin: 'bandit', version: ['--version'], applies: (r) => r.python,
    install: { macos: 'pipx install "bandit[sarif]==1.9.4"', linux: 'pipx install "bandit[sarif]==1.9.4"', windows: 'pipx install "bandit[sarif]==1.9.4"' },
  },
  {
    name: 'gosec', category: 'sast', bin: 'gosec', version: ['-version'], applies: (r) => r.go,
    install: { macos: 'go install github.com/securego/gosec/v2/cmd/gosec@v2.30.0', linux: 'go install github.com/securego/gosec/v2/cmd/gosec@v2.30.0', windows: 'go install github.com/securego/gosec/v2/cmd/gosec@v2.30.0' },
  },
  {
    name: 'gitleaks', category: 'secrets', bin: 'gitleaks', version: ['version'], applies: () => true,
    install: { macos: 'brew install gitleaks', linux: 'download gitleaks_8.30.1_linux_x64.tar.gz and its checksums.txt from https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1, check with sha256sum -c', windows: 'scoop install gitleaks' },
  },
  {
    name: 'osv-scanner', category: 'deps', bin: 'osv-scanner', version: ['--version'], applies: (r) => r.lockfile,
    install: { macos: 'brew install osv-scanner', linux: 'go install github.com/google/osv-scanner/v2/cmd/osv-scanner@v2.7.0', windows: 'scoop install osv-scanner' },
  },
  {
    name: 'checkov', category: 'iac', bin: 'checkov', version: ['--version'], applies: (r) => r.iac,
    install: { macos: 'pipx install checkov==3.3.30', linux: 'pipx install checkov==3.3.30', windows: 'pipx install checkov==3.3.30' },
  },
  {
    name: 'trivy', category: 'iac', bin: 'trivy', version: ['--version'], applies: (r) => r.iac, fallbackFor: 'checkov',
    install: { macos: 'brew install trivy', linux: 'download trivy_0.76.1_Linux-64bit.tar.gz and trivy_0.76.1_checksums.txt from https://github.com/aquasecurity/trivy/releases/tag/v0.76.1, check with sha256sum -c', windows: 'scoop install trivy' },
  },
  {
    name: 'hadolint', category: 'docker', bin: 'hadolint', version: ['--version'], applies: (r) => r.dockerfile,
    install: { macos: 'brew install hadolint', linux: 'download hadolint-linux-x86_64 and its .sha256 from https://github.com/hadolint/hadolint/releases/tag/v2.15.1', windows: 'scoop install hadolint' },
  },
  {
    name: 'zizmor', category: 'actions', bin: 'zizmor', version: ['--version'], applies: (r) => r.actions,
    install: { macos: 'brew install zizmor', linux: 'pipx install zizmor==1.31.1', windows: 'pipx install zizmor==1.31.1' },
  },
];

function listFiles(root) {
  try {
    const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    return out.split('\n').filter(Boolean);
  } catch {
    // Not a git repo: walk the tree instead.
    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = dir ? `${dir}/${e.name}` : e.name;
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(rel); } else files.push(rel);
      }
    };
    walk('');
    return files;
  }
}

function detectRepo(root) {
  const files = listFiles(root).filter((f) => !f.split('/').some((s) => SKIP_DIRS.has(s)));
  const any = (re) => files.some((f) => re.test(f));
  let pkg = {};
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch {}
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const eslint = Boolean(deps.eslint);
  return {
    files: files.length,
    code: any(/\.(js|jsx|mjs|cjs|ts|tsx|py|go|java|kt|rb|php|cs|rs|scala|swift|c|cc|cpp|h)$/),
    python: any(/\.py$/),
    go: any(/(^|\/)go\.mod$/),
    eslint,
    eslintSecurity: eslint && Boolean(deps['eslint-plugin-security']) && fs.existsSync(path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js')),
    lockfile: any(/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lock|uv\.lock|poetry\.lock|requirements[^/]*\.txt|Cargo\.lock|go\.sum|Gemfile\.lock|composer\.lock|packages\.lock\.json)$/),
    iac: any(/\.tf$|(^|\/)(Chart\.yaml|kustomization\.ya?ml)$|(^|\/)(k8s|kubernetes|manifests|helm|cloudformation)\/.*\.ya?ml$|\.bicep$/),
    dockerfile: any(/(^|\/)(Dockerfile|Containerfile)([.-][^/]*)?$/),
    actions: any(/^\.github\/workflows\/[^/]+\.ya?ml$/),
  };
}

function version(tool) {
  if (!tool.bin) return null;
  const r = spawnSync(tool.bin, tool.version, { encoding: 'utf8', timeout: 15000 });
  if (r.error || r.status !== 0) return null;
  const m = `${r.stdout}\n${r.stderr}`.match(/\d+\.\d+\.\d+/);
  return m ? m[0] : 'unknown';
}

function check(root) {
  const repo = detectRepo(root);
  const tools = TOOLS.map((t) => {
    const installed = t.name === 'eslint' ? (repo.eslintSecurity ? 'project' : null) : version(t);
    return {
      name: t.name, category: t.category, fallbackFor: t.fallbackFor || null,
      installed: Boolean(installed), version: installed,
      applies: Boolean(t.applies(repo)), reason: t.reason ? t.reason(repo) : null,
      install: t.install,
    };
  });
  return { root, platform: process.platform, repo, tools };
}

const OS = { darwin: 'macos', win32: 'windows' };

function main(argv) {
  const json = argv.includes('--json');
  const rest = argv.filter((a) => a !== '--json');
  if (rest.some((a) => a.startsWith('-')) || rest.length > 1) {
    console.error('usage: check-tools.js [repo-dir] [--json]');
    return 2;
  }
  const root = path.resolve(rest[0] || '.');
  if (!fs.existsSync(root)) {
    console.error(`no such folder: ${root}`);
    return 2;
  }
  const result = check(root);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  const os = OS[process.platform] || 'linux';
  console.log(`Scanners for ${root} (${result.repo.files} files)\n`);
  for (const t of result.tools) {
    const state = t.installed ? `installed ${t.version}` : 'missing';
    const use = t.applies ? 'applies' : 'not needed';
    console.log(`${t.name.padEnd(12)} ${t.category.padEnd(8)} ${state.padEnd(20)} ${use}${t.fallbackFor ? ` (fallback for ${t.fallbackFor})` : ''}`);
    if (t.reason) console.log(`${''.padEnd(13)}${t.reason}`);
    if (!t.installed && t.applies) console.log(`${''.padEnd(13)}install: ${t.install[os]}`);
  }
  console.log('\nAsk the user before installing anything. Skipped scanners go in the report as "not scanned".');
  return 0;
}

module.exports = { TOOLS, check, detectRepo };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
