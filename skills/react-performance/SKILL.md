---
name: react-performance
description: Measure-first workflow for slow React UIs - profile renders with React DevTools and the Profiler API, cut wasted re-renders with memo, useMemo and useCallback only where the profile shows a win (or let React Compiler do it), virtualise long lists, split code with lazy and Suspense, remove request waterfalls, and shrink the JavaScript bundle. Use when a React or Next.js screen feels laggy, typing or scrolling stutters, a component re-renders too often, Interaction to Next Paint is poor, or the client bundle has grown too big.
license: MIT
compatibility: Any Agent Skills host. Applies to React 18 and 19 in any framework. Needs Node.js, the project's package manager and a browser with React DevTools for profiling.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# React performance

No optimisation without a measurement before and after. Most React slowness comes from a few causes: rendering too much, rendering too often, loading too much JavaScript, or waiting on requests one after another. Component design rules live in `react-patterns`; Next.js caching and server/client splits in `nextjs-patterns`; Core Web Vitals and non-React page speed in `web-performance`.

## 1. Define the problem

1. Get a concrete symptom from the user: which screen, which interaction (typing, scrolling, opening a panel, first load), on what device. If it's vague, ask.
2. Classify it:
   - **Interaction is slow** (input lag, janky scroll): render cost. Go to 2.
   - **First load is slow** (blank screen, late content): bundle or waterfalls. Go to 5 and 6.
