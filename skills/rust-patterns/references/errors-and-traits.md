# Errors and traits: worked patterns

Read this when designing a crate's error type or a public trait.

## Library error with thiserror

```rust
use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("could not read config file {path:?}")]
    Read {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
    #[error("invalid config")]
    Parse(#[from] toml::de::Error),
    #[error("missing required key `{0}`")]
    MissingKey(&'static str),
}

pub fn load(path: &std::path::Path) -> Result<Config, ConfigError> {
    let text = std::fs::read_to_string(path).map_err(|source| ConfigError::Read {
        path: path.to_owned(),
        source,
    })?;
    let config: Config = toml::from_str(&text)?; // From<toml::de::Error>
    Ok(config)
}
```

Rules:

- The `#[error]` message describes this layer only. Don't repeat the source's message in it; reporters walk `source()` and print the chain.
- Use `#[from]` only when the conversion is unambiguous. If two call sites produce the same source type with different meaning, use explicit variants with `#[source]` and `map_err`.
- Mark public error enums `#[non_exhaustive]` if you expect to add variants without a major version bump.

## Application errors with anyhow

```rust
use anyhow::{bail, Context, Result};

fn main() -> Result<()> {
    let path = std::env::args().nth(1).context("usage: tool <config>")?;
    let config = mylib::load(path.as_ref())
        .with_context(|| format!("loading config from {path}"))?;
    if config.workers == 0 {
        bail!("workers must be at least 1");
    }
    Ok(())
}
```

- Returning `anyhow::Result<()>` from `main` prints the error chain on failure and exits non-zero.
- Use `anyhow::Error::downcast_ref::<T>()` only at the top level, when you must branch on a specific cause.

## Option and Result helpers

| Want | Use |
|---|---|
| Option to Result | `opt.ok_or(Error::Missing)?` / `opt.ok_or_else(\|\| ...)?` |
| Default on None | `opt.unwrap_or_default()` / `unwrap_or_else(\|\| ...)` |
| Transform the success value | `res.map(...)` |
| Chain fallible steps | `res.and_then(...)` |
| Log and drop an error deliberately | `if let Err(e) = res { tracing::warn!(error = %e, "..."); }` |

Never use `let _ = fallible();` for a `Result` whose failure matters; handle or log it.

## Trait design

```rust
pub trait Store {
    fn get(&self, key: &str) -> Result<Option<Vec<u8>>, StoreError>;
    fn put(&self, key: &str, value: &[u8]) -> Result<(), StoreError>;
}

pub struct Cache<S: Store> { inner: S }      // avoid: bound on the struct
pub struct Cache<S> { inner: S }             // prefer
impl<S: Store> Cache<S> { /* ... */ }        // bound where it is needed
```

- Take `&self` in trait methods unless mutation is the point; implementations can use interior mutability.
- Keep traits small and focused. A trait with ten methods usually wants splitting.
- To make a trait usable as `dyn Trait`, avoid generic methods and `Self` return types (or gate them with `where Self: Sized`).
- Sealed traits (a private supertrait) stop downstream crates from implementing a trait you need to extend later.

## Async traits

`async fn` in traits works on stable Rust for static dispatch. For `dyn` use, or when callers need the returned future to be `Send`, check the project's current approach (the `async-trait` crate, or a method returning `Pin<Box<dyn Future<Output = T> + Send + '_>>`) and follow it rather than mixing styles.

## Conversions

- `impl From<A> for B` gives you `Into` for free. Never implement `Into` directly.
- `TryFrom` for conversions that can fail; its `Error` type should be a real error, not `()` or `String`.
- `AsRef<str>` / `AsRef<Path>` for functions that only need to look at the data.
