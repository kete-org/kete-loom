---
name: go-testing
description: Writes and fixes Go tests with the standard testing package, including table-driven tests with t.Run subtests, t.Helper and t.Cleanup, httptest servers and recorders, hand-written fakes instead of mock frameworks, the race detector, native fuzzing, benchmarks and golden files. Use when adding or repairing _test.go files, making flaky Go tests deterministic, testing an HTTP handler or client in Go, or writing a Go fuzz target or benchmark.
license: MIT
compatibility: Any Agent Skills host. Needs the go toolchain.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "go"
  kete-loom/owner: "Kete-org"
---

# Go testing

Use the standard `testing` package and the project's existing test style. Add an assertion library only if the project already uses one.

## 0. Before you write

1. Find the test command (Makefile, CI workflow, README). Default: `go test ./...`.
2. Run the package's tests once and record the result. If they already fail, **stop and tell the user** which ones before changing anything.
3. Read the `go` directive in `go.mod`; do not use testing APIs newer than it.
4. Look at a neighbouring `_test.go` file for naming, helpers, fixtures and whether tests are in `package foo` (white-box) or `package foo_test` (black-box). Prefer `foo_test` for testing the public API.

## 1. Table-driven tests with subtests

```go
func TestParseDuration(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		want    time.Duration
		wantErr bool
	}{
		{name: "minutes", in: "5m", want: 5 * time.Minute},
		{name: "empty", in: "", wantErr: true},
		{name: "negative", in: "-1s", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseDuration(tt.in)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseDuration(%q) error = %v, wantErr %v", tt.in, err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("ParseDuration(%q) = %v, want %v", tt.in, got, tt.want)
			}
		})
	}
}
```

Rules:
- Every case has a `name`; run one with `go test -run 'TestParseDuration/negative' ./pkg`.
- Failure messages say `Func(input) = got, want want`. Use `t.Errorf` to keep going, `t.Fatalf` only when later checks would be meaningless.
- Compare structs and slices with `github.com/google/go-cmp/cmp` (`cmp.Diff(want, got)`) if available, otherwise `reflect.DeepEqual`. Check errors with `errors.Is`, not string equality.
- `t.Parallel()` only when cases share no mutable state. On modules with a `go` directive before 1.22, copy the loop variable (`tt := tt`) before a parallel subtest.

## 2. Helpers and cleanup

- Call `t.Helper()` first in every helper that calls `t.Fatal`/`t.Error`, so failures point at the caller.
- Helpers take `t *testing.T` (or `testing.TB` to share with benchmarks) and fail directly instead of returning errors.
- Use `t.Context()` (Go 1.24+, cancelled just before cleanup runs) instead of `context.Background()` in tests where available.
- Use `t.Cleanup(fn)` for teardown, `t.TempDir()` for files, `t.Setenv` for environment variables (it cannot be combined with `t.Parallel`).
- Put fixture files in `testdata/`; the go tool ignores that directory when building.

## 3. Fakes over mocks

- Depend on a small interface at the consumer, then write a fake by hand in the test file: a struct with fields recording calls and returning canned results.
- Prefer real implementations when they are cheap: `bytes.Buffer` for `io.Writer`, `fstest.MapFS` for `fs.FS`, `httptest` for HTTP, an in-memory store.
- Do not add a mock generator to a project that does not already use one. Never mock the unit under test.
- Inject time and randomness (`now func() time.Time`, a seeded `*rand.Rand`) instead of sleeping or relying on wall time.

## 4. HTTP

- Handlers: `rec := httptest.NewRecorder(); req := httptest.NewRequest(http.MethodGet, "/items/1", nil); h.ServeHTTP(rec, req)`, then check `rec.Code`, headers and `rec.Body`.
- Clients: `srv := httptest.NewServer(http.HandlerFunc(...)); defer srv.Close()` and point the client at `srv.URL`. Use `httptest.NewTLSServer` with `srv.Client()` for TLS.
- Assert the request the fake server received (method, path, body) as well as the client's result.
- No real network calls in unit tests.

## 5. Concurrency and the race detector

- Run `go test -race ./...` for any package with goroutines or shared state. A race report is a bug to fix, not a flake.
- Never use `time.Sleep` to wait for a goroutine. Wait on a channel, a `sync.WaitGroup`, or poll a condition with a deadline.
- For code built on timers and goroutines, the `testing/synctest` package (`synctest.Test`, Go 1.25+) runs the test in a bubble with a fake clock; use it if the module's Go version allows.
- Find flakes with `go test -race -count=50 -run TestName ./pkg`. Use `-shuffle=on` to expose order dependence.

## 6. Fuzzing

```go
func FuzzParseDuration(f *testing.F) {
	for _, s := range []string{"5m", "", "1h30m", "-1s"} {
		f.Add(s)
	}
	f.Fuzz(func(t *testing.T, s string) {
		d, err := ParseDuration(s)
		if err != nil {
			return
		}
		if again, err := ParseDuration(d.String()); err != nil || again != d {
			t.Fatalf("round trip %q -> %v -> %v, %v", s, d, again, err)
		}
	})
}
```

- Run with `go test -fuzz=FuzzParseDuration -fuzztime=30s ./pkg`. Only one fuzz target per package per run.
- Assert properties (round trip, no panic, invariants), not exact outputs.
- Failing inputs are written to `testdata/fuzz/FuzzName/`. Commit them: they become regression cases run by a plain `go test`.

## 7. Benchmarks

- Name `BenchmarkXxx(b *testing.B)`. On Go 1.24+ write the loop as `for b.Loop() { ... }`; setup before the loop is excluded automatically. On older versions use `for i := 0; i < b.N; i++` with `b.ResetTimer()` after setup.
- Run with `go test -run '^$' -bench BenchmarkName -benchmem -count=10 ./pkg`.
- Compare before and after with `golang.org/x/perf/cmd/benchstat old.txt new.txt`. Never claim a speed-up from a single run.

## 8. Golden files

```go
var update = flag.Bool("update", false, "rewrite golden files")

func TestRender(t *testing.T) {
	got := Render(input)
	golden := filepath.Join("testdata", t.Name()+".golden")
	if *update {
		if err := os.WriteFile(golden, got, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(golden)
	if err != nil {
		t.Fatal(err)
	}
	if diff := cmp.Diff(string(want), string(got)); diff != "" {
		t.Errorf("Render mismatch (-want +got):\n%s", diff)
	}
}
```

Regenerate with `go test ./pkg -run TestRender -update`, then **read the diff** before committing. Subtest names contain `/`; sanitise or create directories when using `t.Name()` in a path.

## 9. Coverage

`go test -coverprofile=cover.out ./... && go tool cover -func=cover.out`. Cover the error paths and boundaries the user cares about; do not chase a percentage.

## Never

- Delete, skip (`t.Skip`) or weaken an existing test to get green without the user's agreement.
- Sleep to synchronise, hit the real network, or depend on test execution order.
- Leave goroutines running after a test returns.

## Report back

End with: tests added or changed (names), the exact commands run (including `-race`), pass/fail counts, and anything left untested.
