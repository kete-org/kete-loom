---
name: svelte-patterns
description: Svelte 5 runes and SvelteKit 2 guidance for $state, $derived, $effect and $props reactivity, snippets instead of slots, universal versus server load functions, form actions with use:enhance and fail(), $lib/server and $env/static/private for server-only code, and SSR traps such as shared module state leaking between users. Use when writing or migrating Svelte components to runes, adding SvelteKit routes, loads or actions, or debugging an effect loop or a value that differs between server and browser.
license: MIT
compatibility: Any Agent Skills host. Targets Svelte 5 and SvelteKit 2; Svelte 4 syntax is mentioned only for migration. Needs the project's package manager to run svelte-check and tests.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Svelte 5 and SvelteKit patterns

Write runes-based Svelte components and SvelteKit routes that load data on the right side of the network, keep secrets on the server, and render the same on server and client.

## 0. Orient first

1. Read `package.json` for `svelte` and `@sveltejs/kit` versions and the adapter. Svelte 4 projects (`export let`, `$:`, `on:click`, `<slot>`) need different syntax; do not mix styles inside one component.
2. To migrate, run `npx sv migrate svelte-5` (and `npx sv migrate app-state` for `$app/stores`), then review the diff.
3. Run `npx svelte-check` before and after your change; it type-checks `.svelte` files and catches rune misuse.

## 1. Runes

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { items, onselect, children }: { items: Item[]; onselect: (id: string) => void; children?: Snippet } = $props();
  let query = $state('');
  let filtered = $derived(items.filter((i) => i.name.includes(query)));
</script>

<input bind:value={query} />
{#each filtered as item (item.id)}
  <button onclick={() => onselect(item.id)}>{item.name}</button>
{/each}
{@render children?.()}
```

- `$state` for anything that changes. Objects and arrays become deep proxies, so `list.push(x)` works. Use `$state.raw` for large data you replace wholesale.
- `$derived(expr)` or `$derived.by(() => ...)` for computed values. Never compute derived state with `$effect` writing to another `$state`; that causes extra renders and loops.
- `$effect` only for side effects that talk to the outside (DOM APIs, timers, analytics, a non-Svelte library). Return a cleanup function for anything it starts. It does not run during SSR.
- An effect that reads and writes the same state loops forever. Read with `untrack(() => x)` (imported from `svelte`) when you must, or restructure into `$derived`.
- `$props()` replaces `export let`. Props are read-only by default; to bind two-way, mark the prop `$bindable()` and the parent uses `bind:value`.
- Destructuring a `$state` object into locals takes a snapshot; read `obj.field` where you need it to stay live. Use `$state.snapshot(obj)` when passing state to code that does not expect a proxy (`structuredClone`, external libs).
- Shared reactive state lives in `.svelte.ts` / `.svelte.js` modules. Export an object or class with `$state` fields, not a reassigned `let`, because importers cannot see a reassignment.

## 2. Components

- Events are props: `onclick={...}`, and components accept callback props (`onselect`) instead of `createEventDispatcher`.
- Use snippets (`{#snippet row(item)}...{/snippet}` and `{@render row(item)}`) instead of slots in new code. `children` is the default snippet.
- Key every `{#each}` that can reorder: `{#each items as item (item.id)}`.
- `{@html}` with user content is XSS. Sanitise first or render as text.

## 3. SvelteKit load functions

| File | Runs | Use for |
|---|---|---|
| `+page.ts` / `+layout.ts` | server on first load, then browser | public APIs, data safe to fetch from the browser |
| `+page.server.ts` / `+layout.server.ts` | server only | database, secrets, private APIs, cookies |

1. Use the `fetch` passed to `load`, not the global one: it forwards cookies, works with relative URLs on the server, and inlines the response so the browser does not refetch.
2. Return plain serialisable data from server loads (Svelte's `devalue` handles Date, Map, Set; not class instances or functions).
3. Start independent requests in parallel; do not `await` them one after another. Avoid waterfalls caused by `await parent()` before your own fetches.
4. Throw expected failures with `error(404, 'Not found')` and send users elsewhere with `redirect(303, '/login')` from `@sveltejs/kit`. In SvelteKit 2 these throw for you; do not wrap them in a `try` that swallows them.
5. Read the result in the page with `let { data } = $props();`.
6. Re-run loads with `invalidate(url)` / `invalidateAll()`; declare custom dependencies with `depends('app:cart')`.
7. Read page and navigation state from `$app/state` (`page.url`, `page.params`, `navigating`), not the deprecated `$app/stores`.

## 4. Form actions

```ts
// +page.server.ts
export const actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '');
    if (!email.includes('@')) return fail(400, { email, missing: true });
    await locals.db.subscribe(email);
    redirect(303, '/thanks');
  },
};
```

- Validate every field on the server, return `fail(status, data)` with the values to refill the form, and read them in the page through `let { form } = $props();`.
- Add `use:enhance` from `$app/forms` for progressive enhancement; the form must still work without JavaScript.
- Check authorization in the action itself (`locals.user`), not only in the page load.
- Use named actions (`?/delete`) when one page has several forms.

## 5. Server-only code and secrets

- Put server modules under `src/lib/server/` or name them `*.server.ts`. SvelteKit refuses to bundle them into client code, which turns a leak into a build error.
- Secrets come from `$env/static/private` (build-time) or `$env/dynamic/private` (runtime). Only `PUBLIC_`-prefixed values belong in `$env/static/public` / `$env/dynamic/public`.
- Put request-scoped data (current user, db handle) on `event.locals` in `hooks.server.ts`, and type it in `src/app.d.ts`.

## 6. SSR pitfalls

1. **Module-level state is shared by every user on the server.** A `let user = $state(null)` in a module, or a writable store, set during a request leaks to the next visitor. Keep per-request data in `locals` and load data, or create state in a component and share it with `setContext`/`getContext`.
2. Do not touch `window`, `document` or `localStorage` during render. Use `$effect` or `onMount`, or guard with `browser` from `$app/environment`.
3. Values that differ by environment (time, random ids, locale) cause hydration mismatches; compute them on the server and pass them through load data.
4. Turn off SSR per route with `export const ssr = false` only for genuinely browser-only pages; set `export const prerender = true` for static pages.

## 7. Tests

- Unit-test logic in `.svelte.ts` and server modules with Vitest. Test components with `@testing-library/svelte` (`render`, `screen`, user-event) and assert on visible output.
- Test actions and loads by calling the exported functions with a minimal event object, or end to end with Playwright against `vite preview`.

## Stop and ask the user

- Migrating a large Svelte 4 codebase to runes in one go.
- Changing the adapter, or the `ssr`/`prerender` setting of a production route.
- A secret is in a public env var or a client-reachable module.

## Never

- Never import from `$lib/server` or `$env/*/private` in a `+page.ts`, `+layout.ts` or component.
- Never derive state with `$effect`; use `$derived`.
- Never keep per-user data in module-level state.

## Report back

List the files changed, which side (server, universal, client) each new load or action runs on, the `svelte-check` and test results, and anything not checked in a browser.
