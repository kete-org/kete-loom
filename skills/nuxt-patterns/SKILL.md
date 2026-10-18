---
name: nuxt-patterns
description: Nuxt 3 and 4 full-stack app guidance for choosing SSR, SPA, prerender or hybrid route rules, fetching data once with useFetch and useAsyncData instead of double-fetching with $fetch, writing Nitro server routes, wiring runtimeConfig secrets, setting SEO metadata, and tracking down hydration mismatches. Use when working in a Nuxt project on pages, server/api endpoints, nuxt.config, data loading, meta tags, or a server-versus-client rendering bug.
license: MIT
compatibility: Any Agent Skills host. Targets Nuxt 3.x and 4.x; Nuxt 4 differences are called out. Needs the project's package manager to run the dev server or build.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Nuxt patterns

Build Nuxt pages that render the same on server and client, fetch each piece of data once, and keep secrets on the server. For plain Vue component reactivity, props and Pinia, also follow `vue-patterns`.

## 0. Orient first

1. Read `package.json` for the Nuxt major version and modules (`@pinia/nuxt`, `@nuxtjs/i18n`, `@nuxt/content`, `@nuxt/image`).
2. Check the layout. Nuxt 4 uses `app/` as `srcDir` (so `~/components` is `app/components`), keeps `server/`, `public/` and `shared/` at the root. A Nuxt 4 project may keep the old layout with `srcDir: '.'`. Follow what is there.
3. Read `nuxt.config.ts` for `ssr`, `routeRules`, `runtimeConfig`, `nitro.preset` and `app.head`.

## 1. Pick a rendering mode per route

| Need | Setting |
|---|---|
| Personalised or SEO-critical dynamic page | default SSR |
| Marketing page, docs, blog post | `routeRules: { '/blog/**': { prerender: true } }` |
| Mostly static but changes hourly | `{ swr: 3600 }` or `{ isr: 3600 }` on hosts that support ISR |
| Dashboard behind login, no SEO | `{ ssr: false }` for that route |
| Whole app is a client-only SPA | `ssr: false` at the top level |

Prefer per-route `routeRules` over flipping the global `ssr` flag. Confirm the deploy target supports the rule (`isr` is host-specific).

## 2. Fetch data once

1. In page or component setup, use `useFetch('/api/x')` for a URL, or `useAsyncData('key', () => fn())` for any async function. Both run on the server, serialise the result into the payload, and reuse it on hydration.
2. Never call bare `$fetch` at the top of setup in an SSR page: it runs on the server and again on the client. Use `$fetch` only in event handlers, actions, server routes, or inside `useAsyncData`.
3. Give `useAsyncData` a stable, unique key. Calls sharing a key share state; in Nuxt 4 they must not pass conflicting `transform`, `pick`, `default` or `getCachedData` options.
4. Make reactive inputs explicit: `useFetch('/api/items', { query: { page } })` with `page` a ref refetches automatically; for `useAsyncData` pass `watch: [page]`.
5. Handle all states in the template with `status` (`'idle' | 'pending' | 'success' | 'error'`) and `error`, not only `data`.
6. Nuxt 4 changes: `data` and `error` default to `undefined` (Nuxt 3: `null`), and `data` is a `shallowRef`, so mutating a nested field does not re-render. Replace the object, or pass `deep: true`.
7. Use `lazy: true` (or `useLazyFetch`) when the page should render before the data arrives, and show a pending state.
8. Use `server: false` only for data that must never be fetched on the server (browser-only APIs, per-user data on a cached page).
9. During SSR, `useFetch` with a relative URL to your own API forwards the incoming request's cookies and headers (except hop-by-hop ones such as `host`). A bare `$fetch` in a composable does not; use `useRequestFetch()` when you need the incoming request's headers.
10. For one-time app init (load the current user), use `callOnce` or a plugin, not a `useFetch` in `app.vue` that runs on every navigation.

## 3. Server routes (Nitro)

- Files in `server/api/` map to `/api/...`; method suffixes (`users.post.ts`) restrict the verb. `server/routes/` maps without the `/api` prefix. `server/middleware/` runs on every request, so keep it cheap.
- Use `defineEventHandler`, read input with `getQuery`, `readBody`, `getRouterParam`, and validate it (for example `readValidatedBody(event, schema.parse)`) before use.
- Throw `createError({ statusCode: 404, statusMessage: 'Not found' })` instead of returning error objects with a 200.
- Check authentication and authorization in every handler that touches private data. A route in `server/api` is public unless you guard it.
- Put code shared by server and client in `shared/` (Nuxt 4) and never import server-only modules from `app/`.

## 4. Runtime config and secrets

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: '',                 // server only, override with NUXT_API_SECRET
    public: { apiBase: '/api' },   // shipped to the browser, override with NUXT_PUBLIC_API_BASE
  },
})
```

- Read with `useRuntimeConfig()` (in server handlers, `useRuntimeConfig(event)`).
- Anything under `public` is visible to every visitor. Secrets go at the top level only.
- Set values in production through `NUXT_`-prefixed environment variables; `process.env` reads in `nuxt.config` are baked in at build time.

## 5. SEO and head

- Use `useSeoMeta({ title, description, ogTitle, ogImage })` per page, and `useHead` for links, scripts and `htmlAttrs: { lang }`.
- Set defaults in `app.head` in `nuxt.config.ts`; let pages override.
- Generate canonical URLs and `og:url` from a configured site URL, not from `window.location`.
- SEO tags only reach crawlers on SSR or prerendered routes; do not rely on them for `ssr: false` routes.

## 6. Hydration mismatches

When the console shows "Hydration mismatch" or "Hydration completed but contains mismatches":

1. Reproduce with a production build (`nuxt build` then `nuxt preview`) and read the warning for the node that differs.
2. Look for values that differ between server and client: `Date.now()`, `new Date().toLocaleString()`, `Math.random()`, time zones, `window`/`localStorage` reads during render, and user-agent checks.
3. Fix by computing the value once on the server and passing it through `useState` or fetched data, by moving browser-only reads into `onMounted`, or by wrapping the subtree in `<ClientOnly>` with a fallback.
4. Guard browser-only code with `import.meta.client` (or `.server`), not `process.client`.
5. Check for invalid HTML nesting (a `<div>` inside a `<p>`, nested `<a>`, a `<tr>` without `<tbody>`); browsers rewrite it and the DOM no longer matches.
6. For cross-request state, use `useState('key', () => init)` instead of a module-level `ref`, which leaks between users on the server.

## Stop and ask the user

- Changing the rendering mode or `nitro.preset` of a route already in production.
- A secret is currently under `runtimeConfig.public` or committed in `nuxt.config`: flag it and ask before rotating anything.
- The fix needs a Nuxt major upgrade.

## Never

- Never put API keys in `runtimeConfig.public` or client code.
- Never hide a hydration warning with `<ClientOnly>` around a whole page without finding the cause.
- Never leave a `server/api` handler without input validation or an auth check when it touches user data.

## Report back

State the files changed, the rendering mode of each touched route, how data is fetched there, the command you ran (`nuxt build`, tests, typecheck) and its result, and anything not checked in a production build.
