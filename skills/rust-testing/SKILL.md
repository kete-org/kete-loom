---
name: rust-testing
description: "Writing and organising tests for Rust crates with cargo test, covering #[cfg(test)] unit modules, integration tests under tests/, doc tests, trait-based fakes and mockall, property tests with proptest, #[tokio::test] for async code, and the cargo test flags for filtering and output. Use when adding or fixing Rust tests, deciding where a test belongs in a crate, testing async or I/O-bound Rust code, or getting a flaky cargo test run under control."
license: MIT
compatibility: Any Agent Skills host. Needs a Rust toolchain with cargo. proptest, mockall and tokio are used only if the project already depends on them or the user agrees to add them.
metadata:
  kete-loom/version: "0.1.1"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "cargo"
  kete-loom/owner: "Kete-org"
---

# Rust testing

Put each test where it can see exactly what it needs, keep it deterministic, and prove it with a `cargo test` run.

## 0. Before you write a test

1. Read `Cargo.toml` `[dev-dependencies]`: which of `proptest`, `mockall`, `tokio` (with which features), `tempfile`, `insta`, `rstest` are already there. Use those. **Ask the user** before adding a new dev-dependency.
2. Check how CI runs tests (`.github/workflows/`, `Makefile`, `justfile`): plain `cargo test`, `cargo nextest run`, feature flags, `--workspace`. Use the same command.
3. Run the existing suite once and record the result. If it already fails, **stop and tell the user** which tests fail before you change anything.

## 1. Choose where the test goes

| Testing | Put it in | Can see |
|---|---|---|
| One function or private helper | `#[cfg(test)] mod tests` at the bottom of the same file | Private items via `use super::*;` |
| The crate's public API, as a user would call it | `tests/<feature>.rs` (each file is its own crate) | Only `pub` items |
| A usage example in the docs | A fenced code block in the item's `///` doc comment | Only `pub` items |
| A binary's behaviour end to end | `tests/cli.rs`, running the binary (for example with `assert_cmd` if present) | Process output |

- Binary crates: integration tests can't import `main.rs`. Move logic into `src/lib.rs` and keep `main.rs` thin.
- Shared integration helpers go in `tests/common/mod.rs` (not `tests/common.rs`, which cargo would run as its own test crate), pulled in with `mod common;`.

## 2. Unit tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_port_from_host_string() {
        assert_eq!(parse_port("localhost:8080"), Ok(8080));
    }

    #[test]
    fn rejects_missing_port() {
        let err = parse_port("localhost").unwrap_err();
        assert!(matches!(err, ParseError::MissingPort));
    }

    #[test]
    fn reads_port_from_config_text() -> Result<(), Box<dyn std::error::Error>> {
        let config: Config = "port = 8080".parse()?;
        assert_eq!(config.port, 8080);
        Ok(())
    }

    #[test]
    #[should_panic(expected = "capacity must be non-zero")]
    fn zero_capacity_panics() {
        RingBuffer::<u8>::new(0);
    }
}
```

- Name tests after the behaviour (`rejects_missing_port`), not `test1`.
- Assert on the specific error variant with `matches!` instead of comparing `Debug` strings.
- Use `#[should_panic(expected = "...")]` only for documented panics; give the expected text so an unrelated panic doesn't pass.
- Tests may return `Result<(), E>` to use `?`; in tests, `unwrap()` and `expect()` are fine.

## 3. Doc tests

- Every public function with a non-obvious use gets an example. Doc tests compile and run with `cargo test` (`cargo test --doc` for only these).
- Use `?` in examples by ending with `# Ok::<(), Box<dyn std::error::Error>>(())`; lines starting with `# ` are hidden from the rendered docs.
- Mark examples `no_run` when they need network or files, `compile_fail` to prove misuse doesn't compile, `ignore` only with a written reason.
- Doc tests run only for library targets. `cargo nextest` does not run doc tests, so CI that uses nextest needs a separate `cargo test --doc` step.

## 4. Fakes and mocks via traits

Rust has no runtime monkey-patching. Make the boundary a trait and inject it.

1. Define a small trait for the external dependency (clock, HTTP client, repository).
2. Make the code under test generic over it (`struct Service<R: Repo>`) or take `&dyn Repo` / `Arc<dyn Repo>`.
3. In tests, prefer a hand-written fake (an in-memory `HashMap` store) for state; use `mockall` (`#[cfg_attr(test, mockall::automock)]` on the trait) when you must assert on calls.
4. Never mock the type under test, and never mock pure functions you could just call.

Examples for fakes, mockall expectations and time control: `references/fakes-proptest-async.md`.

## 5. Property tests with proptest

Use them for parsers, encoders, data structures and anything with an invariant ("decode(encode(x)) == x", "sorted output is a permutation of input").

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn round_trips(s in "\\PC*") {
        prop_assert_eq!(decode(&encode(&s)).unwrap(), s);
    }
}
```

- Use `prop_assert!` / `prop_assert_eq!` inside `proptest!` so failures shrink.
- Commit the `proptest-regressions/` files it writes; they replay past failures.

## 6. Async tests

- `#[tokio::test]` runs on a current-thread runtime. Use `#[tokio::test(flavor = "multi_thread", worker_threads = 2)]` only when the code needs real parallelism (for example it calls `block_in_place`).
- `#[tokio::test]` needs tokio's `macros` and `rt` features for the test target (`[dev-dependencies] tokio = { ..., features = ["macros", "rt"] }`); the `multi_thread` flavor also needs `rt-multi-thread`.
- Don't sleep for real. With the `test-util` feature, `#[tokio::test(start_paused = true)]` and `tokio::time::advance` make timers instant and deterministic.
- Wrap anything that could hang in `tokio::time::timeout` so a bug fails the test instead of stalling CI.

## 7. Running tests

| Goal | Command |
|---|---|
| Everything in a workspace | `cargo test --workspace --all-features` |
| Tests whose name contains a string | `cargo test parse_port` |
| One integration test file | `cargo test --test cli` |
| Only unit tests in the library | `cargo test --lib` |
| Only doc tests | `cargo test --doc` |
| Exact name match (full module path) | `cargo test -- --exact parser::tests::parses_port_from_host_string` |
| Show `println!` output | `cargo test -- --nocapture` |
| Run serially (shared global state) | `cargo test -- --test-threads=1` |
| Run ignored (slow) tests | `cargo test -- --ignored` or `-- --include-ignored` |
| Keep going after a failing test crate | `cargo test --no-fail-fast` |

Flags before `--` go to cargo; flags after `--` go to the test binary.

## 8. Flaky tests

1. Run the test alone and in a loop to reproduce: `for i in $(seq 50); do cargo test name -- --exact || break; done`.
2. Common causes: tests sharing a file path, port, env var or global (run in parallel threads); real time; `HashMap` iteration order; unseeded randomness.
3. Fix the cause: `tempfile::tempdir()` per test, bind port `0`, pass config instead of reading env vars, sort before asserting. `--test-threads=1` is a diagnostic, not a fix.

## Never

- Never delete, `#[ignore]` or weaken an existing test to make the suite pass without the user's agreement.
- Never let tests touch the real network, the user's home directory or shared databases.
- Never assert on `format!("{:?}", ...)` output when a structured comparison is possible.

## Report back

End with: tests added or changed (names and files), the exact command you ran, pass/fail counts, and anything not covered.
