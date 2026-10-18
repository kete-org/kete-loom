---
name: e2e-testing-playwright
description: Writes and maintains Playwright Test end-to-end suites for web apps, using role-based locators, web-first assertions that auto-wait, saved storageState for login, page.route network mocks, isolated per-test data, traces for flaky runs and a sharded CI job. Use when adding or fixing browser end-to-end tests with Playwright, setting up playwright.config, or making an existing Playwright suite reliable in CI.
license: MIT
compatibility: Any Agent Skills host. Needs Node 18+ and the project's package manager; browsers install with npx playwright install.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "node, npx"
  kete-loom/owner: "Kete-org"
---

# End-to-end testing with Playwright

An end-to-end test drives the real app through a real browser, the way a user would. It is slow and costly to maintain, so write few of them, for the journeys that make money or lose data, and make each one deterministic.

## 0. Before you start

1. Look for an existing setup: `playwright.config.ts`, an `e2e/` or `tests/` folder, `@playwright/test` in `package.json`. Follow its conventions (folder, fixtures, naming, base URL) instead of creating a parallel setup.
2. If there is none, run `npm init playwright@latest` (or the project's package manager equivalent) and accept TypeScript. Then read `references/config-and-ci.md` for a config to start from.
3. Find out how the app starts locally and what test data it needs. If the app needs a database or third-party sandbox you cannot reach, **stop and ask the user** how they want it provided.
4. Run the existing suite once (`npx playwright test`) and record the result before changing anything.

## 1. Choose what to cover

- List the critical journeys: sign up, log in, the core create/edit flow, checkout or payment, anything with irreversible effects.
- One test per journey outcome. Cover the happy path plus the one or two failure paths a user really hits (invalid card, expired session).
- Push everything else down: validation rules, formatting and edge cases belong in unit or component tests.

## 2. Locators: how a user finds things

Use, in order of preference:

1. `page.getByRole('button', { name: 'Save' })`: role plus accessible name.
2. `page.getByLabel('Email')`, `getByPlaceholder`, `getByText`, `getByAltText`, `getByTitle`.
3. `page.getByTestId('cart-total')`: only when there is no user-facing handle. The attribute defaults to `data-testid` (change it with `use.testIdAttribute`).

Never use CSS chains tied to layout (`div > div:nth-child(3)`), generated class names, or XPath. Narrow with `locator.filter({ hasText })` or by chaining from a parent region (`page.getByRole('dialog').getByRole('button', { name: 'Confirm' })`). If a role locator can't find an element, the element is probably inaccessible: report that, don't paper over it with a test id.

## 3. Waiting: never sleep

- Actions (`click`, `fill`, `check`) wait for the element to be visible, stable, enabled and able to receive events.
- Assert with web-first assertions that retry until timeout: `await expect(locator).toBeVisible()`, `toHaveText`, `toHaveValue`, `toHaveURL`, `toHaveCount`.
- Never write `page.waitForTimeout(...)` or a fixed sleep. Never `expect(await locator.textContent()).toBe(...)`: that reads once and does not retry.
- For a non-DOM condition, use `await expect.poll(() => fetchStatus()).toBe('done')`.
- To wait for a specific request, start `page.waitForResponse(...)` before the action that triggers it.

## 4. Isolation and data

- Each test gets a fresh browser context: no shared cookies or storage. Keep it that way; never make test B depend on test A.
- Create the data a test needs in the test (through the app's API with the `request` fixture, or a seed helper), with unique values (`order-${test.info().testId}` or a random suffix), so tests can run in parallel and on retry.
- Clean up in fixture teardown, or use a disposable database per run. Never point tests at production.
- Put shared setup in custom fixtures with `test.extend`, not in `beforeAll` blocks that leak state.

## 5. Authentication

Log in once and reuse the state. Use a setup project that logs in through the UI, waits for proof of login, and saves `page.context().storageState({ path: 'playwright/.auth/user.json' })`; testing projects set `dependencies: ['setup']` and `use: { storageState: 'playwright/.auth/user.json' }`. Add `playwright/.auth` to `.gitignore`: it holds live cookies. For several roles, save one file per role. Tests of the login form itself start with an empty state: `test.use({ storageState: { cookies: [], origins: [] } })`.

## 6. Network mocking

Mock only what you don't own or can't control (payment provider, maps, flaky third parties, rare error responses):

```ts
await page.route('**/api/rates', route =>
  route.fulfill({ status: 503, json: { error: 'unavailable' } }));
```

- Use `route.fulfill` for canned responses, `route.abort()` to simulate network failure, `route.continue()` to modify a request in flight.
- Keep at least one unmocked journey against your own backend, or the suite proves nothing about integration.
- For larger fixtures, record a HAR with `page.routeFromHAR(path, { update: true })` once and replay it.

## 7. Flaky tests

1. Reproduce: `npx playwright test path/to/spec.ts --repeat-each=20 --workers=4`.
2. Read the trace: config `trace: 'on-first-retry'` (or `--trace on`), then `npx playwright show-trace <trace.zip>`. Check the action log, DOM snapshots, network and console at the failing step.
3. Fix the cause: a missing web-first assertion, shared data, an animation, a race with a request, an un-awaited promise. Retries hide flakiness; they don't fix it.
4. In CI, `--fail-on-flaky-tests` turns "passed on retry" into a failure when the team wants zero tolerance.

## 8. CI

Run with retries 2 and 1 worker per shard on CI, upload the HTML report and traces as artifacts, and shard with `--shard=1/4` for large suites. A ready workflow and config are in `references/config-and-ci.md`.

## Rules

- Never commit `test.only` (set `forbidOnly: !!process.env.CI`).
- Never add a sleep, a raw `setTimeout`, or a huge timeout to make a test pass.
- Never weaken or delete an assertion to get green; find out why it failed.
- Never put real credentials in test files; read them from environment variables.
- Visual snapshots (`toHaveScreenshot`) only for stable, important screens, generated on the same OS and browser as CI.

## Report back

End with: tests added or changed (file and title), the exact command run, pass/fail/flaky counts, and anything not covered (for example "payment provider mocked, real sandbox not exercised").
