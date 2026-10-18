---
name: ui-flow-audit
description: Static trace of every user-facing control in a frontend, following each click, toggle or submit through its event handler, state setters, effects, store actions, network calls and their responses to the final rendered state, to find interactions that each work alone but cancel each other, race, double-fire or leave the screen in the wrong state, reported flow by flow. Use when a feature behaves correctly in isolation yet breaks when actions are combined or repeated, a toggle snaps back, a filter or form resets unexpectedly, or someone wants an audit of how the UI's state changes fit together before a release.
license: MIT
compatibility: Any Agent Skills host. Framework-neutral (React, Vue, Svelte, Angular, vanilla); reading code is enough, running the app and its tests confirms findings.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# UI flow audit

Bugs in interactive UIs often live between handlers, not inside them: a click sets state, an effect reacts and resets it, a response from an earlier request lands last and overwrites the newer one. Each piece passes its unit test. This audit traces the whole chain for each control and checks what the user finally sees.

The audit does not change source files. It may run the app or tests to confirm a finding, with the user's permission. It produces a report; fixing is a separate step the user approves. Neighbours: `browser-qa` clicks through a running app; `react-reviewer` reviews a diff; `react-patterns` says how to structure state. This skill maps cause and effect across a whole screen or feature.

## 0. Scope

1. Agree the scope with the user: one screen, one feature, or a list of routes. A whole app at once gives a shallow report; **ask** to narrow it if there are more than ~30 controls.
2. Identify the framework and the state tools in use (component state, context, Redux/Zustand/Pinia/NgRx stores, a query cache such as TanStack Query or SWR, URL/search params, form libraries, local storage).
3. Note the expected behaviour for each flow. If there is a spec, PRD or test describing it, read it. If not, write your assumption next to each flow and flag it for confirmation.

## 1. Inventory controls

Search the scoped components for every user-facing trigger and list them:

- Event props: `onClick`, `onChange`, `onSubmit`, `onBlur`, `onKeyDown`, `@click`, `v-model`, `(click)`, `bind:value`, `on:submit`.
- Indirect triggers: route changes, URL param edits, drag/drop, keyboard shortcuts, timers and polling, websocket or SSE messages, window focus refetch, `storage` events from other tabs.

Give each an ID (`F1`, `F2`...) with file and line.

## 2. Trace each flow

For each control, follow the chain until nothing else changes. Write it as a sequence:

```
F3 "Apply filter" button (Filters.tsx:42)
 1. onClick -> setFilters({...filters, status})            Filters.tsx:44
 2. filters is a dependency of useEffect -> setPage(1)     ResultsList.tsx:18
 3. [filters, page] in query key -> GET /api/items?status&page   useItems.ts:9
 4. URL sync effect writes ?status=... but not page        useUrlState.ts:31
 5. Response -> cache -> list renders
 Final state: filter applied, page 1, URL missing page
```

At each step record: what changed, who reads it, and what that reader does. Follow:

- Every setter call and every place that state is read (search for its name).
- Effects/watchers/computed values that depend on it, and what they set in turn.
- Store actions, reducers and middleware/sagas/listeners they trigger.
- Network calls: request, success path, error path, and what happens if two are in flight.
- Derived or mirrored state (props copied into state, state copied to URL or storage), the commonest source of fights.

## 3. Cross-check pairs and sequences

The bugs are in combinations. For each flow, check against the others that touch the same state:

| Check | Question | Typical bug |
|---|---|---|
| Shared writes | Do two flows write the same state, URL param or cache key? | Second handler or an effect silently undoes the first |
| Effect loops | Does an effect write state that triggers another effect that writes back? | Value snaps back, infinite render loop, flicker |
| Order | Does the final state depend on which handler or effect runs first? | `onBlur` save vs `onClick` cancel; parent and child both handle the event |
| Stale closure | Does a handler, timer or subscription capture an old value? | Increment uses the value from mount; interval sees initial filters |
| Races | Can responses arrive out of order? Is there cancellation (`AbortController`, query keys, ignore flag)? | Typing "ab" shows results for "a" |
| Repeat | What if the user clicks twice, double submits, or toggles fast? | Duplicate POST, toggle ends in wrong state, optimistic update not rolled back |
| Optimistic updates | Is rollback on error correct, and does a refetch overwrite a newer local change? | Item reappears after delete; like count jumps |
| Reset paths | What resets this state (route change, logout, form reset, key change)? Does it reset everything it should, and nothing else? | Old filter survives navigation; modal reopens with last user's data |
| Remount | Does a changing `key`, conditional render or route remount the component and lose state? | Input clears while typing |
| Disabled/loading | Is the control disabled while its action runs, and re-enabled on error? | Stuck spinner after a failed request |
| External sync | Back/forward buttons, a second tab, a websocket event: do they agree with local state? | URL says page 3, list shows page 1 |

## 4. Confirm

For each suspected problem, try to confirm it before reporting:

1. Re-read the exact lines; check the framework's semantics (for example, React 18+ batches all setters in the same tick, including in promises and timeouts; `useEffect` normally runs after paint, but after a discrete event such as a click React flushes it before the browser paints; Vue watchers are batched and by default run before the next component update, `flush: 'pre'`).
2. If tests exist, look for one covering the combination. If the user allows running things, run the app and reproduce, or write a throwaway test outside the source tree (or delete it afterwards), and note the result. Do not commit anything.
3. Mark each finding **confirmed** (reproduced or provable from the code alone) or **suspected** (depends on timing or data you could not check). Drop anything you cannot point to a line for.

## Never

- Never edit source files during the audit. Suggested fixes go in the report.
- Never report a hypothetical without the sequence of steps that produces it.
- Never assume a library's behaviour; check its docs or source when a finding depends on it (cache invalidation, batching, debounce semantics).

## Report

```
## UI flow audit: <scope>
Assumptions to confirm: <list>

### Flow map
F1 <control> (file:line): <one-line chain> -> final state OK | PROBLEM
F2 ...

### Findings (most severe first)
1. [confirmed|suspected] <title>  Flows: F3 + F7
   Steps: <user steps that trigger it>
   Chain: <file:line -> file:line -> ...>
   Expected: <...>  Actual: <...>
   Fix: <smallest change, e.g. derive instead of mirror, cancel stale request, single owner for the URL param>
   Test to add: <the combination test that would catch it>
2. ...

### Clean flows
<IDs that were traced and are fine>

### Not traced
<controls or triggers skipped and why>
```
