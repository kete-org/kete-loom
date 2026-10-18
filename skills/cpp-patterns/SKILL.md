---
name: cpp-patterns
description: Modern C++ (17/20/23) house rules for writing and restructuring code - RAII for every resource, unique_ptr/shared_ptr ownership, value semantics and the rule of zero, const-correctness, steering clear of undefined behaviour, concepts used sparingly, target-based CMake, plus sanitizer and clang-tidy setup. Use when writing new C++ code, modernising legacy C++98/03 code, deciding who owns an object, or setting up a CMake project with warnings, sanitizers and clang-tidy.
license: MIT
compatibility: Any Agent Skills host. Needs a C++17-or-later compiler (GCC, Clang or MSVC) and CMake for the build sections.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "cmake"
  kete-loom/owner: "Kete-org"
---

# Modern C++ patterns

Write C++ where ownership is visible in the types, resources clean themselves up, and the compiler plus sanitizers catch what review misses.

## 0. Before you write code

1. Find the language standard the project builds with: `CMAKE_CXX_STANDARD` or `target_compile_features(... cxx_std_NN)` in `CMakeLists.txt`, `-std=` in compile flags, or `compile_commands.json`. Never use a feature newer than that standard.
2. Match the project's existing conventions (naming, error style, exceptions on or off, header layout). If the codebase builds with `-fno-exceptions`, do not introduce `throw`.
3. If the change would alter a public header used by other libraries or shipped as a binary SDK, **stop and ask the user**: it may be an ABI break.

## 1. Ownership and RAII

Decision rules, in order:

1. **Store by value** when the object has one owner and a known type. `std::vector<Widget>`, not `std::vector<Widget*>`.
2. **`std::unique_ptr<T>`** for single ownership of a heap object (polymorphic types, pimpl, large or optional objects). Create with `std::make_unique<T>(...)`.
3. **`std::shared_ptr<T>`** only when ownership is genuinely shared and lifetimes cannot be ordered. Create with `std::make_shared`. Break cycles with `std::weak_ptr`.
4. **Raw pointer or reference = non-owning.** `T&` when it cannot be null, `T*` when it can. A raw pointer never gets `delete`d by the code that receives it.
5. **Views do not own.** `std::string_view` and `std::span` must not outlive the buffer they point into; never return one that points at a local or a temporary.

Every resource (file handle, socket, lock, OS handle, C library object) is wrapped in an object whose destructor releases it:

```cpp
struct FileCloser { void operator()(std::FILE* f) const noexcept { if (f) std::fclose(f); } };
using File = std::unique_ptr<std::FILE, FileCloser>;

File open_file(const char* path) { return File{std::fopen(path, "rb")}; }
```

Locks: `std::scoped_lock` (C++17) or `std::lock_guard`; `std::unique_lock` when you must unlock early or wait on a `std::condition_variable`. Never manual `lock()`/`unlock()`.

Never write: naked `new`/`delete` in application code, `malloc`/`free` for C++ objects, `delete this`, `std::auto_ptr`, or a `shared_ptr` passed by value into a function that only reads it (pass `const T&` instead).

## 2. Value semantics and special members

- **Rule of zero:** if members are RAII types, declare no destructor, copy or move operations. The compiler-generated ones are correct.
- **Rule of five:** if you must write one of destructor / copy ctor / copy assign / move ctor / move assign, write or `= delete` all five.
- Mark move constructors and move assignment `noexcept`. A copyable type whose move constructor is not `noexcept` gets copied, not moved, when `std::vector` reallocates.
- Pass parameters: cheap types (ints, pointers, `string_view`, `span`) by value; read-only larger objects by `const T&`; sink parameters (the callee keeps a copy) by value then `std::move` into place.
- Return by value. Do not write `return std::move(local);`; it blocks copy elision.
- Never use an object after `std::move` from it except to assign to it or destroy it.
- Make single-argument constructors `explicit` unless implicit conversion is the point.

## 3. Const-correctness

