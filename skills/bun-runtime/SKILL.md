---
name: bun-runtime
description: Working with Bun as a JavaScript runtime, package manager, test runner and bundler, and knowing where it differs from Node and npm, including bun.lock and trustedDependencies, bunfig.toml, bun test with bun:test mocks, bun build and --compile, Bun.serve, automatic .env loading, Node API compatibility gaps, and when to stay on Node. Use when adopting or migrating to Bun, debugging something that works on Node but fails under Bun, setting up bun test or bun install in CI, or deciding whether Bun is a safe choice for a project.
license: MIT
compatibility: Any Agent Skills host. Needs the bun CLI. Bun changes quickly; confirm version-specific behaviour against bun.com/docs for the installed version (bun --version).
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "bun"
  kete-loom/owner: "Kete-org"
---

# Bun runtime

Bun is four tools in one binary: a runtime (JavaScriptCore, not V8), a package manager, a test runner and a bundler. A project can adopt any of them separately. Decide which ones you are using before changing anything.

## First, look at the project

1. Run `bun --version` and read `package.json`, `bunfig.toml` (if any) and the lockfile name: `bun.lock` (text, Bun 1.2+), `bun.lockb` (older binary format), or another manager's lockfile.
2. Note what runs in production: Bun, Node, or a serverless platform. The deploy target decides which Bun APIs are safe to use.
3. Search the code for `Bun.`, `bun:` imports and native addons (`.node` files, `node-gyp`, `prebuild` in dependencies).

Stop and ask the user before switching the production runtime from Node to Bun, or replacing the project's package manager, test runner or bundler. Each is a separate decision.

## Package manager

- `bun install` reads `package.json` and writes `bun.lock`. Commit it; delete other managers' lockfiles only when the team has agreed to switch.
- Convert an old `bun.lockb` with `bun install --save-text-lockfile --frozen-lockfile --lockfile-only`, then remove `bun.lockb`.
- CI: `bun install --frozen-lockfile` (or `bun ci`). Bun does not enable frozen mode automatically in CI.
- **Lifecycle scripts of dependencies do not run** unless the package is listed in `trustedDependencies` in `package.json`. A package that needs a `postinstall` (native builds, binary downloads such as some image, database or browser packages) often fails later at runtime instead of during install. Add it to `trustedDependencies` deliberately and reinstall; never trust everything blindly.
- Linker: workspaces created on recent Bun default to the `isolated` layout (pnpm-like, no phantom dependencies); single packages and older projects default to `hoisted`. Code that imports an undeclared transitive dependency breaks under `isolated`: declare the dependency rather than switching linker.
- `bunx <pkg>` is the `npx` equivalent. `bun run <script>` runs `package.json` scripts; CLIs with a `#!/usr/bin/env node` shebang (vite, next) still run under Node unless you use `bun run --bun <script>`.

## Runtime differences from Node

- **TypeScript and JSX run directly** with no build step, but **Bun does not type-check**. Keep `tsc --noEmit` in the check pipeline.
- **`.env` is loaded automatically** (`.env`, then `.env.<NODE_ENV>`, `.env.local` (skipped when `NODE_ENV=test`), `.env.<NODE_ENV>.local`). This can surprise tools that load env themselves (Vite warns about it) and can leak local values into tests. Use `--env-file <path>` to choose files, or `--no-env-file` / `env = false` in `bunfig.toml` to turn it off.
- ESM and CommonJS can be mixed in one file, and `require` of ESM works. Code that relies on this will not run on Node; keep shared libraries Node-compatible.
- Bun-only APIs: `Bun.serve`, `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.password`, `bun:sqlite`, `bun:ffi`. Use them only in code that will never run on Node; otherwise use `node:` modules.
- Native addons: N-API addons generally work; addons that use V8's C++ API directly do not, because there is no V8.
- `Bun.serve({ fetch(req) { ... } })` uses web `Request`/`Response`. Express and Fastify also run on Bun through its `node:http` implementation; benchmark before assuming a speed-up for your workload.

