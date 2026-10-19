# Tracing a bad value back to its source

The line that throws is rarely the line that is wrong. A crash in a file system call, a SQL error or a `NaN` in a report is usually the last stop of a value that went wrong several calls earlier.

## Method

1. **Name the symptom precisely.** "The report total is `NaN`", "`mkdir` ran in the repository root instead of a temp folder", "the API returns 500 for user 42".
2. **Find the immediate cause.** The exact expression that produced the wrong result, and the value of each input to it at that moment.
3. **Step one caller up.** Who passed that input? Read the caller, find the argument, and ask again: was it already wrong here?
4. **Repeat until the value is right on the way in and wrong on the way out.** That function is the source. Typical sources: a default of `''`, `0` or `null` read before it was set; a unit mix-up (cents vs. major units, ms vs. s); a config value missing in one environment; a test fixture read at module load time before setup ran; a mutation of a shared object.
5. **Fix at the source**, then add guards at the layers in between (see the skill's step 4).

## When you can't follow it by reading

Add one temporary probe immediately **before** the operation that goes wrong, printing the inputs, the working directory, the relevant environment variables and a stack trace:

| Language | Stack trace at a point |
|---|---|
| JavaScript / TypeScript | `console.error('PROBE', { dir, cwd: process.cwd() }, new Error().stack)` |
| Python | `import traceback, sys; print('PROBE', dir, file=sys.stderr); traceback.print_stack()` |
| Go | `log.Printf("PROBE %q\n%s", dir, debug.Stack())` (import `runtime/debug`) |
| Java / Kotlin | `new Exception("PROBE " + dir).printStackTrace()` |
| Ruby | `warn "PROBE #{dir}"; warn caller.join("\n")` |
| Rust | `eprintln!("PROBE {:?}\n{}", dir, std::backtrace::Backtrace::force_capture())` |

Tips:

- Write to stderr. Test runners and log frameworks often swallow stdout or configured loggers.
- Tag every probe with a unique word (`PROBE`) and filter the output: run the test command and pipe it through `grep PROBE`.
- Log before the dangerous call, not in a catch block after it; you want the state that led there.
- Read the stack for the first frame in your own code, and for a test file name when the call came from a test.
- Remove every probe before committing. Search for the tag to be sure.

## Using a debugger instead

A breakpoint at the failing line with "step out" and the call stack panel is the same method, faster, when the code runs locally: Node `node --inspect-brk`, Python `breakpoint()` / `pdb`, Go `dlv test`, JVM IDE debuggers, Rust `rust-gdb` or `rust-lldb`. Use a conditional breakpoint (`dir === ''`) when the call happens many times.

### Non-interactive recipes

An agent can't type into a debugger prompt, so give the debugger its whole script up front and let it exit. Always end with a quit command and run it under a timeout, or a debugger left waiting for input will hang the session.

| Debugger | One-shot command |
|---|---|
| gdb (C, C++, Rust) | `gdb -batch -ex 'break ledger.c:88 if balance < 0' -ex run -ex bt -ex 'info locals' --args ./app --flag` |
| lldb (C, C++, Rust, Swift) | `lldb -b -o 'breakpoint set -f ledger.c -l 88 -c "balance < 0"' -o run -o bt -o 'frame variable' -- ./app --flag` |
| pdb (Python) | `python -m pdb -c 'b ledger.py:88, balance < 0' -c c -c 'p balance' -c where -c q ledger.py` |
| Delve (Go) | put `break ledger.go:88`, `condition 1 balance < 0`, `continue`, `print balance`, `stack`, `exit` in a file and run `dlv debug ./cmd/app --init dbg.txt`; for a remote or long-running process use `dlv debug --headless --listen=127.0.0.1:2345 --api-version=2` and connect a client |

Read the output for the stack and the local values at the stop; if the program exits without stopping, the condition never became true on that run, which is itself evidence.

### Invariant breakpoints

Turn what must always be true into a breakpoint condition that fires when it breaks: `balance < 0`, `len(queue) > limit`, `user_id is None`, `total != sum(items)`. It works like a runtime assertion without editing the code, and it stops at the first moment the state goes wrong rather than where it crashes later.

### Bisect with two breakpoints

When a value is right at one point and wrong at a later one, set one breakpoint at each and print the value at both. Then move one of them halfway between and repeat. Each run halves the stretch of code that can contain the fault.

Where to put them:

- At **boundaries** where data crosses from one part to another: a function's entry and return, before and after a serialisation, parse, database read or network call, at a queue publish and consume.
- In **your own code**, not inside library or framework internals. If the value is wrong coming out of a library call, break just before and just after that call and check what you passed in; step into the library only once your input is shown to be correct.

## Worked shape

```
Symptom:   git init ran inside the source tree during tests
Immediate: runGit('init', { cwd: dir }) with dir = ''
           (an empty cwd falls back to the process working directory)
Caller:    createWorkspace(dir) <- Session.start(project.dir)
Caller:    test file: const project = makeProject(ctx.tmpDir) at top level
Source:    ctx.tmpDir is '' until beforeEach runs; the test read it at load time
Fix:       make tmpDir a getter that throws if read before setup
Guards:    makeProject rejects an empty dir; runGit refuses to run outside the OS temp folder when NODE_ENV=test
```
