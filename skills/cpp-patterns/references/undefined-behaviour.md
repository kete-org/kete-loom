# Undefined behaviour: common cases and fixes

Read this when writing or reviewing code that does arithmetic on input, holds references or views, or shares data between threads.

## Lifetime and dangling

```cpp
// BAD: view into a temporary string
std::string_view name = get_name();   // get_name() returns std::string by value
use(name);                            // dangling

// GOOD
std::string name = get_name();
```

```cpp
// BAD: reference into a vector, then the vector grows
int& first = v[0];
v.push_back(42);    // may reallocate; `first` now dangles
first = 1;          // UB

// GOOD: re-index after growth, or reserve() first if the size is known
```

```cpp
// BAD: lambda outlives the locals it captured by reference
std::function<void()> make_cb() {
  int count = 0;
  return [&] { ++count; };   // dangling
}
// GOOD: capture by value, or move ownership in: [count = 0]() mutable { ++count; }
```

```cpp
// BAD: erasing while iterating
for (auto it = v.begin(); it != v.end(); ++it) if (bad(*it)) v.erase(it);
// GOOD (C++20)
std::erase_if(v, bad);
```

Range-for over a temporary's member is a classic trap before C++23 (P2718 extends the temporary's lifetime from C++23 on): `for (auto& x : make_obj().items())` dangles if `items()` returns a reference into the temporary. Bind the object to a named variable first.

## Arithmetic

- Signed overflow is UB; unsigned wraps. Check before adding untrusted values, or compute in a wider type.
- `x << n` with `n < 0` or `n >=` bit width is UB.
- Division or modulo by zero is UB, and `INT_MIN / -1` overflows.
- Converting a floating value outside the target integer's range is UB.
- Mixing signed and unsigned in comparisons gives wrong results (not UB, but a bug). `-Wsign-compare` and C++20 `std::cmp_less` help.

## Objects and types

- Reading an uninitialised scalar is UB. Use `T x{};`.
- `reinterpret_cast<float*>(&some_int)` then reading violates strict aliasing. Use `std::memcpy` or `std::bit_cast`.
- Deleting a derived object through a base pointer whose destructor isn't `virtual` is UB.
- Calling a virtual function from a constructor or destructor dispatches to the current class, not the derived one (defined, but almost always a bug).
- Dereferencing `nullptr`, a moved-from `unique_ptr`, or an empty `std::optional` with `*` is UB. Use `.value()` or check first.

## Concurrency

- Two threads accessing the same memory, at least one writing, without synchronisation is a data race and UB.
- `std::shared_ptr`'s control block is thread-safe; the pointed-to object is not.
- A detached `std::thread` that touches locals of the spawning scope dangles. Prefer `std::jthread` (C++20) or join explicitly.
- Static local initialisation is thread-safe; lazily initialised globals using a plain flag are not.

## Finding it

| Tool | Catches | Flag |
|---|---|---|
| AddressSanitizer | use-after-free, out-of-bounds, double free, leaks (LeakSanitizer, where supported) | `-fsanitize=address` |
| UndefinedBehaviorSanitizer | overflow, bad shifts, misaligned access, null deref, bad casts | `-fsanitize=undefined` |
| ThreadSanitizer | data races, lock-order inversions | `-fsanitize=thread` (separate build) |
| MemorySanitizer (Clang, Linux) | reads of uninitialised memory | `-fsanitize=memory` (needs all code instrumented) |

Add `-fno-omit-frame-pointer -g` for readable stack traces, and `-fno-sanitize-recover=undefined` so UBSan findings fail the run instead of only printing.
