---
name: rust-patterns
description: Idiomatic Rust design guide covering ownership and borrowing choices, Result-based errors with thiserror in libraries and anyhow in binaries, traits and generics, iterator chains, async with tokio, rules for unsafe, cargo workspaces and clippy settings. Use when writing new Rust code, shaping a crate's public API, choosing between owned and borrowed types, or setting up a Cargo workspace and lint policy.
license: MIT
compatibility: Any Agent Skills host. Needs a Rust toolchain (cargo, rustc, clippy, rustfmt) to check the code it writes.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "cargo"
  kete-loom/owner: "Kete-org"
---

# Rust patterns

Write Rust that compiles on the first honest try, says what it owns, and fails with typed errors instead of panics.

## 0. Before you write

1. Read `Cargo.toml` (and the workspace root's, if any): edition, `rust-version`, features, existing error crate, async runtime. Match them; never add a second error crate or runtime.
2. Read `clippy.toml`, `rustfmt.toml` and any `[lints]` table. They are the house rules.
3. Find a neighbouring module that does something similar and copy its shape (error type, constructor style, module layout).
4. If the task needs a new dependency, **stop and ask the user** before adding it, and name the crate and why.

## 1. Ownership and borrowing

Decide per parameter, in this order:

| Need | Take |
|---|---|
| Only read it | `&T`, `&str`, `&[T]`, `&Path` (not `&String`, `&Vec<T>`, `&PathBuf`) |
| Mutate the caller's value | `&mut T` |
| Store it or move it to another thread | `T` by value (`String`, `Vec<T>`) |
| Accept owned or borrowed, store it | `impl Into<String>` / `impl Into<PathBuf>` |
| Return borrowed-or-owned | `Cow<'_, str>` |

- Return owned values from constructors and builders; return references only from accessors (`fn name(&self) -> &str`).
- When the borrow checker objects, restructure first: shorten the borrow with a block, split the struct into fields borrowed separately, or collect indices before mutating. Use `.clone()` only when the data is small or the copy is the real intent, never just to silence an error.
- Shared ownership: `Rc<T>` single-threaded, `Arc<T>` across threads. Interior mutability: `Cell`/`RefCell` single-threaded, `Mutex`/`RwLock` or atomics across threads. Reaching for `Rc<RefCell<T>>` everywhere usually means the ownership tree needs redesign; say so.
- Add explicit lifetimes only when elision can't express the relationship. A struct holding references (`struct Parser<'a>`) is fine for short-lived views; long-lived structs should own their data.

## 2. Errors

- Library crates: one error enum per crate or module with `thiserror`. Wrap sources with `#[from]` or `#[source]` so the chain survives.
- Binaries and app glue: `anyhow::Result<T>`, adding context at each boundary with `.context("reading config")` / `.with_context(|| format!("opening {path:?}"))`.
- Propagate with `?`. Convert at module boundaries, not at every call.
- `unwrap()` and `expect()` belong in tests, examples and provably-impossible cases. For the last, use `expect("reason this cannot fail")`, never bare `unwrap()`.
- Never return `Result<T, String>` or `Box<dyn Error>` from a public library API; callers can't match on them.
- `panic!` is for broken invariants (bugs), not for bad input, missing files or network failures.

Patterns and full examples: `references/errors-and-traits.md`.

## 3. Traits and generics

- Prefer generics (`fn f<R: Read>(r: R)` or `impl Read`) for hot paths and when the caller picks one type. Use `dyn Trait` for heterogeneous collections, plugin points and to cut compile time or binary size.
- Keep trait bounds on `impl` blocks and functions, not on struct definitions.
- Implement standard traits instead of ad hoc methods: `From`/`TryFrom` for conversions, `Display` for user-facing text, `Default`, `FromStr`, `Iterator`, `AsRef`.
- Derive `Debug` on every public type. Derive `Clone`, `PartialEq`, `Eq`, `Hash` only when they make sense for the type.
- Newtypes (`struct UserId(u64)`) for values that must not be mixed up. Enums instead of boolean flags or stringly-typed states.
- Don't implement `Deref` to fake inheritance.

## 4. Iterators and collections

- Chain `iter()`, `map`, `filter`, `filter_map`, `flat_map`, then `collect()`; collect into `Result<Vec<_>, _>` to stop at the first error.
- Use a plain `for` loop when the body has side effects, early `return`, or `?` that would make the chain unreadable.
- Pre-size with `Vec::with_capacity` when the length is known. Use the `entry` API on maps instead of a lookup followed by an insert.
- Don't `collect()` just to iterate again; pass the iterator on (`impl Iterator<Item = T>`).

## 5. Async with tokio

1. One runtime, created once with `#[tokio::main]` in the binary. Libraries take no runtime dependency they can avoid and never create their own runtime.
2. Never block inside async code: no `std::thread::sleep`, `std::fs` on hot paths, blocking HTTP clients, or long CPU loops. Use `tokio::time::sleep`, `tokio::fs`, or move the work into `tokio::task::spawn_blocking`.
3. Never hold a `std::sync::Mutex` guard across `.await`. Drop it before awaiting, or use `tokio::sync::Mutex` when the lock must span an await.
4. Every `tokio::spawn` gets an owner: keep the `JoinHandle` (or use a `JoinSet`) and handle its result, or the task's panic and error vanish.
5. Bound concurrency and channels: `tokio::sync::Semaphore`, bounded `mpsc::channel(n)`. Unbounded channels need a written reason.
6. Add timeouts to network I/O with `tokio::time::timeout`, and support shutdown with a cancellation signal checked in `tokio::select!`.
7. Spawned futures must be `Send + 'static`: move owned data (or an `Arc`) into them, don't borrow.

## 6. Unsafe

- Don't write `unsafe` unless the task cannot be done in safe Rust (FFI, a measured hot path, a primitive the standard library lacks). If you think you need it, **stop and tell the user why** before writing it.
- Every `unsafe` block gets a `// SAFETY:` comment naming the invariant that makes it sound, and every `unsafe fn` gets a `# Safety` doc section stating what callers must uphold.
- Keep the block as small as possible and wrap it in a safe API that enforces the invariant.
- Run the tests under Miri (`cargo +nightly miri test`) when unsafe code touches pointers or memory layout, if Miri is available.

## 7. Cargo workspaces

- Root `Cargo.toml` with `[workspace]`, `members`, and shared versions in `[workspace.dependencies]`; members use `serde = { workspace = true }`.
- Put shared lint settings in `[workspace.lints]` and `[lints] workspace = true` in each member.
- Features are additive: a feature must never remove an API or change behaviour incompatibly. Gate optional dependencies with `dep:name`.
- Commit `Cargo.lock`. Cargo's current guidance is to commit it for libraries too; follow the project if it has a documented reason not to.
- Layout and a starter manifest: `references/cargo-and-clippy.md`.

## 8. Finish: format, lint, test

Run, and fix everything before you report:

```sh
cargo fmt --all
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
```

If the project has mutually exclusive features, `--all-features` fails by design: use the feature flags CI uses instead.

- Fix clippy warnings in the code. Suppress only on the smallest item, with a reason: `#[expect(clippy::lint_name, reason = "...")]` when the project's `rust-version` is 1.81 or newer (it warns once the lint stops firing), otherwise `#[allow(clippy::lint_name)]` plus a comment.
- If a check fails for reasons outside your change, report it instead of fixing unrelated code.

## Never

- Never add `unwrap()` on user input, I/O, parsing or network results in non-test code.
- Never silence the borrow checker with `clone()`, `Rc<RefCell<_>>` or `unsafe` without saying why.
- Never use `std::mem::transmute` to convert between types that have safe conversions.
- Never add a dependency, a feature flag or `#![allow(...)]` at crate level without asking.

## Report back

End with: files changed, the three commands above and their results, any `unsafe`, `allow` or new dependency introduced and why, and anything left undone.
