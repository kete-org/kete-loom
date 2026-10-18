# CMake warnings, sanitizers and clang-tidy

Read this when setting up a new C++ project or adding sanitizer and lint builds to an existing one.

## Warnings as a reusable interface target

```cmake
add_library(project_warnings INTERFACE)
if(MSVC)
  target_compile_options(project_warnings INTERFACE /W4 /permissive-)
else()
  target_compile_options(project_warnings INTERFACE
    -Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wsign-conversion -Wnon-virtual-dtor)
endif()

target_link_libraries(core PRIVATE project_warnings)
```

Turn warnings into errors in CI only (`-Werror` / `/WX`, or CMake's `CMAKE_COMPILE_WARNING_AS_ERROR` on CMake 3.24+), so a new compiler version cannot break a developer's local build.

## Sanitizer option

```cmake
option(ENABLE_SANITIZERS "Build with ASan and UBSan" OFF)
if(ENABLE_SANITIZERS AND NOT MSVC)
  add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer -fno-sanitize-recover=undefined)
  add_link_options(-fsanitize=address,undefined)
endif()
# add_compile_options is deliberate here: every target, including fetched dependencies, must be instrumented.
```

MSVC supports AddressSanitizer with `/fsanitize=address`; it has no UBSan. Configure: `cmake -S . -B build-asan -DENABLE_SANITIZERS=ON -DCMAKE_BUILD_TYPE=Debug`.

Useful runtime options:

- `ASAN_OPTIONS=detect_leaks=1:abort_on_error=1` (LeakSanitizer is on by default on Linux; Apple Clang on macOS may not support it, so drop `detect_leaks=1` there if ASan rejects it)
- `UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=1`
- `TSAN_OPTIONS=halt_on_error=1`

## CMakePresets.json

```json
{
  "version": 3,
  "configurePresets": [
    { "name": "debug", "binaryDir": "build/debug", "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug" } },
    { "name": "asan", "inherits": "debug", "binaryDir": "build/asan", "cacheVariables": { "ENABLE_SANITIZERS": "ON" } },
    { "name": "release", "binaryDir": "build/release", "cacheVariables": { "CMAKE_BUILD_TYPE": "Release" } }
  ],
  "buildPresets": [
    { "name": "debug", "configurePreset": "debug" },
    { "name": "asan", "configurePreset": "asan" }
  ],
  "testPresets": [
    { "name": "asan", "configurePreset": "asan", "output": { "outputOnFailure": true } }
  ]
}
```

Run: `cmake --preset asan && cmake --build --preset asan && ctest --preset asan`.

## clang-tidy

A starting `.clang-tidy` (only add one if the project has none and the user agrees):

```yaml
Checks: >
  -*,
  bugprone-*,
  cppcoreguidelines-*,
  modernize-*,
  performance-*,
  readability-*,
  -modernize-use-trailing-return-type,
  -readability-identifier-length,
  -cppcoreguidelines-avoid-magic-numbers,
  -readability-magic-numbers
WarningsAsErrors: ''
HeaderFilterRegex: '/(include|src)/'
```

Header names are usually absolute paths, so do not anchor the regex with `^`. Run on changed files (skipping deleted ones): `clang-tidy -p build $(git diff --name-only --diff-filter=d -- '*.cpp' '*.hpp')`. To run during the build instead, set `CMAKE_CXX_CLANG_TIDY` to `clang-tidy` (slows builds; best in a dedicated CI preset).

## Dependencies

- **vcpkg (manifest mode):** a `vcpkg.json` lists dependencies; configure with `-DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake`, then `find_package(fmt CONFIG REQUIRED)` and link the imported target (`fmt::fmt`).
- **Conan 2:** a `conanfile.txt` or `conanfile.py` with the `CMakeDeps` and `CMakeToolchain` generators; run `conan install . --build=missing`, then configure CMake with the generated `conan_toolchain.cmake` (its folder depends on the layout; Conan prints it).
- **FetchContent:** good for test frameworks and small header-only libraries; pin a tag or commit hash, never a moving branch.
