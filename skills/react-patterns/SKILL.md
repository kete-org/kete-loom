---
name: react-patterns
description: React component design rules for function components and hooks, covering where state should live, the Rules of Hooks, effects used only to synchronise with external systems, data fetching without race conditions, controlled and uncontrolled forms with React 19 actions, error boundaries, choosing context versus a state library, and accessible markup. Use when building or restructuring React components, deciding where a piece of state belongs, writing or removing a useEffect, wiring up a form, or picking between context, Zustand, Redux or a query cache.
license: MIT
compatibility: Any Agent Skills host. Applies to React 18 and 19 with any bundler or framework (Vite, Next.js, Remix, React Router). Needs Node.js and the project's package manager to run lint and tests.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# React patterns

Write components that are pure during render, keep state as small and as local as possible, and treat effects as an escape hatch. For Next.js server/client concerns use the `nextjs-patterns` skill; for render speed use `react-performance`.

## 0. Before you change anything

1. Check the React version in `package.json` (`react`, `react-dom`). React 19 APIs (`useActionState`, `useOptimistic`, `use`, form `action` props, `ref` as a prop) don't exist in 18.
2. Check what the project already uses for server state (TanStack Query, SWR, RTK Query, Apollo, framework loaders) and client state (context, Zustand, Redux, Jotai). Follow it. Don't add a second library for the same job.
3. Check lint config for `eslint-plugin-react-hooks` (`rules-of-hooks`, `exhaustive-deps`). If it's missing, tell the user; don't silently add it.

## 1. Where state lives

Decide in this order and stop at the first that fits:

