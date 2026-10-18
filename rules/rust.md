---
name: rust
description: Always-on rules for Rust files, covering cargo tooling, error handling, panics, unsafe code, async and dependency hygiene.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.rs"
  kete-loom/owner: "Kete-org"
---

- Run `cargo fmt`, `cargo clippy --all-targets` and `cargo test` after a change. Fix clippy warnings instead of adding `#[allow]` without a reason.
- Return `Result` for recoverable failures and propagate with `?`. Add context to errors as they cross a boundary.
- Use the project's error approach (often `thiserror` for libraries, `anyhow` for applications); never return `Box<dyn Error>` or `String` errors from a public library API without reason.
- Never use `unwrap()` or `expect()` on input, I/O or anything that can fail at runtime outside tests. Use `expect("why this cannot fail")` only for true invariants.
- Avoid code that can panic on untrusted input: indexing with `[]`, slicing strings at byte offsets, and unchecked arithmetic (it panics in debug and wraps silently in release). Use `get`, `checked_*` or `saturating_*`.
- Write `unsafe` only when it is required, keep the block minimal, and add a `// SAFETY:` comment stating the invariant it relies on.
- Never hold a `std::sync::Mutex` guard across an `.await`; drop it first or use the async runtime's mutex.
- Never call blocking I/O or long CPU work directly in async code; use the runtime's blocking task facility (such as `spawn_blocking`).
- Never log or `Debug`-print secrets; implement `Debug` by hand for types that hold them.
- Use parameterized queries in database code; never build SQL with `format!`.
- Pass `std::process::Command` separate `.arg()` values; never run `sh -c` with a string built from input.
- Commit `Cargo.lock` (always for binaries; Cargo now recommends it for libraries too). Do not add a dependency for a few lines of code.

For more, load the rust-patterns and rust-testing skills.
