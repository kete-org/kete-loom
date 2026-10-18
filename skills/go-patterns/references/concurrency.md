# Go concurrency patterns

Each pattern stops cleanly when the context is cancelled and waits for every goroutine it starts.

## Fan-out with errgroup and a concurrency limit

```go
import "golang.org/x/sync/errgroup"

func fetchAll(ctx context.Context, ids []string) ([]Item, error) {
	items := make([]Item, len(ids)) // each goroutine writes its own index: no lock needed
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(8)
	for i, id := range ids {
		g.Go(func() error {
			it, err := fetch(ctx, id)
			if err != nil {
				return fmt.Errorf("fetch %s: %w", id, err)
			}
			items[i] = it
			return nil
		})
	}
	if err := g.Wait(); err != nil {
		return nil, err
	}
	return items, nil
}
```

Since Go 1.22 each loop iteration has its own `i` and `id`, so capturing them is safe. On a module whose `go` directive is older than 1.22, copy them first (`i, id := i, id`).

## Worker pool over a channel

```go
func process(ctx context.Context, jobs []Job, workers int) error {
	in := make(chan Job)
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error { // producer owns and closes in
		defer close(in)
		for _, j := range jobs {
			select {
			case in <- j:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
		return nil
	})

	for range workers {
		g.Go(func() error {
			for j := range in {
				if err := handle(ctx, j); err != nil {
					return err
				}
			}
			return nil
		})
	}
	return g.Wait()
}
```

`for range workers` (ranging over an int) needs Go 1.22+; use `for i := 0; i < workers; i++` on older modules.

## Pipeline stage that cannot leak

```go
func squares(ctx context.Context, in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for v := range in {
			select {
			case out <- v * v:
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}
```

The `select` on `ctx.Done()` is what prevents the leak: without it the goroutine blocks forever on `out <-` once the consumer stops reading.

## First result wins (with no leak)

```go
func first(ctx context.Context, replicas []string) (Result, error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	ch := make(chan Result, len(replicas)) // buffered: losers never block
	for _, r := range replicas {
		go func() {
			if res, err := query(ctx, r); err == nil {
				ch <- res
			}
		}()
	}
	select {
	case res := <-ch:
		return res, nil
	case <-ctx.Done():
		return Result{}, ctx.Err()
	}
}
```

If every replica fails this waits for the parent context; add a timeout or count failures if that is not acceptable.

## Mutex-guarded state

```go
type Counter struct {
	mu sync.Mutex
	n  map[string]int // guarded by mu
}

func (c *Counter) Inc(k string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.n == nil {
		c.n = make(map[string]int)
	}
	c.n[k]++
}
```

Methods use a pointer receiver so the mutex is never copied. `go vet` (copylocks) flags copies.

## Graceful HTTP shutdown

```go
func run(ctx context.Context) error {
	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	srv := &http.Server{Addr: ":8080", Handler: routes(), ReadHeaderTimeout: 5 * time.Second}
	errCh := make(chan error, 1)
	go func() { errCh <- srv.ListenAndServe() }()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
```

`ListenAndServe` returns `http.ErrServerClosed` after `Shutdown`; treat that as success if you read `errCh` afterwards. The shutdown context is deliberately new: the signal context is already cancelled.

## Detecting leaks and races

- `go test -race ./...` on every change that touches goroutines or shared state.
- `go.uber.org/goleak` (`defer goleak.VerifyNone(t)` or `goleak.VerifyTestMain(m)`) catches goroutines still running at test end, if the project accepts the dependency.
- A goroutine dump (`SIGQUIT`, or `net/http/pprof` at `/debug/pprof/goroutine?debug=2`) shows where leaked goroutines are blocked.
