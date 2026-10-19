---
name: dataset-profiling
description: First-look profiling of an unfamiliar CSV, Parquet or Excel file with pandas, polars or DuckDB before any analysis is attempted - row and column counts, inferred versus intended types, missing values, cardinality, duplicate rows and keys, value distributions, outliers, candidate primary keys and strong correlations - reported as data-quality findings plus the questions to ask the data owner. Use when someone hands over a new data file or export and asks what is in it, whether it can be trusted, which column identifies a row, or what needs cleaning before modelling or reporting.
license: MIT
compatibility: Any Agent Skills host that can run Python 3 with pandas or polars, or the DuckDB CLI. Excel files need openpyxl.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "python3"
  kete-loom/owner: "Kete-org"
---

# Dataset profiling

Answer "what is in this file and can we trust it?" with numbers, before anyone computes a single business metric. The output is a profile report, not an analysis.

## Ground rules

1. **Never modify the source file.** Read it; write any intermediate output to a separate folder. If cleaning is needed, list it as a finding.
2. **Profile the whole file when it fits.** Sample only when it does not, say so in the report, and use a random sample, not the first N rows (exports are often sorted).
3. **Read identifiers as text.** Postcodes, phone numbers, account and product codes lose leading zeros when parsed as numbers. Load once with everything as strings, then infer types deliberately.
4. **Report what you measured, not what you assume.** "Column `status` has 7 distinct values" is a finding; "status is probably an enum" is a question.
5. **No personal data in the report.** Show counts, patterns and masked examples (`j***@example.com`), never real names, emails, phone or ID numbers.

## Choose the engine

| Situation | Use |
|---|---|
| Under about 1 GB, Python available | pandas or polars in memory |
| Larger than memory, or Parquet folders | DuckDB (`SUMMARIZE`, `read_parquet`) or polars lazy `scan_*` |
| Excel workbook | `pandas.read_excel(path, sheet_name=None)` to see every sheet first |
| No Python | DuckDB CLI alone |

Exact commands per engine are in `references/profiling-snippets.md`.

## Steps

1. **Identify the file.** Size, format, encoding (look for a BOM or mojibake such as `Ã©`), delimiter, header row, and for Excel the sheet names, merged headers and totals rows. Stop and ask if there are several sheets and it is unclear which one matters.
2. **Shape.** Rows, columns, memory size. Compare the row count with what the owner expects; a round number such as 65,536, 1,048,576 or 10,000 suggests a truncated export.
3. **Types.** For each column: parsed type, intended type, and the share of values that fail to parse as the intended type (dates in mixed formats, numbers with currency symbols or thousands separators, `"N/A"` strings).
4. **Missingness.** Null count and percentage per column, plus disguised nulls: empty strings, whitespace, `NULL`, `none`, `-`, `0` or `1900-01-01` used as placeholders. Check whether missingness clusters by date or source.
5. **Cardinality.** Distinct count per column. Flag constants (1 value), near-constants (top value over 99%), and high-cardinality text that looks like free text or IDs.
6. **Duplicates.** Fully duplicated rows, and duplicates on the candidate key.
7. **Key candidates.** Columns, or small column combinations, that are unique and never null. State the one you recommend and the evidence. If none exists, say so; that is an important finding.
8. **Distributions.** Numeric: min, max, mean, median, quartiles, share of zeros and negatives. Categorical: top 10 values with counts, and spelling variants (`Accra`, `accra`, `ACCRA `). Dates: range, gaps in the series, future dates, and the time zone if any.
9. **Outliers.** Flag values outside 1.5 x IQR or beyond plausible domain limits (ages over 120, negative quantities, prices of 0). Report them; do not drop them.
10. **Relationships.** Pairwise correlation for numeric columns (Spearman when skewed), and obvious derived columns (`total = qty * price`): check whether the identity actually holds and how often it fails.
11. **Write the report** in the format below.

## Stop and ask the user

- Before loading a file that looks like it holds personal or regulated data (health, payment card, national ID), confirm it may be processed here.
- When the file is too large to profile fully and sampling would change a conclusion.
- When two columns could be the key, or none is, and the choice changes later joins.

## Never

- Fill, drop, deduplicate or recast data while profiling.
- Report a mean for a column that is really an ID or a code.
- Present correlation as cause.

## Report format

```
# Profile: <file name>
Source: <path>, <size>, <format/encoding/delimiter>, profiled <all rows | sample of N, method>
Shape: <rows> rows x <cols> columns
Recommended key: <column(s)> - <evidence> | none found

## Columns
| column | type (parsed -> intended) | nulls % | distinct | notes |

## Data-quality findings (most serious first)
1. <finding> - <count/percentage> - <impact on analysis>

## Questions for the data owner
1. <question the data cannot answer>

## Suggested cleaning (not applied)
- <step>
```

Hand over to a notebook or pipeline skill (such as `data-analysis-notebooks`) once the user wants the cleaning and analysis done.
