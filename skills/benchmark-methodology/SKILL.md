---
name: benchmark-methodology
description: Designs and runs performance benchmarks whose numbers hold up, with warmup, enough iterations, medians and p95/p99 with spread, a quiet and pinned machine, interleaved before/after comparison with a significance check, and guards against dead-code elimination and other microbenchmark traps in Go, JMH, BenchmarkDotNet, Criterion, pytest-benchmark and JS. Use when measuring whether a change made code faster or slower, writing a microbenchmark, or judging a performance claim.
license: MIT
compatibility: Any Agent Skills host. Needs the project's language toolchain; hyperfine is optional for command-level timing.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Benchmark methodology

A benchmark is an experiment. Its job is to answer one question ("is B faster than A for this workload, by how much, and are we sure?") with numbers someone else can reproduce. Most bad benchmarks measure the wrong thing, too few times, on a noisy machine.

## 1. Write down the question

Before any code, state:

1. **What is measured**: a function, an endpoint, a CLI command, a whole job.
2. **The metric**: latency per operation, throughput, allocations, peak memory, startup time.
3. **The workload**: realistic input sizes and shapes. Use production-like data, not `n = 10`. If you don't know the real sizes, **ask the user**.
4. **The decision**: what result would change what we do ("ship if p95 improves by 10 % or more with no regression in allocations").

If the user wants to know why the app is slow rather than compare versions, profile first (CPU profiler, flame graph) and benchmark the hot spot after.

## 2. Pick the level and the tool

- **Microbenchmark** (a function, nanoseconds to milliseconds): use the language harness, never a hand-rolled timer loop. See `references/language-harnesses.md`.
- **Command or process** (a CLI, a build step): `hyperfine --warmup 3 --runs 20 'old-cmd' 'new-cmd'`; add `--prepare` to reset caches or state between runs and `--export-json` to keep raw data.
- **Service** (an HTTP endpoint): a load tool at a fixed request rate, measuring latency percentiles at that rate. Measuring at maximum throughput hides latency problems.

## 3. Control the environment

- Same machine, same build flags (release / optimised), same runtime version, same input for A and B.
- Close other heavy work. On laptops, plug in power and disable low-power modes. In CI, shared runners are noisy: use a dedicated runner, or only trust large differences.
- Where possible, disable CPU frequency boost and pin to cores (Linux: `taskset -c 2 <cmd>`). Record if you could not.
- Warm up: JIT compilation, caches, connection pools and lazy initialisation make first runs slow. Discard warmup iterations, or measure cold start separately on purpose.
- Note the hardware, OS, runtime version and commit for every run.

## 4. Run enough and keep the raw data

- At least 10 samples per variant for microbenchmarks the harness doesn't already repeat (Go: `-count=10`); 20 or more for noisy ones.
- **Interleave** A and B (A, B, A, B...) or alternate whole runs so thermal drift and background jobs hit both equally. Never run all of A in the morning and all of B after lunch.
- Keep the raw samples, not only the mean.

## 5. Summarise honestly

- Report the **median** and **p95 / p99** for latency; the mean hides tail latency and is pulled by outliers.
- Report spread: standard deviation, median absolute deviation or a confidence interval.
- Compare with a significance test, not by eye. Go: `benchstat old.txt new.txt`. JMH and BenchmarkDotNet print error margins; differences inside the error bars are noise. For raw samples, a Mann-Whitney U test is a safe default.
- Say "no measurable difference" when that is the result. A 2 % change with 5 % noise is not a win.
- Check memory too: allocations per op (`-benchmem` in Go, `[MemoryDiagnoser]` in BenchmarkDotNet, `-prof gc` in JMH). A faster version that allocates far more may be slower in production.

## 6. Microbenchmark traps

Check each before trusting a number:

1. **Dead-code elimination**: the compiler removes work whose result is unused. Consume results (`Blackhole` in JMH, `std::hint::black_box` in Rust, return the value from a BenchmarkDotNet method, `b.Loop()` in Go 1.24+).
2. **Constant folding**: inputs known at compile time get precomputed. Load inputs from a variable or setup step.
3. **Measuring setup**: allocating the input inside the timed region. Do setup outside it.
4. **Caches too warm**: the same small input every iteration stays in L1 and branch predictors learn it. Use realistic sizes and varied data.
5. **Timer resolution**: timing a 20 ns operation once is noise; harnesses batch iterations for this reason.
6. **GC and JIT pauses** landing in one variant only. Run long enough and check variance.
7. **Debug builds**: `cargo bench` and `go test -bench` optimise by default; for C and C++ check optimisation flags (`-O2`, CMake `Release`), for .NET build with `-c Release`; on the JVM, use JMH so the JIT has warmed up.

Language-specific details and example code are in `references/language-harnesses.md`.

## Rules

- Never claim a speed-up from a single run, a debug build, or a different input.
- Never tune the benchmark until it shows the result you hoped for; fix the method, then accept the answer.
- Never commit benchmark code that makes network calls or depends on wall-clock time of day.
- If results contradict across runs, **stop and report the noise** instead of picking the best run.

## Report back

```
Question: <what was compared, workload>
Environment: <CPU, OS, runtime version, commit A, commit B, noise controls>
Method: <tool, warmup, samples per variant, interleaved yes/no>
Results:
| Variant | median | p95 | spread | allocs/op |
Verdict: <B is X% faster (p < 0.05) | no measurable difference | B regressed>
Caveats: <what could still skew it>
Commands: <exact commands to reproduce>
```
