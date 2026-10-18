---
name: testing
description: Always-on rules for writing and running tests in any language, covering behaviour-focused tests, failing tests first for bugs, determinism, isolation, speed and running the suite before finishing.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

- Use the project's configured test framework, runner and file layout. Do not add a second one.
- Test behaviour through the public interface: inputs, outputs and observable effects. Do not assert on private methods or internal call order.
- For a bug, first write a test that reproduces it and watch it fail, then fix the code until it passes.
- Give each test one reason to fail and a name that says the expected behaviour.
- Cover edge cases and error paths, not just the happy path: empty, boundary, invalid and failing-dependency inputs.
- Make tests deterministic. Inject or fake the clock, seed any randomness and never depend on test order, wall-clock time or time zone.
- Never use fixed sleeps to wait. Wait on a condition with a timeout, or use fake timers.
- Keep tests isolated: each test sets up and tears down its own state, uses temporary directories and never relies on shared mutable globals.
- Never call the real network or third-party services in unit tests. Fake slow or nondeterministic boundaries (network, clock, external APIs); use real objects for the code under test.
- Keep unit tests fast; move slow integration and end-to-end tests to their own suite.
- A flaky test is a bug: find the cause instead of adding retries.
- Run the relevant tests after every change and the full suite before finishing.

For more, load the tdd-workflow skill and the testing skill for your language, such as python-testing or typescript-testing.
