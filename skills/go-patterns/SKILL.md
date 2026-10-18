---
name: go-patterns
description: Idiomatic Go for writing and restructuring code, covering package layout, error wrapping with %w and errors.Is/As, small consumer-side interfaces, context.Context propagation, goroutine and channel patterns that do not leak or race, Go modules hygiene, and golangci-lint setup. Use when writing new Go code, designing a Go package or service, choosing between channels and mutexes, or asking how a Go project should be structured.
license: MIT
compatibility: Any Agent Skills host. Needs the go toolchain; golangci-lint is optional.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "go"
  kete-loom/owner: "Kete-org"
---

# Go patterns

Write Go that reads like the standard library: plain, explicit, and boring on purpose. Follow the project's existing conventions first; these rules fill the gaps.

## 0. Before you write

1. Read `go.mod` for the module path and the `go` directive. Do not use language or library features newer than that version.
2. Check for `.golangci.yml` / `.golangci.yaml`, a `Makefile` or CI workflow, and use the lint and test commands they define.
3. Search the codebase for an existing helper, error type or interface before adding a new one.

## 1. Package layout

- One package per directory, named for what it provides (`invoice`, not `utils`, `common` or `helpers`). Package names are short, lower case, no underscores.
- `cmd/<binary>/main.go` for each executable; keep `main` thin (parse config, wire dependencies, call `run(ctx) error`).
- `internal/` for code other modules must not import. Prefer it by default for application code.
- Do not create `pkg/`, `models/` or layer-per-folder trees unless the project already uses them. Start flat; split a package when it has two clearly separate jobs.
- Avoid stutter: `invoice.New`, not `invoice.NewInvoice`; `http.Client`, not `http.HTTPClient`.
- No package-level mutable state except where unavoidable (registered metrics, `flag`). Pass dependencies in.

## 2. Errors

- Return `error` as the last result. Check it immediately; never assign it to `_` without a comment saying why it is safe.
- Add context when you return: `fmt.Errorf("load invoice %s: %w", id, err)`. Lower case, no trailing punctuation, no "failed to" prefix chains.
- Use `%w` only when callers may need to inspect the cause. Use `%v` when the cause is an implementation detail you do not want in your API.
- Inspect with `errors.Is(err, ErrNotFound)` and `errors.As(err, &target)`. Never compare `err.Error()` strings, and never use `==` on a possibly wrapped error.
- Sentinel errors: `var ErrNotFound = errors.New("invoice: not found")`. Custom types when callers need fields (`*ValidationError{Field string}`).
- Combine independent failures (for example several `Close` calls) with `errors.Join`.
- Handle an error once: either log it or return it, not both.
- `panic` only for programmer errors that cannot happen in correct code. Never panic across a package boundary for expected failures.

## 3. Interfaces

- Define interfaces where they are **used**, not where they are implemented. Keep them to the one or two methods the consumer needs.
- Functions accept interfaces and return concrete types (`func NewStore(db *sql.DB) *Store`).
- Do not create an interface for a single implementation "for mocking later". Add it when a second implementation or a test fake needs it.
- Assert compliance at compile time when it matters: `var _ io.Reader = (*Decoder)(nil)`.
- A nil pointer stored in an interface is not a nil interface. Return a literal `nil` for "no error", never a typed nil `*MyError`.

## 4. Context

- `ctx context.Context` is the first parameter of anything that does I/O, blocks, or calls something that does. Name it `ctx`.
- Pass the caller's context down. Never store a context in a struct, and never pass `nil` (use `context.TODO()` while wiring).
- `context.Background()` belongs in `main`, tests and top-level goroutines that outlive a request, nowhere else.
- Every `WithCancel`, `WithTimeout`, `WithDeadline` is followed by `defer cancel()`.
- Context values carry request-scoped data only (trace IDs, auth principal) under an unexported key type. Never pass optional parameters through them.
- Long loops and blocking selects check `ctx.Done()` and return `ctx.Err()`.

