# Recalculation and error checks for .xlsx

openpyxl writes formulas but never evaluates them. Until a spreadsheet application recalculates and saves the file, the cached value of every formula cell is empty.

## 1. Recalculate with LibreOffice headless

Convert the workbook to xlsx into a separate folder. LibreOffice loads it, calculates the formulas that have no cached result, and writes the values into the new file.

```bash
mkdir -p recalced
soffice --headless --calc --convert-to xlsx --outdir recalced model.xlsx
```

Notes:

- Close any running LibreOffice window first, or pass a throwaway profile so the headless run does not attach to it: `soffice -env:UserInstallation=file:///tmp/lo-profile --headless ...`.
- LibreOffice decides whether to recalculate formulas that already have cached values from its settings (Tools > Options > LibreOffice Calc > Formula > Recalculation on file load). If a file edited by an earlier tool still shows stale values, set that option to "Always recalculate" in the profile you use, or open the file once in Excel.
- The converted copy is the one to deliver. Diff the sheet list and defined names against the original so nothing was dropped.

## 2. Confirm values exist and scan for errors

```python
from openpyxl import load_workbook

ERRORS = {"#REF!", "#NAME?", "#DIV/0!", "#VALUE!", "#N/A", "#NUM!", "#NULL!"}
formulas = load_workbook("recalced/model.xlsx")              # formulas
values = load_workbook("recalced/model.xlsx", data_only=True)  # cached results

missing, bad = [], []
for ws in formulas.worksheets:
    vs = values[ws.title]
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith("="):
                v = vs[c.coordinate].value
                if v is None:
                    missing.append(f"{ws.title}!{c.coordinate}")
                elif isinstance(v, str) and (v in ERRORS or v.startswith("Err:")):
                    bad.append(f"{ws.title}!{c.coordinate} {v} {c.value}")

print(f"formula cells without a value: {len(missing)}", missing[:20])
print(f"error cells: {len(bad)}", *bad, sep="\n")
```

- `Err:NNN` values are LibreOffice-specific error codes that were not mapped to an Excel error; treat them as errors.
- Any `missing` entries mean recalculation did not happen; do not deliver the file as calculated.
- Empty cells referenced by a formula can make a `None` result legitimately (for example `=IF(A1="","",A1)` returns an empty string). Look at the formula before calling it a failure.

## 3. Typical causes

| Error | Usual cause | Fix |
|---|---|---|
| `#REF!` | Rows or columns deleted under a reference, or a reference to a sheet that was renamed | Rewrite the reference; after inserting rows with openpyxl, formulas are NOT shifted for you |
| `#NAME?` | Misspelt function, a function LibreOffice lacks, an undefined named range, or text not quoted | Check spelling, define the name, quote text |
| `#DIV/0!` | Denominator empty or zero | Guard with `=IF(B2=0,"",A2/B2)` or `IFERROR` when blank is the right answer |
| `#VALUE!` | Text in a numeric operation (often a number stored as a string) | Write numbers as numbers |
| `#N/A` | Lookup found nothing | Fix the key, or wrap in `IFNA` if a miss is expected |

openpyxl does not adjust formulas when you insert or delete rows (`ws.insert_rows`). Prefer writing the sheet in its final shape, or update the affected formulas yourself, and rescan.

## 4. Independent spot check

Recompute two or three headline numbers from the inputs with pandas and compare them with the cached values to the cent or the agreed tolerance. Report the comparison.