1. **Derive it.** If a value can be computed from props or other state, compute it during render. Never mirror props into state (`useState(props.x)` plus an effect to sync it).
2. **Local `useState`/`useReducer`** in the lowest component that needs it. Use `useReducer` when several fields change together or the next state depends on an action type.
3. **Lift** to the closest common parent when two siblings need it.
4. **URL** (search params, path) for anything that should survive reload or be shareable: filters, tabs, pagination, selected item.
5. **Server-state cache** (the project's query library or framework loader) for data owned by the backend. Never copy fetched data into a global store by hand.
6. **Context** for values many distant components read and that change rarely: theme, locale, current user, a feature-flag client.
7. **A state library** only when client state is large, updated from many places, and context would re-render too much.

Rules:
- Store the minimum: an `id`, not a copy of the selected object.
- Reset state with a `key` (`<Profile key={userId} />`), not with an effect.
- Put the state setter and value in separate contexts if consumers only need one, or memoise the context value object.

## 2. Rules of Hooks

- Call hooks only at the top level of a component or a custom hook. No hooks inside conditions, loops, nested functions, `try` blocks or after an early `return`.
- Custom hooks start with `use` and may call other hooks. A function that calls no hooks is not a hook; don't prefix it.
- Never call a component as a function (`Row()`); render it (`<Row />`).
- Never define a component inside another component's body. It remounts every render and loses state.
- Render must be pure: no mutation of props, state or module variables, no `Math.random()`/`Date.now()` driving output without a stable source, no reading or writing `ref.current` during render (except lazy init).

## 3. Effects: synchronisation only

An effect is for keeping React in sync with something outside React: a subscription, a browser API, a non-React widget, a websocket. Before writing `useEffect`, check whether you need it:

| You want to... | Do this instead |
|---|---|
| Compute a value from props/state | Compute during render (memoise only if measured slow) |
| Respond to a click or submit | Put the logic in the event handler |
| Reset state when a prop changes | Change the `key` |
| Adjust part of state when a prop changes | Derive it, or store the previous prop and compare during render |
| Notify a parent of a change | Call the parent's callback in the same handler that changed state |
| Fetch data | Use the project's data library or framework loader (section 4) |

When you do write one:
1. List every reactive value it reads in the dependency array. Never suppress `exhaustive-deps`; restructure instead (move the function inside the effect, use an updater `setX(x => x + 1)`, or move non-reactive logic to `useEffectEvent` on React 19.2+).
2. Return a cleanup that undoes the setup: unsubscribe, `clearInterval`, `controller.abort()`, `disconnect()`.
3. Expect it to run twice in development under `<StrictMode>`. If that breaks something, the cleanup is wrong; don't remove StrictMode.
4. Don't call `setState` synchronously in the effect body just to derive state; that is section 1, rule 1.

## 4. Data fetching

Prefer, in order: the framework's loader or a Server Component (Next.js, Remix, React Router), then the project's query library, then a hand-rolled effect.

If you must fetch in an effect, guard against races and unmounts:

```tsx
useEffect(() => {
  const controller = new AbortController();
  setStatus("loading");
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => { setUser(data); setStatus("done"); })
    .catch((e) => { if (e.name !== "AbortError") { setError(e); setStatus("error"); } });
  return () => controller.abort();
}, [id]);
```

- Model loading, error and empty states explicitly; never render `data.items.map` before data exists.
- Start independent requests in parallel (`Promise.all`, or sibling components each with their own query), not one after another.
- With `use(promise)` on React 19, create the promise outside render (in a loader, a Server Component or a cache) and wrap the reader in `<Suspense>`. A promise created during render is recreated every render.

## 5. Forms

- **Uncontrolled + `FormData`** is the default for submit-only forms: `<form action={fn}>` on React 19, or `onSubmit` with `new FormData(e.currentTarget)` on 18.
- **Controlled inputs** (`value` + `onChange`) only when you need the value on every keystroke: live validation, formatting, dependent fields.
- Never switch an input between controlled and uncontrolled; initialise with `""`, not `undefined`.
- React 19: `useActionState(action, initialState)` returns `[state, formAction, isPending]` for results and errors; `useFormStatus()` (from `react-dom`) reads pending state inside a child of the `<form>`; `useOptimistic` shows the expected result while the action runs.
- For large forms the project may use React Hook Form or similar; follow it.
- Validate on the server too. Client validation is UX, not security.
- Every input has a `<label htmlFor>` (or wraps the input); errors are linked with `aria-describedby` and announced (`role="alert"` or `aria-live="polite"`).
- Disable the submit button while pending, and keep it focusable.

## 6. Error boundaries

- Error boundaries catch errors thrown during render, in lifecycle methods and in constructors below them. They do **not** catch errors in event handlers, async code (timers, promises after an `await`), or the boundary itself.
- There is no hook equivalent: write a class with `static getDerivedStateFromError` and `componentDidCatch`, or use the project's `react-error-boundary` if it's installed. Frameworks may provide their own (`error.tsx` in Next.js).
- Place boundaries around independent regions (a widget, a route segment), not just once at the root. Give each a fallback with a retry that resets it (`resetKeys` or a changed `key`).
- Handle event-handler and async errors with `try/catch` and state; to route them into a boundary, set state and rethrow during render.
- Report the error in `componentDidCatch` (or the root's `onCaughtError`/`onUncaughtError` on React 19) to the project's logger.

## 7. Context vs state libraries

- Context is a dependency-injection mechanism, not a store: every consumer re-renders when the value identity changes.
- Split contexts by update frequency. Never put fast-changing values (mouse position, form text) in a widely consumed context.
- Server data belongs in a query cache, not context or Redux.
- Pick a store (Zustand, Redux Toolkit, Jotai) only for shared, frequently updated client state, and use selectors so components subscribe to slices.

## 8. Accessibility basics

- Use the right element: `<button>` for actions, `<a href>` for navigation, `<label>` for inputs, headings in order. A `<div onClick>` is not a button.
- Every image has `alt` (`alt=""` if decorative). Icon-only buttons have `aria-label`.
- Keyboard: everything clickable is reachable with Tab and works with Enter/Space; focus is visible; dialogs trap focus and return it on close (prefer `<dialog>` or the project's headless UI library).
- After route changes or async updates, move focus or announce the change.
- Lists use stable, unique `key`s from the data (an id), never the array index when items can be reordered, inserted or removed.
- For full audits use the `web-accessibility` skill.

## Never

- Never mutate state or props in place (`arr.push`, `obj.x = 1`); create new values.
- Never suppress `react-hooks` lint rules to make a warning go away.
- Never put secrets or tokens in client code or `localStorage` because "it's only the frontend".
- Never use `dangerouslySetInnerHTML` with unsanitised input.

## Stop and ask the user

- Before adding a new state, data or form library.
- Before converting many components between controlled and uncontrolled, or between class and function components, beyond the task.
- When the expected behaviour on error, empty or loading states isn't specified.

## Report back

End with: components changed, where each new piece of state lives and why, effects added or removed, the lint and test commands you ran with results, and anything not checked (for example "did not test with a screen reader").
