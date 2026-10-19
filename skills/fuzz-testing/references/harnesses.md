# Fuzz harness skeletons

Keep each harness minimal and deterministic. Decode bytes → call the target → return.

## C / C++ — libFuzzer

```c
#include <stdint.h>
#include <stddef.h>
extern int parse(const uint8_t *buf, size_t len);

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    parse(data, size);
    return 0;   // non-zero is reserved; always return 0
}
```

Build and run:
```
clang -g -O1 -fsanitize=fuzzer,address,undefined harness.c target.c -o fuzz
./fuzz corpus/ -dict=tokens.dict -max_total_time=120
```
Structured input: use `FuzzedDataProvider` (`<fuzzer/FuzzedDataProvider.h>`) to carve typed values out of `data`.

## C / C++ — AFL++

Compile with `afl-clang-fast`; the same `LLVMFuzzerTestOneInput` works via `afl-compiler-rt`, or use `afl_fuzz_init`/`__AFL_LOOP` for persistent mode. Run:
```
afl-fuzz -i seeds/ -o findings/ -x tokens.dict -- ./target @@
```
`@@` is replaced with each input file path.

## Rust — cargo-fuzz

`cargo install cargo-fuzz`, then `cargo fuzz add parse`:
```rust
#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;

fuzz_target!(|data: &[u8]| {
    let _ = my_crate::parse(data);
});
```
Structured: `fuzz_target!(|input: MyType| { … })` where `MyType: Arbitrary`.
Run / shrink / minimise corpus:
```
cargo fuzz run parse -- -max_total_time=120
cargo fuzz tmin parse <crash-file>
cargo fuzz cmin parse
```

## Go — native fuzzing (1.18+)

In a `_test.go` file. A fuzz test is `func FuzzXxx(f *testing.F)` taking only `*testing.F`; it calls `f.Fuzz` exactly once with a `*testing.T` first parameter followed by the fuzz arguments.

```go
func FuzzParse(f *testing.F) {
    f.Add([]byte("valid-seed"))          // seed corpus; types must match f.Fuzz args
    f.Fuzz(func(t *testing.T, data []byte) {
        Parse(data)                       // crash = panic or t.Fatal
    })
}
```
Allowed fuzz-argument types: `[]byte`, `string`, the int/uint types, `float32/64`, `bool`. Run:
```
go test -fuzz=FuzzParse -fuzztime=120s ./pkg
```
A failing input is written to `testdata/fuzz/FuzzParse/` and is replayed as a normal test case afterwards, so commit it.

## Python — atheris

```python
import atheris, sys
with atheris.instrument_imports():
    import mymodule

def TestOneInput(data):
    fdp = atheris.FuzzedDataProvider(data)
    try:
        mymodule.parse(fdp.ConsumeString(fdp.remaining_bytes()))
    except (ValueError, KeyError):
        pass          # expected rejections; let unexpected exceptions crash

atheris.Setup(sys.argv, TestOneInput)
atheris.Fuzz()
```
For C extensions, build them with atheris' libFuzzer/sanitizer support to catch native bugs.

## Dictionary file format (libFuzzer / AFL++)

```
# one token per line
magic_png="\x89PNG\r\n\x1a\n"
kw_select="SELECT"
delim=","
```
