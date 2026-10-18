# Benchmark harnesses by language

Read this when writing a microbenchmark. Use the harness the project already has; add a new one only with the user's agreement.

## Go (`testing`)

```go
func BenchmarkParse(b *testing.B) {
    input := loadFixture(b) // setup is outside the timed loop with b.Loop
    for b.Loop() {
        Parse(input)
    }
}
```

- `b.Loop()` (Go 1.24+) times only the loop body and stops the compiler from optimising the body away. On older Go, use `for i := 0; i < b.N; i++`, call `b.ResetTimer()` after setup, and assign results to a package-level sink variable.
- Run: `go test -run '^$' -bench BenchmarkParse -benchmem -count=10 ./pkg/parse > new.txt`.
- Compare: `go install golang.org/x/perf/cmd/benchstat@latest`, then `benchstat old.txt new.txt`. It prints the change with a p-value; "~" means no significant difference.
- Pitfalls: `-run '^$'` stops unit tests from running alongside; `-cpu 1,4` shows scaling.

## Java and Kotlin (JMH)

```java
@State(Scope.Benchmark)
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@Warmup(iterations = 5) @Measurement(iterations = 10) @Fork(3)
public class ParseBench {
    String input;
    @Setup public void setup() { input = Fixtures.load(); }
    @Benchmark public void parse(Blackhole bh) { bh.consume(Parser.parse(input)); }
}
```

- Never benchmark the JVM with `System.nanoTime()` loops: JIT tiers, on-stack replacement and dead-code elimination make them meaningless.
- `@Fork` of 2 or more runs separate JVMs so one JIT profile doesn't decide the result.
- `-prof gc` reports allocation rate; `-prof async` (async-profiler) shows where time goes.
- Use `@Param` for input sizes so you see how cost scales.

## C# / .NET (BenchmarkDotNet)

```csharp
[MemoryDiagnoser]
public class ParseBench {
    private string _input = default!;
    [GlobalSetup] public void Setup() => _input = Fixtures.Load();
    [Benchmark(Baseline = true)] public Result Old() => OldParser.Parse(_input);
    [Benchmark] public Result New() => NewParser.Parse(_input);
}
// Program.cs: BenchmarkRunner.Run<ParseBench>();
```

- Run in Release: `dotnet run -c Release`. BenchmarkDotNet warns when it detects a debug build or an attached debugger.
- Return the result from the method so it isn't eliminated.
- `Baseline = true` adds a Ratio column for before/after.

## Rust (Criterion or `cargo bench`)

```rust
use criterion::{criterion_group, criterion_main, Criterion};
use std::hint::black_box;

fn bench(c: &mut Criterion) {
    let input = load_fixture();
    c.bench_function("parse", |b| b.iter(|| parse(black_box(&input))));
}
criterion_group!(benches, bench);
criterion_main!(benches);
```

- Needs `[[bench]] name = "parse" harness = false` in `Cargo.toml`.
- Criterion saves a baseline and reports change and significance against the previous run; `cargo bench -- --save-baseline before` then `--baseline before` compares named baselines.
- `black_box` on inputs prevents constant folding; Criterion handles the output.

## Python (pytest-benchmark, pyperf, timeit)

```python
def test_parse(benchmark):
    data = load_fixture()
    result = benchmark(parse, data)
    assert result.ok
```

- Run: `pytest --benchmark-only --benchmark-autosave`, then compare saved runs with `pytest-benchmark compare`.
- For stand-alone scripts, `pyperf` handles warmup, multiple processes and system tuning advice (`python -m pyperf system tune` on Linux).
- `python -m timeit -s 'setup' 'stmt'` is fine for a quick check, not for a decision.
- Interpreter version matters a lot between releases; record it.

## JavaScript and TypeScript (tinybench, mitata, Vitest bench)

```ts
import { Bench } from 'tinybench';
const bench = new Bench({ time: 1000 }); // warmup option names differ between tinybench majors; check the installed version's docs
const input = loadFixture();
bench.add('old', () => oldParse(input)).add('new', () => newParse(input));
await bench.run();
console.table(bench.table());
```

- V8 optimises and deoptimises based on observed types; feed realistic, varied inputs or one shape will look unrealistically fast.
- Keep the result reachable (return it, or push into an array checked after the run).
- Vitest has `bench()` in `*.bench.ts` files, run with `npx vitest bench`.
- Node version and flags change results; record `node --version`.

## C and C++ (Google Benchmark)

```cpp
static void BM_Parse(benchmark::State& state) {
  auto input = LoadFixture();
  for (auto _ : state) benchmark::DoNotOptimize(Parse(input));
}
BENCHMARK(BM_Parse);
BENCHMARK_MAIN();
```

- Build with optimisations (`-O2` or `-DCMAKE_BUILD_TYPE=Release`); the library warns if it was built as debug.
- `--benchmark_repetitions=10 --benchmark_report_aggregates_only=true` gives mean, median and stddev.
- `benchmark::ClobberMemory()` forces pending writes to be treated as observable.

## Commands and processes (hyperfine)

```sh
# build both versions first (e.g. ./old-bin from main, ./new-bin from the branch)
hyperfine --warmup 3 --runs 30 --export-json bench.json \
  './old-bin input.txt' './new-bin input.txt'
```

- `--prepare 'cmd'` runs before each timing run (for example, clearing a cache directory).
- Never put state-changing commands (`git stash`, `git checkout`) inside a timed command; build each variant once, then time the binaries.
- hyperfine reports mean, standard deviation, min/max and a relative comparison; it warns about statistical outliers.
