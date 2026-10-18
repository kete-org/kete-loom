---
name: vite-patterns
description: Configuring and debugging Vite builds and dev servers, covering vite.config with defineConfig and loadEnv, VITE_ env variables and modes, path aliases, plugin ordering and writing small plugins, library mode with package exports, SSR entry builds, base path and build output, and fixing breakage when moving from webpack or Create React App or across Vite majors (Rollup to Rolldown). Use when editing vite.config, env variables are undefined in the browser, an alias or import fails only in build, publishing a library with Vite, or upgrading Vite.
license: MIT
compatibility: Any Agent Skills host. Needs Node.js and the project's package manager. Option names changed between Vite majors; check the installed version (npx vite --version) and vite.dev/guide/migration.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# Vite patterns

Vite serves source over native ESM in dev and bundles for production. Most bugs come from the gap between those two modes, from env variables, or from options renamed between majors.

## First, look at the project

1. Read `package.json` for the `vite` major and framework plugin (`@vitejs/plugin-react`, `@vitejs/plugin-vue`, `@sveltejs/vite-plugin-svelte`), and whether a meta-framework (Nuxt, SvelteKit, Astro, Remix/React Router) owns the config.
2. Read `vite.config.*` and `tsconfig.json`.
3. If a meta-framework wraps Vite, change Vite settings through that framework's config key (for example `vite:` in `nuxt.config`), not a separate `vite.config`.

**Version matters.** Vite 8 builds with Rolldown and transforms with Oxc: `build.rollupOptions` became `build.rolldownOptions`, top-level `esbuild` options became `oxc`, and `optimizeDeps.esbuildOptions` became `optimizeDeps.rolldownOptions`. The old names are deprecated but still accepted. Use the names that match the installed major.

## Config

```ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // '' = load all vars, for config use only
  return {
    plugins: [react()],
    server: { port: 5173, proxy: { '/api': { target: env.API_URL, changeOrigin: true } } },
    build: { sourcemap: mode !== 'production' ? true : 'hidden' },
  };
});
```

- `import.meta.env` is **not** available inside `vite.config`; env files load after the config runs. Use `loadEnv(mode, root, prefixes)` there.
- Use `server.proxy` in dev to avoid CORS instead of adding CORS headers to the backend for localhost.

## Env variables and modes

- Only variables starting with `VITE_` (or a custom `envPrefix`) reach client code, through `import.meta.env.VITE_*`. All values are strings.
- Files: `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`; mode-specific files win, and variables already set in the shell win over all files. Restart the dev server after editing them.
- Built-ins: `import.meta.env.MODE`, `BASE_URL`, `PROD`, `DEV`, `SSR`.
- `mode` and `NODE_ENV` are different: `vite build --mode staging` still builds with `NODE_ENV=production` and loads `.env.staging`.
- **Everything with the client prefix is embedded in the shipped JS.** Never put secrets in `VITE_*`. Keep `*.local` in `.gitignore`.
- Type them in `src/vite-env.d.ts` with an `interface ImportMetaEnv { readonly VITE_API_URL: string }`.
- `process.env.X` in client code is not replaced; use `import.meta.env` or `define`.
- Bun auto-loads `.env` into `process.env`, which can mask Vite's own loading; run Vite under Node or disable Bun's env loading.

## Aliases

- Declare once and keep TypeScript in sync. Either set `resolve.alias` (`{ '@': fileURLToPath(new URL('./src', import.meta.url)) }`) and mirror it in `tsconfig` `paths`, or on Vite 8 enable `resolve.tsconfigPaths` to read `paths` from `tsconfig` directly (the `vite-tsconfig-paths` plugin on older majors).
- Tests (Vitest) reuse `vite.config`, so aliases defined there work in tests too.

## Plugins

- Order: framework plugin first, then others. A plugin can set `enforce: 'pre' | 'post'` and `apply: 'serve' | 'build'`.
- A small project plugin is an object with `name` plus hooks (`config`, `configResolved`, `resolveId`, `load`, `transform`, `configureServer`, `transformIndexHtml`). Return `null` from `resolveId`/`load`/`transform` for ids you do not handle.
- Prefer an existing official or widely used plugin over a custom one. Check that a plugin supports the installed Vite major before adding it.

## Library mode

```ts
build: {
  lib: { entry: 'src/index.ts', name: 'MyLib', fileName: 'my-lib', formats: ['es', 'cjs'] },
  rolldownOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] }, // rollupOptions before Vite 8
}
```

- Externalise every `peerDependency` and usually every `dependency`; bundling React into a component library breaks hooks.
- `package.json`: `"type": "module"`, `"files": ["dist"]`, and an `exports` map with `types`, `import` and `require` conditions pointing at real files. Add `"./style.css"` if CSS is emitted.
- Vite does not emit `.d.ts`: run `tsc --emitDeclarationOnly` or a declarations plugin.
- Verify with `npm pack --dry-run` and by importing the packed tarball in a scratch project.

## SSR

- Prefer a framework (Nuxt, SvelteKit, Astro, React Router) over hand-rolled SSR. For a custom server: create Vite in middleware mode (`createServer({ server: { middlewareMode: true }, appType: 'custom' })`), mount `vite.middlewares`, and load the entry with `vite.ssrLoadModule('/src/entry-server.ts')` in dev.
- Production: build twice, the client (`vite build --outDir dist/client`) and the server entry (`vite build --ssr src/entry-server.ts --outDir dist/server`).
- Dependencies that ship untranspiled code or CSS imports may need `ssr.noExternal: ['pkg']`.
- Guard browser globals (`window`, `document`) behind `import.meta.env.SSR` or lifecycle hooks.

## Build output

- `base`: set it when the app is served from a sub-path (`base: '/app/'`), and use `import.meta.env.BASE_URL` when building URLs at runtime.
- Files in `public/` are copied as-is and referenced by absolute path; imported assets get hashed names. Do not import from `public/`.
- `build.target` defaults to a Baseline-widely-available browser set; Vite adds no polyfills. Use `@vitejs/plugin-legacy` only if old browsers are a real requirement.
- Check bundle size with `vite build` output, and split heavy routes with dynamic `import()`. On Vite 8 the object form of `manualChunks` is no longer supported and the function form is deprecated; use Rolldown's `codeSplitting` option instead.
- `vite preview` serves `dist` locally to test the production build; it is not a production server.

## Common migration issues

| Symptom | Fix |
|---|---|
| `process is not defined` after leaving webpack/CRA | Replace `process.env.REACT_APP_*` with `import.meta.env.VITE_*`; `define` only for third-party code |
| `require is not defined` | Convert to `import`; Vite source is ESM |
| `index.html` not found / blank page | `index.html` lives at the project root with `<script type="module" src="/src/main.tsx">` |
| JSX in `.js` files fails | Rename to `.jsx`/`.tsx` |
| Works in dev, broken in build | Case-sensitive import paths, CJS default-import interop, or a dynamic import with a variable path; run `vite build && vite preview` to reproduce |
| Default import from a CJS package changed after a Vite major | Fix the import; `legacy.inconsistentCjsInterop` only as a temporary bridge |
| Dependency pre-bundling stale | Delete `node_modules/.vite` or run with `--force` |

## Never

- Put secrets in `VITE_*` variables or `define`.
- Bundle peer dependencies into a library build.
- Copy a config snippet written for a different Vite major without checking option names.
- Serve production traffic with `vite` or `vite preview`.

## Before you finish

Run `vite build` (and `vite preview` for app changes) plus the project's type-check and tests. Report the config keys changed, any new plugin, env variables the user must set, and the build result.
