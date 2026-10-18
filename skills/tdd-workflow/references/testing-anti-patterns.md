# Testing anti-patterns

Read this before adding a mock, a test helper, a cleanup method, or a test for code that already exists. Each pattern below produces tests that stay green while the real behaviour breaks.

## 1. Testing the mock instead of the behaviour

**Symptom:** the assertion checks that a mock was rendered, called or returned its canned value, and nothing else.

```ts
// Bad: passes as long as the mock exists
jest.mock('./PriceBadge', () => () => <div data-testid="price-badge" />);
expect(screen.getByTestId('price-badge')).toBeInTheDocument();

// Good: asserts what the user sees, using the real component
expect(screen.getByText('GHS 120.00')).toBeInTheDocument();
```

**Check:** "If I deleted the production code this test covers, would it fail?" If the answer is no, the test is about the mock.

**Fix:** use the real collaborator, or assert on the observable result of the unit under test (return value, state change, output, message sent). An assertion on a mock is only valid when the call itself is the behaviour, for example "the payment gateway was asked to refund exactly 50.00", and even then assert the arguments, not just that a call happened.

## 2. Test-only methods in production code

**Symptom:** a production class grows `reset()`, `_setStateForTest()`, `destroyForTests()` or a public getter that only tests call.

**Why it hurts:** production callers can reach it, it couples the class to the test suite, and it often bypasses invariants the real API enforces.

**Fix:**

- Search the codebase for callers. If only tests call it, move it out.
- Build the state through the public API, or create a fresh instance per test.
- Put cleanup in test helpers or fixtures (`afterEach`, a pytest fixture, a `t.Cleanup` func).
- If the class truly cannot be tested without a back door, the design is telling you something: inject the dependency instead.

## 3. Mocking without understanding the dependency

**Symptom:** a method is mocked "to be safe" or "because it's slow", and the test then passes or fails for reasons nobody can explain.

**Before mocking anything:**

1. Read the real dependency. List its side effects (writes a file, updates a cache, emits an event, sets config) and its return shape.
2. Decide which of those the test relies on. Mocking a method also removes every side effect the test may need.
3. Run the test with the real dependency first. Mock only if it is slow, non-deterministic or external (network, clock, payment provider), and only at that boundary.

**Rule:** mock at the lowest level that removes the slow or external part, not the high-level method the test is about.

## 4. Incomplete mocks

**Symptom:** a mocked response contains only the fields the current code reads.

```py
# Bad: real API also returns "currency" and "metadata"; code that reads them later
# fails in production while this test stays green
fake_charge = {"id": "ch_1", "status": "succeeded"}
```

**Fix:** copy the full shape from the real API's documented response, a recorded fixture or the type definition. Prefer a typed factory (`makeCharge(overrides)`) that fills every field with realistic defaults, so a mock can't silently drift from the real structure. When the real shape changes, update the factory, not every test.

## 5. Tests written after the code

**Symptom:** the test passes the first time it runs.

**Why it hurts:** a test you never saw fail may not be able to fail. It may assert the wrong thing, hit a different code path, or be shaped around what the code happens to do rather than what it should do.

**Fix:**

1. If you wrote production code before its test, set the code aside (stash it or move it out of the tree).
2. Write the test. Run it. It must fail for the expected reason.
3. Rebuild the code to make it pass. Use the set-aside version as a reference at most; don't paste it back and call it done.
4. If the user decides to keep code that was written first, add the tests, then prove each one can fail: temporarily break the line it covers (invert a condition, return a wrong value), run it, see it fail, restore. Tell the user these tests were added after the code.

## 6. Smaller traps

| Trap | Fix |
|---|---|
| Expected value computed by the code under test (`expect(f(x)).toBe(f(x))`) | Use a literal or a hand-checked fixture |
| Asserting on log text or exact error wording only | Assert the behaviour: the returned error type, the status code, the state left behind |
| One test checks five behaviours | Split it so a failure names the broken behaviour |
| Shared mutable fixture across tests | Fresh setup per test; tests must pass in any order |
| Sleeping to wait for async work | Await the promise, use fake timers, or poll for the condition with a timeout |

## Quick gate before committing a test

- Did I see it fail, for the right reason?
- Would it fail if the behaviour broke, but not if I renamed an internal?
- Does every mock stand in for something slow or external, with the full real shape?
- Is every method it calls also used by production code?
