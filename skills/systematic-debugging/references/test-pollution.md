# Bisecting test pollution and history

## Symptoms of test pollution

- A test passes on its own and fails in the full suite (or the reverse).
- Results change with test order, `--shuffle`, or the number of parallel workers.
- A stray file, directory, database row, environment variable or global setting appears after the suite runs.

The cause is a test that leaves state behind (or depends on state another test leaves). Find it by bisection, not by reading every test.

## Find the polluting test

1. Write a **check** that answers yes or no: "does `./.git` exist in `packages/core`?", "does the `users` table have rows?", "does the target test fail?".
2. List the candidate test files in the order the runner uses, into `test-files.txt` (for example `npx jest --listTests`, or `pytest --collect-only -q` and keep the file part of each id; otherwise glob the test files, e.g. `git ls-files '*.test.ts'`). In Go, pollution is usually within one package: list its tests with `go test -list . ./pkg/...` and bisect with `-run`.
3. Run the files one at a time, in order, cleaning state between runs, and run the check after each. The first file after which the check flips is the polluter. A small shell loop is enough:

```sh
for f in $(cat test-files.txt); do
  rm -rf packages/core/.git            # reset the state you are checking
  <test command> "$f" >/dev/null 2>&1
  if [ -e packages/core/.git ]; then echo "POLLUTER: $f"; break; fi
done
```

4. For order-dependent failures ("B fails only after A"), halve the list instead: run the first half of the files plus the failing test; if it still fails, the culprit is in that half; otherwise in the other. Repeat. Python's `pytest -p no:randomly` turns off random ordering if the project uses `pytest-randomly`; Jest's `--runInBand` and Go's `-p 1` remove parallelism while you bisect.
5. Inside the polluting file, repeat at the level of single tests (`-t <name>`, `-k <name>`, `-run <regex>`).

Typical causes once found: a missing teardown, a module-level singleton or cache, a mocked global (clock, `fetch`, env var) that is never restored, tests sharing one database without transactions, a path computed before setup ran.

Fix: restore state in teardown (or use the framework's automatic restore, e.g. Jest `restoreMocks`, pytest `monkeypatch`, Go `t.Cleanup` and `t.Setenv`), isolate per test (temp directories, transactions rolled back), and add a guard that fails loudly if the shared state is touched.

## Bisect git history

When something worked at a known commit and doesn't now:

```sh
git bisect start <bad-commit> <good-commit>
git bisect run sh /tmp/repro.sh     # exit 0 = good, 125 = skip, 1-127 = bad, 128+ aborts
git bisect reset                    # always, when done
```

- Keep `repro.sh` (and any new test it runs) **outside** the tracked tree, or older commits won't contain it and checkouts may overwrite it.
- Run the script by hand on the known-bad and known-good commits first. Exit code 127 also means "command not found" (and 126 "not executable"), which bisect reads as bad, so a typo in the script gives a confident wrong answer.
- Make the script install dependencies if the lockfile changes across the range, and exit `125` for commits that can't build, so bisect skips them.
- `git log -L <start>,<end>:<file>` or `git log -S '<string>'` find when a specific line or string changed without a full bisect.
- The first bad commit tells you *where*; you still need the trace in `references/root-cause-tracing.md` to know *why*.
