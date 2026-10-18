# Replacing sleeps with condition-based waiting

A fixed delay (`sleep(1)`, `setTimeout(r, 50)`, `Thread.sleep(500)`) is a guess about how long something takes. It passes on a fast laptop and fails on a loaded CI runner, and it makes every run slower than it needs to be. Wait for the condition you actually care about instead.

## Pattern

1. Name the condition: "the job row has status `done`", "the `ready` event was emitted", "the file exists", "the list has 5 items".
2. Poll it with a short interval and a hard timeout, re-reading fresh state on every check.
3. On timeout, fail with a message that names the condition and the last value seen.

```ts
async function waitFor<T>(check: () => T | Promise<T>, what: string, timeoutMs = 5000, everyMs = 20): Promise<T> {
  const start = Date.now();
  let last: T;
  for (;;) {
    last = await check();
    if (last) return last;
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out after ${timeoutMs}ms waiting for ${what}; last value: ${String(last)}`);
    await new Promise(r => setTimeout(r, everyMs));
  }
}

// before: await sleep(100); expect(queue.size).toBe(0);
await waitFor(() => queue.size === 0, 'queue to drain');
```

## Use what the framework already has

Prefer the project's existing helper over writing one:

| Stack | Built-in waiting |
|---|---|
| Testing Library (React, Vue, Svelte) | `await waitFor(() => expect(...))`, `findBy*` queries |
| Playwright | web-first assertions such as `await expect(locator).toBeVisible()`, `expect.poll(fn)` |
| Cypress | retried assertions on `cy.get(...).should(...)` |
| Python | `tenacity` retry helpers if installed; otherwise a loop with `time.monotonic()` |
| Java / Kotlin | Awaitility: `await().atMost(5, SECONDS).until(() -> ...)` |
| Go | `require.Eventually(t, cond, 5*time.Second, 20*time.Millisecond)` (testify), or a `select` on a channel with `time.After` |
| .NET | a loop with `Stopwatch` and `Task.Delay`, or the test framework's retry helper |

Better still, avoid polling: await the promise, join the thread, read from the channel, or inject a fake clock so time-based code runs instantly (Jest/Vitest fake timers, Python `freezegun` or `time-machine`, an injected `Clock` in Java).

## Mistakes to avoid

- **No timeout**: the test hangs forever instead of failing.
- **Polling too fast** (every 1 ms): burns CPU and slows the thing you wait for. 10 to 50 ms is plenty.
- **Stale reads**: capturing the value once before the loop. Call the getter inside the loop.
- **Raising the timeout to "fix" flakiness**: if the condition is right, a generous timeout costs nothing on success; if the test still times out, the code is slow or broken, which is a finding.

## When a fixed delay is legitimate

Only when the behaviour under test *is* timing (debounce, throttle, rate limit, a tick interval). Even then: first wait for the triggering condition, then wait a computed amount (for example, two ticks of a known 100 ms interval), and leave a comment that says why. Fake timers are usually the better choice.
