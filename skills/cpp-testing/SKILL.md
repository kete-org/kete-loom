---
name: cpp-testing
description: Writes and runs C++ unit tests with GoogleTest or Catch2 - test fixtures, parameterised cases, gMock mocks behind interfaces, CTest registration via gtest_discover_tests or catch_discover_tests, and running the suite under AddressSanitizer and UBSan. Use when adding tests to a C++ codebase, wiring a test framework into CMake and CTest, mocking a C++ dependency, or chasing a flaky or crashing C++ test.
license: MIT
compatibility: Any Agent Skills host. Needs CMake with CTest and a C++ compiler; GoogleTest or Catch2 is fetched or found by CMake.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "cmake, ctest"
  kete-loom/owner: "Kete-org"
---

# C++ testing

Tests that build with the project, register with CTest, and run clean under sanitizers.

## 0. Before you start

1. Find the existing framework: search `CMakeLists.txt` files for `GTest`, `gtest_discover_tests`, `Catch2`, `catch_discover_tests`, `doctest` or `add_test`. **Use what the project already uses.** Only pick a framework when there is none, and then ask the user: GoogleTest (+ gMock) if they need mocking, Catch2 v3 if they prefer BDD-style sections.
2. Configure, build and run the current suite once: `cmake -S . -B build && cmake --build build && ctest --test-dir build --output-on-failure`. If it already fails, **stop and tell the user** which tests fail before changing anything.
3. List the behaviours to cover as concrete input -> expected output examples, including the error path.

## 1. Wire the framework into CMake (only if missing)

GoogleTest with FetchContent (pin a release tag or commit hash):

```cmake
include(FetchContent)
FetchContent_Declare(googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG <release-tag>)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)  # MSVC: match the project's runtime
FetchContent_MakeAvailable(googletest)

enable_testing()
add_executable(core_tests tests/parser_test.cpp)
target_link_libraries(core_tests PRIVATE core GTest::gtest_main GTest::gmock)
include(GoogleTest)
gtest_discover_tests(core_tests)
```

Catch2 v3 (installed via vcpkg/Conan, or FetchContent):

```cmake
find_package(Catch2 3 REQUIRED)
enable_testing()
add_executable(core_tests tests/parser_test.cpp)
target_link_libraries(core_tests PRIVATE core Catch2::Catch2WithMain)
include(Catch)
catch_discover_tests(core_tests)
```

`enable_testing()` must be in the top-level `CMakeLists.txt` (or `include(CTest)`), or `ctest` finds nothing. Link tests against the library target under test; do not recompile its sources into the test binary.

## 2. Write tests

GoogleTest essentials:

- `TEST(Suite, Name)` for plain tests; `TEST_F(Fixture, Name)` when several tests share setup. The fixture derives from `::testing::Test` and uses `SetUp()`/`TearDown()` or its constructor/destructor.
- `EXPECT_*` keeps going after a failure; `ASSERT_*` stops the test. Use `ASSERT_*` when later lines would crash (null pointer, empty container).
- Floating point: `EXPECT_DOUBLE_EQ` or `EXPECT_NEAR(a, b, tol)`, never `EXPECT_EQ`.
- Exceptions: `EXPECT_THROW(stmt, Type)`, `EXPECT_NO_THROW(stmt)`.
- Table tests: `TEST_P` with `INSTANTIATE_TEST_SUITE_P(Name, Fixture, ::testing::Values(...))`.

Catch2 essentials:

- `TEST_CASE("parser rejects empty input", "[parser]")` with `SECTION`s; each section re-runs the setup above it.
- `REQUIRE` stops, `CHECK` continues. Floats: `REQUIRE_THAT(x, Catch::Matchers::WithinRel(1.0, 1e-6))`.
- Data-driven: `auto n = GENERATE(0, 1, 255);`.

Both: test through the public header, one behaviour per test, names that read as a sentence about behaviour.

## 3. Mock with gMock (only at boundaries)

gMock mocks virtual functions, so the dependency needs an interface:

```cpp
class Clock { public: virtual ~Clock() = default; virtual std::int64_t now_ms() const = 0; };

class MockClock : public Clock {
 public:
  MOCK_METHOD(std::int64_t, now_ms, (), (const, override));
};

TEST(RateLimiter, RejectsSecondCallInSameWindow) {
  ::testing::NiceMock<MockClock> clock;
  ON_CALL(clock, now_ms()).WillByDefault(::testing::Return(1000));
  RateLimiter limiter{clock, /*per_second=*/1};
  EXPECT_TRUE(limiter.try_acquire());
  EXPECT_FALSE(limiter.try_acquire());
}
```

- Use `EXPECT_CALL(...).Times(n)` only when the call itself is the behaviour under test; otherwise `ON_CALL` + `NiceMock` keeps tests from breaking on harmless refactors.
- Mock the clock, network, filesystem and other slow or external boundaries. Never mock the class under test, and do not add an interface to a value type just to mock it.
- If adding an interface would change a public API, **stop and ask the user** first; a template parameter or a constructor-injected `std::function` may be less invasive.

## 4. Run tests

- All: `ctest --test-dir build --output-on-failure -j 8`.
- Filter by CTest name: `ctest --test-dir build -R Parser`.
- Directly: `./build/core_tests --gtest_filter='Parser.*'` or `./build/core_tests "[parser]"`.
- Flakiness: `--gtest_repeat=100 --gtest_shuffle`, or `ctest --repeat until-fail:50 -R <name>`.

## 5. Run under sanitizers

Build a separate sanitizer tree so the normal build stays fast:

```sh
cmake -S . -B build-asan -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -fno-sanitize-recover=undefined" \
  -DCMAKE_EXE_LINKER_FLAGS="-fsanitize=address,undefined" \
  -DCMAKE_SHARED_LINKER_FLAGS="-fsanitize=address,undefined"
cmake --build build-asan
ASAN_OPTIONS=detect_leaks=1 ctest --test-dir build-asan --output-on-failure
```

If the project already has a sanitizer option or preset, use that instead. For concurrent code, repeat with `-fsanitize=thread` in another build tree (TSan cannot be combined with ASan). LeakSanitizer is on by default on Linux; Apple Clang on macOS may not support `detect_leaks=1`, so drop it there and say leaks were not checked. A sanitizer report is a real bug: fix the code, not the test. If the `cpp-patterns` skill is installed, its undefined-behaviour reference lists the common causes.

## Rules

- Never delete, disable (`DISABLED_`, `[.]`, `GTEST_SKIP()`) or loosen an existing test to get green without the user's agreement.
- No sleeps for synchronisation; use a mocked clock, a latch or a condition variable with a timeout.
- No real network, no dependency on test order, no writing outside a temporary directory (`std::filesystem::temp_directory_path()`).
- Death tests (`EXPECT_DEATH`) only for genuine abort paths, and name the suite `*DeathTest`.
- If you can't get to green after three focused attempts, stop and report what you tried and the exact failure.

## Report back

End with: tests added (suite and name), the build and `ctest` commands you ran, pass/fail counts for the normal and sanitizer runs, and any behaviours left untested.
