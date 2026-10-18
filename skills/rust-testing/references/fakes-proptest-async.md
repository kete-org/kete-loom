# Fakes, mockall, proptest strategies and async time

Read this when a test needs a test double, a custom proptest strategy, or control over time.

## Hand-written fake

```rust
pub trait Repo {
    fn get(&self, id: u64) -> Result<Option<User>, RepoError>;
    fn save(&self, user: &User) -> Result<(), RepoError>;
}

#[cfg(test)]
#[derive(Default)]
struct FakeRepo {
    users: std::sync::Mutex<std::collections::HashMap<u64, User>>,
}

#[cfg(test)]
impl Repo for FakeRepo {
    fn get(&self, id: u64) -> Result<Option<User>, RepoError> {
        Ok(self.users.lock().unwrap().get(&id).cloned())
    }
    fn save(&self, user: &User) -> Result<(), RepoError> {
        self.users.lock().unwrap().insert(user.id, user.clone());
        Ok(())
    }
}
```

A fake keeps real behaviour (what you save, you can read back), so tests check outcomes instead of call sequences. Prefer it over a mock whenever state is involved.

## mockall

```rust
#[cfg_attr(test, mockall::automock)]
pub trait Mailer {
    fn send(&self, to: &str, body: &str) -> Result<(), MailError>;
}

#[test]
fn sends_welcome_mail_once() {
    let mut mailer = MockMailer::new();
    mailer
        .expect_send()
        .withf(|to, _| to == "ama@example.com")
        .times(1)
        .returning(|_, _| Ok(()));

    signup(&mailer, "ama@example.com").unwrap();
}
```

- Expectations are checked when the mock is dropped; an unmet `times(1)` fails the test.
- Keep `mockall` in `[dev-dependencies]` and gate `automock` with `cfg_attr(test, ...)` so it never reaches release builds.
- If a mock needs more than three expectations, the unit is probably doing too much; consider a fake or a smaller seam.

## Injecting time

```rust
pub trait Clock { fn now(&self) -> std::time::SystemTime; }

struct FixedClock(std::time::SystemTime);
impl Clock for FixedClock { fn now(&self) -> std::time::SystemTime { self.0 } }
```

Pass the clock into the code under test rather than calling `SystemTime::now()` inside it.

## proptest strategies

```rust
use proptest::prelude::*;

fn order() -> impl Strategy<Value = Order> {
    (1u32..1000, prop::collection::vec("[a-z]{1,8}", 0..10))
        .prop_map(|(qty, tags)| Order { qty, tags })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(512))]

    #[test]
    fn order_round_trips_through_text(o in order()) {
        prop_assert_eq!(o.to_string().parse::<Order>().unwrap(), o);
    }
}
```

- Derive strategies for your own types with `prop_map` or, if the project uses it, `#[derive(Arbitrary)]` from `proptest-derive`.
- Use `prop_assume!` sparingly; filtering too many cases makes proptest give up.

## Async time control (tokio `test-util` feature)

```rust
#[tokio::test(start_paused = true)]
async fn retries_after_backoff() {
    let handle = tokio::spawn(fetch_with_retry());
    tokio::time::advance(std::time::Duration::from_secs(5)).await;
    assert!(handle.await.unwrap().is_ok());
}
```

With time paused, the runtime auto-advances to the next timer when every task is idle, so `sleep`-based code completes instantly and deterministically.

## Temporary files

```rust
let dir = tempfile::tempdir()?;           // removed when `dir` is dropped
let path = dir.path().join("config.toml");
std::fs::write(&path, "port = 8080")?;
```

Never write test files into the repository tree or a fixed path in `/tmp`.
