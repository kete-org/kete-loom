# PICT model syntax

PICT (Pairwise Independent Combinatorial Testing) reads a plain-text model and prints a minimal set of test cases that covers every pair (or N-wise) of parameter values. Install the `pict` CLI (Microsoft, open source) or `pict`-compatible tools.

## Parameters

One parameter per line, values comma-separated:

```
Type:       Single, Spanned, Striped, Mirror, RAID-5
Size:       10, 100, 500, 1000, 5000, 10000, 40000
Format:     quick, slow
FileSystem: FAT, FAT32, NTFS
Compression: on, off
```

Run: `pict model.txt` prints a tab-separated table, header row first, one test case per line. Default coverage is **pairwise** (order 2).

## Order

`pict model.txt /o:3` covers every 3-way combination. Higher order = more cases. Only raise it for variables the spec says truly interact three or more at a time.

## Constraints

Exclude combinations that can't occur, so PICT never emits them:

```
IF [FileSystem] = "FAT"   THEN [Size] <= 4096;
IF [FileSystem] = "FAT32" THEN [Size] <= 32000;
IF [Compression] = "on"   THEN [FileSystem] = "NTFS";
```

Operators: `=  <>  <  <=  >  >=`, `IN {a, b, c}`, `LIKE` (wildcard), combined with `AND`, `OR`, `NOT`. Reference other parameters with `[Name]`.

## Value weights and aliases

- **Weight** a value so PICT favours it: `Size: 10, 100, 500 (3), 1000`. The `(3)` makes 500 three times as likely to be chosen when PICT has a free choice.
- **Alias** interchangeable values: `Format: quick | fast, slow`. Treated as the same value for coverage, but either spelling may appear.
- **Negative** values (invalid inputs) prefix with `~`: `Size: ~-1, 0, ~99999`. PICT combines negatives one at a time with otherwise-valid rows, so each invalid input is tested in isolation.

## Sub-models

Group parameters that should be combined at a higher order among themselves:

```
{ Platform, CPU, RAM } @ 3
{ HDD, SSD } @ 2
```

## Flags worth knowing

- `/o:N` — order (default 2).
- `/d:C` — value separator in the model (default comma).
- `/r[:seed]` — randomise; a fixed seed gives a reproducible suite. Pin it in CI.
- `/s` — show model statistics (combinations, generated case count).

PICT never produces expected results. Add the oracle to every generated row yourself.