- Variables are `const` (or `constexpr`) unless they are mutated.
- Member functions that do not change observable state are `const`. `mutable` only for caches and mutexes.
- Prefer `constexpr` functions and `static_assert` for things knowable at compile time.
- Mark functions `[[nodiscard]]` when ignoring the result is almost always a bug (error codes, `expected`-style results, factory functions).

## 4. Avoiding undefined behaviour

Check each of these in code you write or touch. Details and examples: `references/undefined-behaviour.md`.

- Signed integer overflow, shifting by >= the bit width, and division by zero.
- Out-of-bounds indexing: use `.at()` in non-hot code, range-for, or `std::span`; check indices from input.
- Dangling references: returning a reference or view to a local, lambdas capturing locals by reference that outlive the scope, iterators or references into a `vector` after `push_back`/`insert`/`erase`.
- Uninitialised variables: initialise at declaration (`int n{};`, `T x = make();`).
- Strict aliasing and type punning: use `std::memcpy` or `std::bit_cast` (C++20), not `reinterpret_cast` between unrelated types.
- Data races: any variable written by one thread and read by another needs a mutex or `std::atomic`.
- Deleting through a pointer to a polymorphic base class whose destructor is neither `virtual` nor `protected`.

## 5. Errors

- Follow the project's existing strategy. If none: exceptions for errors the immediate caller cannot handle, return values for expected failures (`std::optional`, `std::expected` in C++23, or the project's own result type).
- Destructors, move operations and `swap` are `noexcept` and never throw.
- Give every function the strong or basic exception guarantee: on throw, state is unchanged or still valid, and nothing leaks (RAII makes this automatic).

## 6. Templates and concepts in moderation

- Write a plain function or class first. Add a template only when there are two real call sites with different types.
- In C++20, constrain templates with standard concepts (`std::integral`, `std::ranges::range`) or a short named `concept`, instead of `enable_if`.
- Keep template definitions in headers. No template metaprogramming where `if constexpr` or an overload does the job.
- Prefer standard algorithms and ranges (`std::ranges::sort`, `std::ranges::find_if`) over hand-written loops when they read more clearly.

## 7. Project structure and CMake

Use target-based CMake; never set flags globally with `CMAKE_CXX_FLAGS` edits or `include_directories()`.

```cmake
cmake_minimum_required(VERSION 3.20)
project(app LANGUAGES CXX)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_library(core src/core.cpp)
target_include_directories(core PUBLIC include)
target_compile_features(core PUBLIC cxx_std_20)

add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE core)
```

- Layout: `include/<project>/` public headers, `src/` sources and private headers, `tests/` tests.
- `PUBLIC` when consumers need it (it appears in your headers), `PRIVATE` when only your `.cpp` files need it.
- Get dependencies with `find_package` (fed by vcpkg or Conan) or `FetchContent`; do not vendor copies.
- Out-of-source builds only: `cmake -S . -B build && cmake --build build`.

Warnings, sanitizers, clang-tidy and a `CMakePresets.json` example: `references/cmake-and-tooling.md`.

## 8. Tooling loop

1. Build with warnings on: GCC/Clang `-Wall -Wextra -Wpedantic -Wshadow -Wconversion`, MSVC `/W4`. Treat new warnings in touched files as errors.
2. Run the tests under AddressSanitizer + UndefinedBehaviorSanitizer (`-fsanitize=address,undefined -fno-omit-frame-pointer`). Run ThreadSanitizer (`-fsanitize=thread`) in a **separate** build for concurrent code; it cannot be combined with ASan.
3. Run `clang-tidy` on changed files using `compile_commands.json` (`clang-tidy -p build <files>`). Fix findings in code you touched; do not mass-fix the rest of the codebase unasked.
4. Format with the project's `.clang-format` if one exists (`clang-format -i <files>`). Do not add one unasked.

## Rules

- Never silence a warning or sanitizer report with a cast, pragma or suppression file without explaining the root cause to the user.
- Never change a public header's layout, virtual functions or inline functions in a shipped library without asking (ABI).
- Do not modernise unrelated code in the same change. Keep diffs focused.
- If you cannot build the project locally, say so; do not claim code compiles.

## Report back

End with: files changed, the build and test commands you ran (with sanitizer flags), their results, and any warnings or clang-tidy findings left unresolved.
