---
name: cpp
description: Always-on rules for modern C++ code, covering ownership and RAII, undefined behaviour, bounds and lifetimes, concurrency, headers, and sanitizer-backed build and test checks.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.cpp, **/*.cc, **/*.cxx, **/*.c++, **/*.hpp, **/*.hh, **/*.hxx, **/*.h, **/*.ipp, **/*.ixx, **/*.cppm"
  kete-loom/owner: "Kete-org"
---

- Write to the C++ standard the project's build sets; do not use features newer than it.
- Manage every resource with RAII. Never use raw `new`/`delete` for ownership; use `std::make_unique`, `std::make_shared` or a container.
- Use `std::unique_ptr` by default; reach for `std::shared_ptr` only for genuinely shared ownership. Raw pointers and references never own.
- Follow the rule of zero; if you write one of destructor, copy or move operations, define or delete all five.
- Never return or store a reference, pointer, `std::string_view` or `std::span` to a local or temporary that will die first.
- Never use an iterator, pointer or reference into a container after an operation that may invalidate it, such as `push_back` or `erase`.
- Check bounds on untrusted indices; never index past the end. Prefer `std::array`, `std::vector` and `std::string` over C arrays and `char*` buffers.
- Never use `strcpy`, `sprintf`, `gets` or other unbounded C string functions.
- Initialize every variable, and avoid signed overflow, unchecked narrowing and C-style casts; use `static_cast` and friends.
- Guard all shared mutable state with `std::mutex` and `std::lock_guard`/`std::scoped_lock`, or `std::atomic`; a data race is undefined behaviour.
- Mark functions `noexcept` only when they truly cannot throw, and destructors must never throw.
- Mark overriding functions `override`, give polymorphic bases a virtual or protected destructor, and make single-argument constructors `explicit`.
- Never put `using namespace` in a header; use include guards or `#pragma once` as the project does.
- Build with warnings on (for example `-Wall -Wextra`) and fix them; run tests under AddressSanitizer and UndefinedBehaviorSanitizer (`-fsanitize=address,undefined`) when the toolchain supports them.
- Use the project's configured build system, formatter and test framework.

For more, load the cpp-patterns and cpp-testing skills.
