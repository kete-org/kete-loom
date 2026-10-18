---
name: typescript-patterns
description: Idiomatic TypeScript and modern JavaScript for Node.js and the browser, covering strict tsconfig settings, discriminated unions and narrowing, restrained generics, typed error handling, async/await pitfalls, ESM versus CommonJS packaging, project layout and ESLint/Prettier setup. Use when writing or restructuring TS/JS code, designing types for a module, setting up tsconfig or package.json "type"/"exports", or choosing lint and format tooling.
license: MIT
compatibility: Any Agent Skills host. Needs Node.js 18+ and the project's package manager (npm, pnpm, yarn or bun).
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# TypeScript patterns

Write TypeScript that the compiler can actually check. Every rule here exists to keep the types honest about what happens at runtime.

## 0. Read the project first

1. Read `package.json` (`type`, `exports`, `engines`, scripts), every `tsconfig*.json`, and the lint/format config (`eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `biome.json`).
2. Note the lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock*`) and use only that package manager.
3. Follow the existing style, folder layout and module system. Do not convert a codebase between ESM and CJS, or between tools, unless the user asked.
4. Find the type-check command (often `tsc --noEmit` or a `typecheck` script) and run it before and after your change.

## 1. tsconfig baseline

For new projects, or when the user asks to tighten settings, start from:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,   // optional; stricter about `undefined`
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "module": "NodeNext",                 // Node apps and libraries
    "moduleResolution": "NodeNext"
    // bundled browser apps: "module": "ESNext", "moduleResolution": "Bundler"
  }
}
```

- Turning on `strict` in an existing codebase can produce hundreds of errors. **Stop and ask** before enabling it repo-wide; offer to enable it per package or fix errors in batches.
- `verbatimModuleSyntax` suits ESM packages (`"type": "module"`) and bundled apps. In files that compile to CommonJS it rejects `import`/`export` syntax (you would need `import x = require()`), so leave it off for CJS packages.
- Never weaken a compiler option to make an error go away.

## 2. Type design

- Model states as **discriminated unions**, not bags of optional fields:
  `type Result = { ok: true; value: User } | { ok: false; error: string }`.
- Narrow with `typeof`, `instanceof`, `in`, a discriminant check, or a type predicate (`(x): x is Foo`). End exhaustive `switch` statements with `default: return assertNever(x)`, where `function assertNever(x: never): never { throw new Error("Unexpected: " + String(x)) }`, so a new variant fails to compile.
- Prefer `unknown` over `any` for values you have not checked. Parse untrusted input (HTTP bodies, `JSON.parse`, env vars, files) at the boundary with a schema library the project already uses (zod, valibot, io-ts) or a hand-written guard.
- Use `as const` and `satisfies` to keep literal types while checking shape: `const routes = {...} satisfies Record<string, Route>`.
- Use `readonly` arrays and properties for data you do not mutate.
- Generics: add a type parameter only when it links two or more positions (input to output). If a parameter appears once, replace it with its constraint. Avoid conditional and mapped types in application code unless they remove real duplication.
- Prefer `type` aliases for unions and `interface` for object shapes that are extended; follow the project if it already chose.
- Avoid `enum`; use a union of string literals or an `as const` object. Avoid `namespace` in new code.

## 3. Things never to do

- `any`, `as any`, `@ts-ignore`, or `!` non-null assertions to silence an error. If a cast is truly needed, use `@ts-expect-error` with a reason, or a checked guard.
- Double casts (`x as unknown as T`) outside tests.
- `Function`, `Object` or `{}` as types.
- Default exports in a codebase that uses named exports (or the reverse).

## 4. Errors

1. Throw `Error` subclasses, never strings or plain objects. Set `name` and pass `{ cause }` when wrapping: `throw new ConfigError("bad port", { cause: err })`.
2. In `catch (err)`, `err` is `unknown`. Narrow before reading properties: `if (err instanceof HttpError) ...`.
3. Catch only where you can handle, add context, or translate the error. Do not catch and log and continue unless losing the operation is acceptable.
4. For expected failures (validation, not-found), returning a result union is often clearer than throwing. Pick one style per module.

## 5. Async/await pitfalls

| Pitfall | Fix |
|---|---|
| Floating promise: `save(x);` with no `await` | `await` it, return it, or mark intentional fire-and-forget with `void save(x).catch(log)` |
| `arr.forEach(async x => ...)` does not wait | `for (const x of arr) await f(x)` (serial) or `await Promise.all(arr.map(f))` (parallel) |
| Async callback passed where a sync one is expected (event handlers, `Array.filter`) | Wrap and handle the promise explicitly |
| Sequential awaits on independent work | `await Promise.all([...])`; use `Promise.allSettled` when one failure must not cancel the rest |
| Unbounded `Promise.all` over thousands of items | Batch, or use a concurrency limiter the project already has |
| `return promise` inside `try` without `await` | `return await promise` so the `catch`/`finally` applies |
| Shared mutable state across awaits (check-then-act) | Re-read after the await, or serialise with a lock/queue |
| No timeout on network calls | `fetch(url, { signal: AbortSignal.timeout(5000) })` |

Turn on `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises` (they need type-aware linting) to catch the first three.

## 6. ESM versus CommonJS

- `"type": "module"` in `package.json` makes `.js` files ESM; otherwise they are CJS. `.mjs`/`.mts` are always ESM, `.cjs`/`.cts` always CJS.
- With `module: NodeNext`, relative imports in ESM need the runtime extension: `import { x } from "./util.js"` even though the source is `util.ts`.
- ESM has no `require`, `__dirname` or `__filename`. Use `import.meta.url` with `fileURLToPath`, or `import.meta.dirname` / `import.meta.filename` (Node 20.11+).
- Libraries: declare entry points with `exports` (with a `types` condition first in each block). Shipping both ESM and CJS needs a build tool such as tsup; verify with `npx @arethetypeswrong/cli --pack .` before publishing.
- With `verbatimModuleSyntax`, write `import type { Foo }` for type-only imports.
- **Stop and ask** before changing `type`, `exports` or `main` on a published package: it is a breaking change for consumers.

## 7. Project layout

- Source in `src/`, build output in `dist/` (git-ignored), tests next to code (`foo.test.ts`) or in `test/`, following the project.
- Monorepos: use the package manager's workspaces (`pnpm-workspace.yaml`, `workspaces` in `package.json`) and TypeScript project references (`composite`, `references`) when packages build separately.
- Keep side effects out of module top level; export functions and wire them in an entry file.
- Read config from `process.env` once, validate it, and export a typed object.

## 8. Lint and format

- ESLint 9+ uses flat config (`eslint.config.js`/`.mjs`). Use `typescript-eslint` with `recommendedTypeChecked` (or `strictTypeChecked`) and `parserOptions.projectService: true`.
- Let Prettier (or Biome, if the project uses it) own formatting; disable stylistic lint rules that conflict (`eslint-config-prettier`).
- Do not add a new linter, formatter or major dependency without asking.

## 9. Finish

1. Run, in this order, whatever the project defines: format check, lint, type-check, tests.
2. Fix what you introduced. Report pre-existing failures instead of fixing them silently.

## Report back

End with: files changed, the commands you ran with pass/fail, any `any`/casts you could not remove and why, and anything that needs the user's decision (strictness, module system, new dependency).