## 5. Goroutines and channels

Rule: **every goroutine you start has a clear owner, a way to stop, and someone who waits for it.**

- Use `sync.WaitGroup` or `golang.org/x/sync/errgroup` to wait. Call `wg.Add` before the `go` statement, never inside the goroutine; on Go 1.25+ `wg.Go(func() { ... })` does both. With errgroup, use `errgroup.WithContext` so the first error cancels the rest, and `g.SetLimit(n)` to bound concurrency.
- A goroutine that sends on a channel must be able to exit if nobody receives: select on `ctx.Done()` too, or use a buffered channel sized to the number of sends.
- The sender closes a channel, never the receiver. Close once. Ranging over a channel ends only when it is closed.
- Prefer a `sync.Mutex` guarding a field over a channel when you only protect shared state. Use channels to hand off ownership or signal events.
- Keep the mutex next to the fields it guards and document which ones. Do not copy a struct containing a mutex (pass a pointer).
- `time.After` in a hot loop allocates a timer per iteration; use a `time.Ticker` or a reused `time.NewTimer`. Before Go 1.23 an unstopped timer or ticker was not collected until it fired, so always `Stop` them on older modules.
- Never start goroutines in `init` or in a library constructor without a `Close`/`Stop` method.

Worked patterns (worker pool, fan-out with errgroup, pipeline with cancellation, graceful HTTP shutdown) are in `references/concurrency.md`. Read it before writing any of those shapes.

## 6. Modules and dependencies

- Add a dependency with `go get example.com/mod@vX.Y.Z`, then `go mod tidy`. Commit `go.mod` and `go.sum` together.
- Prefer the standard library. Check whether `net/http`, `log/slog`, `encoding/json`, `slices`, `maps` already do the job before adding a package.
- `replace` directives are for local development or a temporary fork. Do not commit a `replace` pointing at a local path unless the repo already does.
- Use `go.work` for multi-module local work; do not commit it unless the repo already does.

## 7. Style details that matter

- `gofmt` (or `goimports`) every file. Unformatted Go is a defect.
- Zero values should be useful: `var buf bytes.Buffer` works without a constructor; design your types the same way where you can.
- Slices: `append` may reuse the backing array. When you return or store a subslice the caller might append to, copy it (`slices.Clone`) or use a full slice expression `s[lo:hi:hi]`.
- Maps are not safe for concurrent writes. Guard them or use `sync.Map` only for its documented cases.
- `defer f.Close()` on a file you wrote to loses the write error; check the `Close` error for writers.
- Use `log/slog` for structured logging if the project has no logger yet.
- Exported identifiers get a doc comment that starts with the identifier's name.

## 8. Lint and verify

Run, in order, and fix what they report in code you touched:

1. `gofmt -l .` (must print nothing) or the project's format command.
2. `go vet ./...`
3. `golangci-lint run ./...` if the project has a config or the user wants it. For a new config, keep `linters.default: standard` (errcheck, govet, ineffassign, staticcheck, unused) and enable extras such as `errorlint`, `bodyclose` and `contextcheck` only as needed. golangci-lint v2 configs begin with `version: "2"`; run `golangci-lint migrate` to convert a v1 file.
4. `go test -race ./...`

Do not silence a linter with `//nolint` unless you name the linter and give the reason: `//nolint:errcheck // best-effort cleanup`.

## Stop and ask the user

- Before restructuring packages or moving files across `internal/` boundaries.
- Before adding a third-party dependency for something the standard library covers.
- Before changing an exported API (signature, error values) that other modules may import.

## Never

- Ignore an error silently, or `log.Fatal` outside `main`.
- Start a goroutine with no way to stop it.
- Use `interface{}`/`any` where a concrete type or a generic type parameter would do.
- Add generics for code that only has one type today.

## Report back

End with: files changed, the format/vet/lint/test commands you ran and their results, and anything you chose not to change.
