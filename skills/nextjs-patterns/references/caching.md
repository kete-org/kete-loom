# Next.js caching: the two models

Pick the model from `next.config.*`. If `cacheComponents: true` is set (Next.js 16+), use model B. Otherwise use model A. Write new code in the app's model; under model B, existing `fetch` cache options and `unstable_cache` keep working and can be migrated later, but segment config does not.

Always check behaviour with `next build && next start`; `next dev` renders every request fresh.

## Model A: previous model (no `cacheComponents`)

Defaults (Next.js 15+):
- `fetch` is **not** cached unless you opt in.
- `GET` Route Handlers are not cached unless you opt in.
- A route is still prerendered at build time if it uses no request-time API (`cookies()`, `headers()`, `searchParams`, uncached data after those). Fetches reached before any request-time API run once at build.

Opt in per request:

```ts
await fetch(url, { cache: "force-cache" });                 // cache indefinitely
await fetch(url, { next: { revalidate: 3600 } });           // time-based
await fetch(url, { next: { tags: ["posts"] } });            // tag for on-demand invalidation
await fetch(url, { cache: "no-store" });                     // always fresh
```

Non-`fetch` sources (ORM, SDK):

```ts
import { unstable_cache } from "next/cache";
export const getUser = unstable_cache(
  async (id: string) => db.user.findUnique({ where: { id } }),
  ["user"],                       // key prefix; args are added to the key
  { tags: ["user"], revalidate: 3600 },
);
```

Route segment config (export from `page`, `layout` or `route`):

| Export | Values | Use |
|---|---|---|
| `dynamic` | `'auto'` (default), `'force-dynamic'`, `'error'`, `'force-static'` | Force the whole segment static or dynamic |
| `revalidate` | `false` (default), `0`, seconds | Default revalidation for the segment; must be a literal (`600`, not `60 * 10`) |
| `fetchCache` | `'auto'`, `'default-cache'`, `'only-cache'`, `'force-cache'`, `'default-no-store'`, `'only-no-store'`, `'force-no-store'` | Advanced override; avoid unless needed |

The lowest `revalidate` among a route's layouts, pages and fetches wins for the whole route.

## Model B: Cache Components (`cacheComponents: true`, Next.js 16+)

Nothing is cached unless marked. Uncached async work must sit inside `<Suspense>`, or the dev overlay and build report a blocking route.

```ts
import { cacheLife, cacheTag } from "next/cache";

export async function getPosts() {
  "use cache";
  cacheLife("hours");          // always pair a directive with a lifetime
  cacheTag("posts");
  return db.post.findMany();
}
```

- `"use cache"` at the top of a function or component caches its return value; at the top of a file it caches every export.
- Arguments and closed-over values become part of the cache key. They must be serialisable.
- Don't read `cookies()`/`headers()`/`searchParams` inside a `"use cache"` scope. Read them outside and pass the value in as an argument, or use `"use cache: private"`.
- `"use cache: remote"` stores entries in a shared cache handler (durable across instances); the default store is in-memory per instance.
- `Math.random()`, `Date.now()`, `crypto.randomUUID()` during render must be either inside `"use cache"` (same value for everyone) or after `await connection()` inside `<Suspense>` (per request).
- Push `await params`/`await cookies()` down into the component that needs it, inside `<Suspense>`, so the rest of the layout stays in the static shell.
- Segment config `dynamic`, `revalidate`, `fetchCache`, `dynamicParams` and `runtime` error in this model. Replace them with `"use cache"` + `cacheLife`, or plain uncached code for always-fresh data.
- `generateStaticParams` must return at least one param; an empty array errors.
- `"use cache"` entries are in-memory by default and scoped to one deployment, unlike the old `fetch` Data Cache. Use `"use cache: remote"` or a cache handler when entries must survive instance teardown.
- Route state is preserved across navigations (React `<Activity>`), so `useState` and form values no longer reset when the user navigates away and back.

## On-demand invalidation (both models)

| API | Where | Effect |
|---|---|---|
| `revalidatePath(path)` | Server Action, Route Handler | Invalidate everything cached for a path |
| `revalidateTag(tag, profile)` | Server Action, Route Handler | Mark tagged entries stale; next visitor gets stale data while it refreshes. Next.js 16 requires the second argument, for example `'max'`. On 15 it takes only the tag |
| `updateTag(tag)` | Server Action only (16, either model) | Expire and refresh within the same request so the user sees their own write |
| `refresh()` | Server Action only (16) | Refresh the client router without touching tags |

Pick `updateTag` for forms and settings the user just edited, `revalidateTag` for content where a short delay is fine (catalogue, blog).

## Debugging stale data

1. Reproduce with `next build && next start`, not `next dev`.
2. Find every cache layer between source and screen: the data cache entry, the route's prerendered output, the client router cache, a CDN in front.
3. Check whether the data was read before a request-time API (model A: cached at build) or inside a `"use cache"` scope (model B).
4. Check that the mutation calls the invalidation with the exact tag or path used when caching.
5. Self-hosted with several instances: without a shared cache handler, each instance has its own cache and invalidation reaches only one.
