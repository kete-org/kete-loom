---
name: fuzz-testing
description: Sets up coverage-guided fuzzing for parsers, decoders and native code: writing harnesses for libFuzzer, AFL++, cargo-fuzz, Go's built-in go test -fuzz and Python atheris, wiring the right sanitizer, seeding a corpus and dictionary, defeating coverage walls like checksums and magic bytes, then minimising and triaging crashes and wiring the fuzzer into CI or OSS-Fuzz. Use when hardening code that parses untrusted or attacker-controlled input, reproducing and shrinking a fuzzer-found crash, or adding continuous fuzzing to a build.
license: MIT
compatibility: Any Agent Skills host. Needs the toolchain for the target language (clang for libFuzzer, cargo-fuzz, Go 1.18+, or atheris) and a sanitizer-capable compiler.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Fuzz testing

Point a coverage-guided fuzzer at code that eats untrusted bytes and let it find the inputs you didn't think of. The target is a **deterministic function from bytes to behaviour**: a parser, decoder, deserialiser, state machine, or any routine on a trust boundary.

## 0. Pick the target and engine

1. Choose a function that (a) takes attacker-influenced input and (b) is deterministic — no network, clock or global state. Wrap away any non-determinism before fuzzing.
2. Match the engine to the language:

| Language | Engine | Harness entry |
|---|---|---|
| C / C++ | libFuzzer (`-fsanitize=fuzzer`) or AFL++ | `LLVMFuzzerTestOneInput(const uint8_t*, size_t)` |
| Rust | cargo-fuzz (libFuzzer under the hood) | `fuzz_target!(|data: &[u8]| { … })` |
| Go | native `go test -fuzz` (1.18+) | `func FuzzX(f *testing.F)` |
| Python | atheris | `atheris.Fuzz()` with a `TestOneInput(data)` |

Harness skeletons for each are in `references/harnesses.md`.

## 1. Write a thin harness

- Do the **least** work to turn bytes into a call: decode the bytes into the function's arguments, call it, return. No assertions about *correct* output — the fuzzer reports crashes, hangs, and sanitizer violations, not wrong answers (unless you add a check).
- For structured inputs, use a structure-aware decoder (`arbitrary` in Rust, a `FuzzedDataProvider` in C++/atheris) so bytes map to typed arguments instead of being rejected immediately.
- Keep it fast: no I/O, no logging per iteration. Throughput is coverage.
- Add targeted assertions only for invariants that must hold (a decoded length never exceeds the buffer, a roundtrip equals the input). These turn silent logic bugs into crashes the fuzzer can find.

## 2. Turn on a sanitizer

A crash is only useful if the bug surfaces. Build the target with:

- **ASan** (AddressSanitizer) — out-of-bounds, use-after-free, leaks. The default for memory-unsafe code.
- **UBSan** — integer overflow, bad shifts, invalid casts. Combine with ASan.
- **MSan** — uninitialised reads (C/C++; needs an instrumented libc, so harder).

Rust and Go catch memory safety themselves; still fuzz for panics, and use ASan for `unsafe` blocks. For atheris, build native extensions with `atheris_libfuzzer` / sanitizer flags to see C-level bugs.

## 3. Seed the corpus and dictionary

- **Seed corpus**: a handful of small, *valid* inputs (a real PNG, a real JSON doc). The fuzzer mutates from these, so good seeds reach deep code in minutes instead of days. Collect them from test fixtures or real samples.
- **Dictionary**: a file of interesting tokens (magic bytes, keywords, delimiters) the mutator splices in. Essential for formats with fixed markers. libFuzzer/AFL++ `-dict=file`; one `token="…"` per line.
- Minimise the seed corpus once it grows: `cargo fuzz cmin` / libFuzzer `-merge=1` keeps one input per unique coverage edge.

## 4. Get past coverage walls

The fuzzer stalls when a branch needs an exact value it can't guess:

- **Magic bytes / signatures** → put them in the dictionary and the seed corpus.
- **Checksums / CRCs / length prefixes** → the mutated body no longer matches the stored checksum, so everything is rejected at the gate. Either (a) patch the check out behind a `FUZZING` build flag, or (b) recompute the checksum inside the harness after mutation so the body reaches the parser. Note it clearly; never ship the patched build.
- **Compression / encryption layers** → fuzz the layer underneath, or decompress in the harness before the call.
- Watch the coverage counter; if it plateaus, a wall is the usual cause.

## 5. Triage and minimise a crash

1. **Reproduce**: run the harness on the single crashing input; confirm it crashes deterministically. A flaky crash means non-determinism leaked into the target — fix the harness first.
2. **Minimise**: shrink the input to the smallest that still crashes (`cargo fuzz tmin`, libFuzzer `-minimize_crash=1`, Go writes the minimised input to `testdata/fuzz/`).
3. **Read the sanitizer report**: the top frames and the access type (read/write, heap/stack) locate the bug.
4. **Classify**: memory corruption and OOB writes are usually security-critical; a `panic`/assert may be a DoS; an OOM/timeout is a resource bug. Deduplicate by crash site, not by input.
5. **Fix the root cause**, then add the minimised input as a permanent regression test (Go uses it automatically from `testdata/fuzz`; others: commit it to the corpus).

## 6. Keep it running

- **CI**: run each fuzzer for a bounded time on every change (`go test -fuzz=Fuzz -fuzztime=60s`, `cargo fuzz run target -- -max_total_time=60`), seeded from the committed corpus, failing the build on any new crash. This is regression fuzzing, not discovery.
- **OSS-Fuzz / continuous**: for open-source or long-running campaigns, run the fuzzer for hours or days on dedicated infrastructure and feed crashes back as regression tests.

## Stop and ask

- Before patching out a checksum or auth check to improve coverage — confirm the build flag can never reach production.
- If the target does I/O, touches shared state, or needs a live service, fuzzing results will be noise; raise it rather than fuzzing a non-deterministic target.

## Report back

End with: the target and engine, sanitizers enabled, seed/dictionary used, exec/s and coverage reached, every distinct crash (minimised input + sanitizer summary + classification), fixes made, and how the fuzzer now runs in CI.