3. Measure in a production build (`npm run build` then the project's preview/start command). Development mode and StrictMode double-render and are several times slower; never judge speed there.

## 2. Measure renders

1. React DevTools → Profiler: record the slow interaction, then read the flame graph and ranked chart. Note the slowest commits, which components rendered, and "Why did this render?" (enable "Record why each component rendered while profiling" in settings).
2. Turn on "Highlight updates when components render" to see what re-renders while you interact.
3. Use the browser Performance panel with CPU throttling (4x or 6x) for long tasks over 50 ms and layout/paint cost that DevTools won't show.
4. For numbers you can compare in code or CI, wrap the subtree in `<Profiler id="Grid" onRender={(id, phase, actualDuration, baseDuration) => ...}>`. `actualDuration` is time spent rendering this commit; `baseDuration` estimates a full re-render without memoisation. Profiling a production build needs the profiling build of `react-dom` (see the React docs for your bundler); `<Profiler>` adds overhead, so remove it or gate it after measuring.
5. Write down the baseline: commit duration and count for the interaction, or long-task total. You'll compare against it.

## 3. Fix rendering cost, cheapest first

Work down this list and re-measure after each change:

1. **Move state down.** If typing in one input re-renders the whole page, the state is too high. Move it into the component that uses it.
2. **Lift content up (children as props).** A parent with fast-changing state that renders `{children}` doesn't re-render those children.
3. **Split contexts.** One context with a frequently changing value re-renders every consumer. Split by update rate, or move fast state to a store with selectors.
4. **Stop recreating expensive work.** `useMemo` for a computation the profile shows is slow (rule of thumb: over ~1 ms per render) or for an object/array passed to a memoised child or an effect dependency.
5. **Skip unchanged subtrees.** `React.memo(Component)` on a component that renders often with the same props and is costly to render. It only helps if every prop is stable: wrap callbacks in `useCallback`, objects in `useMemo`, or pass primitives.
6. **Defer non-urgent updates.** `useDeferredValue(query)` for a slow results list behind a fast input; `startTransition(() => setFilter(x))` for updates that can be interrupted.
7. **Virtualise long lists** (section 4).

Memoisation rules:
- Don't wrap everything. `memo`/`useMemo`/`useCallback` cost memory and comparisons; unprofiled memoisation is noise.
- A memoised child receiving `onClick={() => ...}` or `style={{...}}` inline never skips; fix the prop, not the child.
- Keys: stable ids, never `Math.random()` or array index for lists that change. A changing key remounts the subtree, which is far slower than a re-render.
- If the project has React Compiler enabled (`babel-plugin-react-compiler`, or `reactCompiler: true` in Next.js 16, `experimental.reactCompiler` in 15), it memoises automatically. Don't add manual `useMemo`/`useCallback` to compiled code unless a profile shows it's still needed; do keep components pure so the compiler doesn't skip them (the `react-hooks` lint compiler rules report why).
- Don't enable the compiler as a side effect of a perf fix; ask first.

## 4. Long lists and big tables

- Over a few hundred rows, or rows that are expensive, render only what's visible. Use the library already in the project; otherwise `@tanstack/react-virtual` or `react-window`.
- Give rows a fixed or measured height; variable heights need the library's measurement API.
- Keep row components memoised with stable props, and keep scroll position, focus and keyboard navigation working. Check that Ctrl+F and screen readers are acceptable for the use case, or paginate instead.
- For simple long pages, CSS `content-visibility: auto` with `contain-intrinsic-size` can be enough without a library.

## 5. Waterfalls

A waterfall is request B starting only after request A finishes when it didn't need A.

1. Open the Network panel (throttled to "Fast 4G") and look for staircase-shaped requests.
2. Common causes and fixes:
   - Parent fetches, renders child, child fetches: hoist both fetches to the route loader or Server Component and start them together (`Promise.all`), or prefetch.
   - Sequential `await`s in one function for independent data: start promises first, await later.
   - `React.lazy` component that then fetches its data: start the data request in parallel with loading the code (route loader, prefetch on hover/intent).
   - A `<Suspense>` boundary around each sibling that each suspends in turn: put siblings that load together under one boundary, separate ones under their own.
3. In Next.js, fetch on the server and stream with `<Suspense>`; see `nextjs-patterns`.

## 6. Bundle size and code splitting

1. Measure what ships:
   - Vite/Rollup: `rollup-plugin-visualizer`.
   - webpack: `webpack-bundle-analyzer`.
   - Next.js with Turbopack (16.1+): `npx next analyze` (`--output` writes to `.next/diagnostics/analyze` for before/after diffs). Next.js on webpack: `@next/bundle-analyzer` wrapped in `next.config` with `enabled: process.env.ANALYZE === "true"`, then `ANALYZE=true npm run build`.
   - Any build with source maps: `source-map-explorer`.
2. Look for: a large dependency used for one function (date, lodash, icon or chart libraries), duplicates of the same package at two versions, server-only or test code in the client bundle, and polyfills you don't need.
3. Fix, in order: import only what you use (`import debounce from "lodash/debounce"`, per-icon imports); replace heavy libraries with platform APIs (`Intl.DateTimeFormat`, `structuredClone`) or lighter ones (ask before swapping); dedupe versions.
4. Split by route first, then by heavy, rarely used components (editors, charts, maps, modals): `const Chart = lazy(() => import("./Chart"))` inside `<Suspense fallback>`; in Next.js use `next/dynamic` or keep the component on the server.
5. Don't split tiny components; each chunk costs a request.
6. Re-run the analyser and record the size change (gzip/brotli).

## Never

- Never claim a speed-up without before/after numbers from the same build type and device profile.
- Never measure in development mode.
- Never suppress `exhaustive-deps` to "stop an effect re-running"; fix the unstable dependency.
- Never add a virtualisation, state or memo library when moving state or fixing a prop solves it.

## Stop and ask the user

- When the symptom or target (for example "INP under 200 ms on a mid-range Android") isn't stated.
- Before replacing a dependency, enabling React Compiler, or changing list UX (virtualising, paginating).
- When the fix needs a design change (removing a feature from a screen, changing data shape on the API).

## Report back

```
Symptom: <screen + interaction>
Baseline: <metric, build type, device/throttle>
Cause: <what the profile showed>
Change: <files and what changed>
After: <same metric, same conditions>
Not checked: <e.g. low-end mobile, Safari>
```
