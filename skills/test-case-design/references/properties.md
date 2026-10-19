# Property catalogue and libraries

Pick properties strongest-first. Each entry: when it applies and the shape of the assertion.

## The catalogue

| Property | Shape | Good for |
|---|---|---|
| Roundtrip | `decode(encode(x)) == x` | serialisers, parsers, codecs, compression |
| Inverse | `f_inv(f(x)) == x` | any paired transform |
| Oracle / model | `f(x) == slow_reference(x)` | optimised code vs brute force; refactor vs old code |
| Invariant | `P(f(x))` always holds | sort ordered + same multiset; balance ≥ 0; tree stays balanced |
| Idempotence | `f(f(x)) == f(x)` | normalise, dedupe, save, format, clamp |
| Commutativity | `f(a,b) == f(b,a)` | merge, union, addition |
| Metamorphic | change input → known change in output | add item → count+1; scale prices → total scales |
| Fuzz / no-crash | `f(x)` never throws on valid input | last resort; weak unless paired with a postcondition |

## Avoid

- **Tautological**: the property recomputes the result the same way the code does. Both carry the same bug, so it never fails. Use an independent oracle instead.
- **Vacuous**: a precondition or `assume`/`filter` discards most generated inputs, so the property almost never runs. Watch the library's discard/example count; generate valid inputs directly rather than filtering.

## Libraries

**Python — Hypothesis**
```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sort_roundtrip(xs):
    assert sorted(sorted(xs)) == sorted(xs)      # idempotence
    assert len(sorted(xs)) == len(xs)            # invariant
```
Tune domains with strategies (`st.integers(min_value=…)`, `st.text(alphabet=…)`). A found failure is saved to `.hypothesis/` and replayed; copy it into an example test.

**JS / TS — fast-check**
```ts
import fc from 'fast-check';
fc.assert(fc.property(fc.array(fc.integer()), xs =>
  JSON.parse(JSON.stringify(xs)).length === xs.length));
```
Set `{ seed, numRuns }` for reproducibility; `fc.pre(cond)` for preconditions (watch the discard rate).

**Rust — proptest**
```rust
proptest! {
  #[test]
  fn roundtrip(x in any::<MyType>()) {
    prop_assert_eq!(decode(&encode(&x)), x);
  }
}
```
Failing inputs are persisted to `proptest-regressions/`.

**Java / Kotlin — jqwik**
```java
@Property
void roundtrip(@ForAll("models") Model m) {
  assertThat(parse(render(m))).isEqualTo(m);
}
```
Use `@Provide` generators; `@StatisticsReport` to confirm the input distribution is not degenerate.

Across all libraries: fix the seed in CI, size the generators to the real domain, and promote every shrunk counterexample to a permanent example test.
