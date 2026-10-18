---
name: react-testing
description: React Testing Library tests for components and custom hooks under Vitest or Jest, written the way a user drives the UI - userEvent.setup() interactions, getByRole and accessible-name queries, findBy and waitFor for async updates, MSW request handlers instead of mocked fetch, render wrappers for providers, routers and query clients, and renderHook for hooks. Use when writing or fixing tests for a React component or hook, replacing Enzyme or snapshot-heavy tests, a test fails with "not wrapped in act(...)" or cannot find an element, or tests break whenever a component is refactored.
license: MIT
compatibility: Any Agent Skills host. Needs Node 18+ (Node 22+ with MSW 3), the project's test runner (Vitest or Jest) with a DOM environment (jsdom or happy-dom), @testing-library/react, @testing-library/user-event and @testing-library/jest-dom; MSW for network mocks.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# React testing

Test a React component the way a person uses it: find things by role and label, act with a real-ish user, wait for what appears on screen, and fake only the network. A test that survives a refactor of the component's internals is the goal.

For runner setup, module mocks and fake timers in general, see `typescript-testing`. For full-browser journeys, see `e2e-testing-playwright`. This skill is the component and hook layer.

## 0. Before you start

1. Find the runner and environment: `vitest.config.*` / `vite.config.*` `test` block (`environment: 'jsdom'`, `setupFiles`), or `jest.config.*` (`testEnvironment: 'jsdom'`, `setupFilesAfterEnv`). Note the test command in `package.json`.
2. Check the setup file imports jest-dom matchers: `import '@testing-library/jest-dom/vitest'` for Vitest, `import '@testing-library/jest-dom'` for Jest. If there is no setup file, add one (setup in `references/setup.md`).
3. Look for an existing custom `render` (often `test/utils.tsx` or `test-utils.tsx`). Reuse it. If providers are wrapped by hand in every test, propose one.
4. Run the existing suite once. If it is already red, **stop and tell the user** which tests fail before writing new ones.

## 1. Pick what to test

- One behaviour per test, named for what the user sees: `shows an error when the email is invalid`.
- Cover: initial render, each interaction that changes the screen, loading, empty and error states, and the callback or request the component is responsible for.
- Do not test: state variable values, which hook was called, CSS class names, child component props, or the number of renders. Those are implementation details.

## 2. Query priority

Use the first that works (full table and pitfalls in `references/queries.md`):

1. `getByRole('button', { name: /save/i })` - almost everything.
2. `getByLabelText` - form fields.
3. `getByPlaceholderText`, `getByText`, `getByDisplayValue`.
4. `getByAltText`, `getByTitle`.
5. `getByTestId` - only when nothing user-visible identifies it.

Decision rules:

- `getBy*` when it must be there now; `queryBy*` only to assert absence (`expect(queryByRole('alert')).not.toBeInTheDocument()`); `findBy*` when it appears after an async update.
- If `getByRole` cannot find a control, the markup is probably inaccessible (a clickable `div`). Say so and suggest the fix rather than switching to a test ID.
- Use `screen` rather than destructuring from `render`.
- Use `within(row)` to scope queries inside a list item, dialog or table row.

## 3. Interact with user-event

```ts
const user = userEvent.setup();
render(<LoginForm onSubmit={onSubmit} />);
await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
await user.click(screen.getByRole('button', { name: /sign in/i }));
expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com' });
```

- Call `userEvent.setup()` once per test, before `render`, and `await` every action.
- Prefer user-event over `fireEvent`; it fires the full event sequence (pointer, focus, keydown, input). Use `fireEvent` only for events user-event does not model (for example `scroll`).
- With fake timers, pass `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` (or `jest.advanceTimersByTime`), or actions hang.

## 4. Async updates

- `await screen.findByRole(...)` for something that appears.
- `await waitFor(() => expect(...))` for an assertion that becomes true; one assertion per `waitFor`, and no side effects inside it.
- `await waitForElementToBeRemoved(() => screen.queryByText(/loading/i))` for spinners.
- "Not wrapped in act(...)" means an update happened after the test stopped waiting. Fix it by awaiting the thing that causes the update (a `findBy`, the user action), not by wrapping code in `act` by hand. RTL's `render` and user-event already wrap in `act`.

## 5. Network: MSW, not mocked fetch

Mock at the network boundary so the component's real fetch code, query library and error handling run. Handlers, server lifecycle and per-test overrides are in `references/msw.md`.

- One shared `server` with happy-path handlers; override per test with `server.use(...)` for errors and empty results.
- Make unhandled requests fail the test (`onUnhandledRequest: 'error'` in MSW 2, `onUnhandledFrame: 'error'` in MSW 3), so a typo in a URL is not a silent pass.
- Assert on what the user sees after the response. Assert on the request body only when sending it is the component's job.
- Create a fresh `QueryClient` per test with `retry: false`, or error tests wait through retries.

## 6. Providers, routers and context

- Wrap with a custom `render` that accepts options (initial route, user, theme) and returns `render(ui, { wrapper })`. Example in `references/setup.md`.
- Router: render inside `MemoryRouter` with `initialEntries`, or the framework's test helper. Assert navigation by what the new screen shows.
- Context: render with the real provider and real initial value. Only mock a context whose provider talks to the outside world (auth SDK, feature flags).
- Next.js: mock `next/navigation` hooks only when the component calls them; async Server Components cannot be rendered by RTL, test their output with e2e tests or test the data function directly.

## 7. Hooks

- Prefer testing a hook through a small component that uses it, if the hook only exists for one component.
- For a shared hook, `renderHook(() => useCounter(), { wrapper })` from `@testing-library/react`; read `result.current` after each update, and wrap direct state changes in `act(() => result.current.increment())`.
- Change props with `rerender(newProps)` and check cleanup with `unmount()`.

## 8. Run and finish

1. Run only the new test file, then the full suite.
2. Check each new test fails when you break the behaviour it covers (comment out the handler line, change the text). A test that cannot fail is removed or rewritten.
3. Run the suite twice; a test that passes once and fails once has a missing await or shared state.

## Never

- Never snapshot a whole component as the only assertion.
- Never assert on `container.querySelector('.btn-primary')` or component internals.
- Never use `waitFor` with an empty callback or arbitrary `setTimeout` sleeps.
- Never mock the component under test, its child components to "isolate" it, or `fetch` itself when MSW is available.
- Never delete or `.skip` a failing test to get green without telling the user why.

## Migrating from Enzyme or implementation tests

Rewrite, do not translate: list the behaviours the old test protected, delete `shallow`/`instance()`/`state()` calls, and write one RTL test per behaviour. Stop and ask before deleting a test whose behaviour you cannot identify.

## Report back

```
## React tests: <component or hook>
Added: <test names>
Changed: <test names and why>
Command: <exact command>   Result: <passed>/<total>
Mutation check: <which behaviour you broke and which test caught it>
Not covered: <states or flows left untested and why>
Accessibility notes: <controls that had no role or label>
```