## Known Node compatibility gaps

Bun publishes a per-module compatibility page (bun.com/docs/runtime/nodejs-compat). Check it for the installed version before relying on any of these. Gaps that commonly matter:

| Area | What breaks |
|---|---|
| `async_hooks.createHook` | Stubbed; APM/tracing agents that depend on it lose context. `AsyncLocalStorage` itself works. |
| `node:v8`, `node:inspector` | Partial: `v8.serialize` uses JavaScriptCore's format, and the inspector covers only some domains. Profilers and heap tools written for V8 may not work. |
| `node:crypto` | Partial: Bun uses BoringSSL, so some algorithms and APIs are missing. Test the exact algorithm you need on Bun. |
| `node:cluster` | Partial: HTTP servers in workers each bind their own socket, so do not assume Node's load balancing. |
| `node:test` | Partial: works only when files run under `bun test`; prefer `bun:test`. |
| `node:sea` | Not supported; use `bun build --compile`. |

When something works on Node but fails on Bun: reproduce with a minimal script on both, check the compatibility page and Bun's issue tracker, then either work around it or keep that piece on Node. Never patch `node_modules`.

## bun test

- Discovers `*.test.*`, `*_test.*`, `*.spec.*`, `*_spec.*`. Import from `bun:test`: `test`, `describe`, `expect`, `beforeEach`, `mock`, `spyOn`.
- Jest-compatible but not complete: `jest.fn()` works, `mock.module('pkg', () => ({ ... }))` replaces a module, but some Jest matchers and config options are missing. When migrating, run the whole suite and fix gaps one by one; do not mix Jest and `bun test` on the same files.
- Setup files: `bun test --preload ./test/setup.ts`, or `[test] preload = ["./test/setup.ts"]` in `bunfig.toml`. DOM tests need a preload that registers happy-dom (`@happy-dom/global-registrator`).
- Useful flags: `--watch`, `--coverage` (`--coverage-reporter=lcov` for CI), `--timeout <ms>` (default 5000), `-u` to update snapshots, `--bail`.
- Bun runs test files in a single process by default: tests that mutate globals, env or `mock.module` state leak into other files. Restore mocks in `afterEach`, or pass `--parallel` to spread files across CPU cores (check that your Bun version has this flag).

## bun build

- `bun build ./src/index.ts --outdir dist --target node|bun|browser`. Add `--minify`, `--sourcemap=linked`, `--splitting`, `--external <pkg>` as needed. JS API: `await Bun.build({ entrypoints, outdir, target })`.
- It does not emit `.d.ts` files; libraries still need `tsc --emitDeclarationOnly`.
- `bun build --compile ./src/cli.ts --outfile mycli` makes a standalone executable with the runtime embedded (large binary, but no install step for users).
- For browser apps with HMR, dev server and framework plugins, a dedicated tool (Vite, see the `vite-patterns` skill) is usually the better fit.

## When not to use Bun

Recommend staying on Node (or keeping Node in production while using Bun for install/test) when:

- The service depends on an APM, profiler or tracing agent that needs V8 or `async_hooks` hooks.
- It uses native addons built against V8, or crypto primitives BoringSSL lacks.
- The hosting platform has no first-class Bun runtime and a custom runtime is not acceptable to the team.
- The team needs long-term-support guarantees comparable to Node LTS.
- A library the project depends on documents Bun as unsupported.

## Never

- Commit both `bun.lock` and another manager's lockfile as sources of truth.
- Add every dependency to `trustedDependencies` to make an install error go away.
- Use `Bun.*` APIs in a package published for Node users.
- Drop `tsc` because "Bun runs TypeScript".

## Report

When asked to evaluate or migrate, return: what was switched (runtime / package manager / tests / bundler), commands now used for install, test, build and start, any compatibility gap found and its workaround, and the test and type-check results on Bun.
