# Cargo workspaces and clippy policy

Read this when creating or restructuring a workspace, or setting lint policy.

## Layout

```
my-project/
├── Cargo.toml          # workspace root, no [package] unless it is also a crate
├── Cargo.lock
├── crates/
│   ├── app-core/       # domain types and logic, no I/O
│   ├── store/          # persistence, depends on app-core
│   └── cli/            # binary, depends on app-core and store
└── clippy.toml         # optional
```

Keep the dependency graph acyclic and pointing inwards: binaries depend on libraries, never the reverse.

## Root manifest

```toml
[workspace]
resolver = "3"          # edition 2024 default; use "2" on edition 2021
members = ["crates/*"]

[workspace.package]
edition = "2024"
license = "MIT"

[workspace.dependencies]
anyhow = "1"
thiserror = "2"
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }

[workspace.lints.rust]
unsafe_code = "forbid"

[workspace.lints.clippy]
unwrap_used = "warn"
expect_used = "warn"
dbg_macro = "warn"
todo = "warn"
```

Match the edition, resolver and dependency major versions already used by the project rather than copying the numbers above; they are placeholders.

`unsafe_code = "forbid"` is a sensible default for crates with no FFI. Relax it per crate (`deny`, then `#[allow(unsafe_code)]` on the one module) only where unsafe is justified.

## Member manifest

```toml
[package]
name = "store"
version = "0.1.0"
edition.workspace = true
license.workspace = true

[dependencies]
app-core = { path = "../app-core" }   # don't name a crate `core` or `std`: it shadows the built-in crate
serde = { workspace = true }
thiserror = { workspace = true }
sqlx = { version = "0.8", optional = true }

[features]
default = []
postgres = ["dep:sqlx"]

[lints]
workspace = true
```

## Useful cargo commands

| Task | Command |
|---|---|
| Check fast without codegen | `cargo check --workspace --all-targets` |
| Build one member | `cargo build -p store` |
| Why is this crate here? | `cargo tree -i <crate>` |
| Duplicate versions in the graph | `cargo tree -d` |
| Features enabled on a crate | `cargo tree -e features -i <crate>` |
| Update one dependency | `cargo update -p <crate>` |
| Check every feature combination | `cargo hack check --feature-powerset` (needs `cargo-hack`) |

## Clippy

Baseline for CI:

```sh
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

- `clippy::all` (the default groups) is on already. `clippy::pedantic` is opt-in and noisy; enable it only if the project already does, or the user asks.
- `unwrap_used` and `expect_used` are restriction lints. Allow them in tests with `#[cfg_attr(test, allow(clippy::unwrap_used, clippy::expect_used))]` at the crate root, or in `clippy.toml` with `allow-unwrap-in-tests = true` and `allow-expect-in-tests = true`.
- Suppress a lint on the smallest item, with a reason:

```rust
#[expect(clippy::too_many_arguments, reason = "mirrors the C API one-to-one")] // Rust 1.81+
fn ffi_call(/* ... */) {}
```

On an older `rust-version`, use `#[allow(...)]` with a trailing comment instead.

- Don't use `cargo clippy --fix` on a dirty tree without reviewing the diff it produces.
