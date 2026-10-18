---
name: typescript-testing
description: Vitest and Jest test suites for TypeScript and JavaScript projects, picking whichever runner the repo already uses, with module mocks, spies, fake timers, async assertions, fixtures, coverage thresholds and a procedure for diagnosing flaky tests. Use when writing or fixing unit and integration tests in a TS/JS codebase, mocking an import or the clock, raising coverage, or chasing a test that passes locally and fails in CI.
license: MIT
compatibility: Any Agent Skills host. Needs Node.js 18+ and the project's package manager and test runner.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# TypeScript testing

Tests that run fast, fail for one reason, and give the same answer every time. Use the runner the project already has.

## 0. Detect the setup

1. Check `package.json` (`devDependencies`, `scripts.test`) and config files: `vitest.config.*` or a `test` block in `vite.config.*` means Vitest; `jest.config.*` or a `jest` key means Jest. `node:test` imports mean the built-in Node runner: keep using it (`node --test`, `mock` from `node:test`) and apply the rules below, not the Vitest/Jest APIs.
2. If none exists, **stop and ask** which to add. Suggest Vitest for Vite or ESM-first projects, and Jest only if the team already knows it.
3. Note the environment (`node`, `jsdom`, `happy-dom`), setup files, path aliases and whether globals (`describe`, `it`) are enabled or imported.
4. Run the suite once. If it already fails, report which tests fail before changing anything.
5. Run a single file while working: `npx vitest run path/to/file.test.ts` or `npx jest path/to/file.test.ts`. Filter by name with `-t "name"`.

## 1. Write the test

- One behaviour per test; name it after that behaviour (`"rejects an expired token"`).
- Arrange, act, assert. Test through the public API of the module, not private helpers.
- Use the narrowest matcher that says what you mean: `toEqual` for structure, `toStrictEqual` when `undefined` properties matter, `toBe` for identity and primitives, `toThrow(ErrorClass)` for errors.
- Build test data with small factory functions (`makeUser({ role: "admin" })`) rather than large shared fixtures that every test mutates.
- Keep fixtures in files next to tests (`__fixtures__/`) for large payloads; load them, do not inline 200 lines.

## 2. Async code

- Always `await` (or `return`) the promise under test. A missing `await` lets the test pass before the assertion runs.
- Rejections: `await expect(fn()).rejects.toThrow(NotFoundError)`. Never wrap in `try/catch` without `expect.assertions(n)`.
- Resolutions: `await expect(fn()).resolves.toEqual(value)`.
- Do not use real `setTimeout` sleeps to wait for work; await the operation, or use fake timers.

## 3. Mocks and spies

Mock only boundaries: network, clock, randomness, filesystem, third-party SDKs. Never mock the unit under test.

| Need | Vitest | Jest |
|---|---|---|
| Mock a module | `vi.mock("./db", () => ({ query: vi.fn() }))` | `jest.mock("./db", () => ({ query: jest.fn() }))` |
| Keep the rest of the real module | `vi.mock(import("./db"), async (orig) => ({ ...(await orig()), query: vi.fn() }))` | `jest.mock("./db", () => ({ ...jest.requireActual("./db"), query: jest.fn() }))` |
| Variable used inside a mock factory | `const m = vi.hoisted(() => vi.fn())` | name it with a `mock` prefix |
| Spy on a method | `vi.spyOn(obj, "method")` | `jest.spyOn(obj, "method")` |
| Typed mock | `vi.mocked(fn)` | `jest.mocked(fn)` |
| Reset between tests | `vi.restoreAllMocks()` in `afterEach`, or `restoreMocks: true` in config | `restoreMocks: true` in config |

- `vi.mock` and `jest.mock` are hoisted above imports, so a factory cannot reference normal top-level variables.
- Jest with native ESM cannot use `jest.mock` on ESM imports; use `jest.unstable_mockModule` followed by a dynamic `await import()`, or run Jest through a CJS transform.
- For HTTP, prefer intercepting at the network layer (`msw`, `nock`, or `undici` `MockAgent`) over mocking `fetch` by hand, if the project already has one of them.
- Assert on what matters (`toHaveBeenCalledWith(expected)`), not on call counts that are an implementation detail.

## 4. Timers and dates

```ts
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2025-01-01T00:00:00Z")); });
afterEach(() => { vi.useRealTimers(); });

it("retries after 1s", async () => {
  const p = withRetry(task);
  await vi.advanceTimersByTimeAsync(1000);   // async variant flushes promises between timers
  await expect(p).resolves.toBe("ok");
});
```

Jest equivalents: `jest.useFakeTimers()`, `jest.setSystemTime()`, `jest.advanceTimersByTimeAsync()`. Always restore real timers in `afterEach`.

## 5. Coverage

- Vitest: `npx vitest run --coverage` (needs `@vitest/coverage-v8` or `@vitest/coverage-istanbul`). Jest: `npx jest --coverage`.
- Set thresholds in config (`test.coverage.thresholds` in Vitest, `coverageThreshold` in Jest) only if the team wants them enforced.
- Read the uncovered-lines report and test the **branches** that matter (error paths, boundaries). Do not write tests that only execute lines without asserting.

## 6. Flaky tests

Follow this order and stop when you find the cause:

1. Reproduce: run the single test many times (a shell loop or the runner's repeat option) and the whole file in random order (Vitest `--sequence.shuffle`, Jest `--randomize`).
2. Run it alone and with the full suite. Passing alone but failing together means **shared state**: module-level variables, unrestored mocks, leftover DB rows, `process.env` changes. Reset in `beforeEach`/`afterEach`.
3. Look for real time (`Date.now()`, `new Date()`), real timers, randomness, or locale/timezone (`TZ=UTC` in the test script).
4. Look for missing `await`, unawaited promises in setup, or assertions on work still in progress.
5. Look for real network, ports already in use, or order-dependent file writes. Use temp dirs (`fs.mkdtemp`) and port `0`.
6. CI-only failures: compare Node version, CPU count (worker pools), and environment variables.

Never fix flakiness by adding retries, longer timeouts or `.skip` without telling the user; those hide the bug.

## Rules

- Never delete, skip or loosen an existing assertion to get green. If a test is wrong, explain why and ask first.
- No real network calls, no real time, no dependence on test order.
- Do not add a new test runner or mocking library without asking.

## Report back

End with: tests added or changed (file and name), the command you ran, pass/fail counts, coverage change if measured, and for a flaky test the root cause you found.
