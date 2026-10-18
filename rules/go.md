---
name: go
description: Always-on rules for Go files, covering formatting, vet, error handling, context, goroutine and resource lifetimes, and concurrency safety.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.go"
  kete-loom/owner: "Kete-org"
---

- Format with `gofmt` (or the project's `goimports`). Run `go vet ./...` and `go test ./...` after a change, plus the project's configured linter.
- Run tests with `-race` when the code uses goroutines or shared state.
- Check every returned error. Never discard one with `_` unless a comment says why.
- Wrap errors with context using `fmt.Errorf("doing x: %w", err)`, and inspect them with `errors.Is` and `errors.As`, never by comparing strings.
- Handle an error or return it, not both: do not log and then return the same error.
- Never `panic` for expected failures in library code; return an error.
- Pass `context.Context` as the first parameter of anything that does I/O or may block, and honour its cancellation. Never store it in a struct.
- `defer` the `Close` of files, response bodies and rows right after the error check; check `rows.Err()` after iterating.
- Give every goroutine a way to stop (context, closed channel or `sync.WaitGroup`). Never start one you cannot end.
- Protect shared state with a mutex or channels. Never copy a value that contains a `sync.Mutex`.
- Only the sender closes a channel. Never close a channel twice or send on a closed one.
- Set a timeout on outbound HTTP calls (client `Timeout` or a context deadline); `http.Get` and `http.DefaultClient` have none. Set `ReadHeaderTimeout` on `http.Server`.
- Use parameterized queries in `database/sql`; never build SQL with `fmt.Sprintf`.
- Pass `exec.Command` separate arguments; never run `sh -c` with a string built from input.
- Keep `go.mod` and `go.sum` tidy with `go mod tidy`; never edit `go.sum` by hand.

For more, load the go-patterns and go-testing skills.
