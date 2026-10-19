# Profiling snippets

Starting points per engine. Adjust paths; keep the source file read-only.

## pandas

```python
import pandas as pd

raw = pd.read_csv("data.csv", dtype=str, keep_default_na=False)  # everything as text first
df = pd.read_csv("data.csv")                                     # default inference, for comparison
# Excel: sheets = pd.read_excel("book.xlsx", sheet_name=None, dtype=str)  -> dict of DataFrames

df.shape
df.info(memory_usage="deep")
df.isna().mean().sort_values(ascending=False)          # null share per column
df.nunique(dropna=True).sort_values()                  # cardinality
df.duplicated().sum()                                  # fully duplicated rows
df.describe(include="all").T

# disguised nulls in text columns
placeholders = {"", "null", "none", "n/a", "na", "-", "?"}
{c: raw[c].str.strip().str.lower().isin(placeholders).sum() for c in raw.columns}

# key candidates: unique and never null
[c for c in df.columns if df[c].notna().all() and df[c].is_unique]
df.duplicated(subset=["order_id", "line_no"]).sum()     # composite key check

# values that fail to parse as the intended type
pd.to_numeric(raw["amount"], errors="coerce").isna().sum() - (raw["amount"] == "").sum()
pd.to_datetime(raw["created_at"], format="mixed", errors="coerce").isna().sum() - (raw["created_at"] == "").sum()
# without format="mixed" (pandas 2+), the format is inferred from the first value and every other format counts as a failure

# IQR outliers
q1, q3 = df["amount"].quantile([0.25, 0.75]); iqr = q3 - q1
((df["amount"] < q1 - 1.5 * iqr) | (df["amount"] > q3 + 1.5 * iqr)).sum()

df.select_dtypes("number").corr(method="spearman")
```

## polars

```python
import polars as pl

df = pl.read_csv("data.csv", infer_schema_length=10000)   # or pl.read_parquet / pl.read_excel (needs the fastexcel package)
lf = pl.scan_parquet("folder/*.parquet")                  # lazy for large data

df.shape
df.schema
df.null_count()
df.select(pl.all().n_unique())
df.is_duplicated().sum()
df.describe()
df["status"].value_counts(sort=True).head(10)
```

## DuckDB (CLI or Python)

```sql
DESCRIBE SELECT * FROM read_csv('data.csv');
SUMMARIZE SELECT * FROM read_csv('data.csv');            -- min, max, approx_unique, avg, std, q25/q50/q75, count, null_percentage
SUMMARIZE SELECT * FROM read_parquet('folder/*.parquet');

SELECT count(*) AS rows, count(DISTINCT order_id) AS distinct_ids FROM read_csv('data.csv');
SELECT order_id, count(*) FROM read_csv('data.csv') GROUP BY 1 HAVING count(*) > 1 LIMIT 20;
SELECT * FROM read_csv('data.csv') USING SAMPLE 10000 ROWS;   -- random sample
```

`SUMMARIZE` reports approximate distinct counts and quantiles; confirm a key candidate with an exact `count(DISTINCT ...)` before recommending it.

## Optional HTML report

`ydata-profiling` produces a full HTML profile (`ProfileReport(df).to_file("profile.html")`). It is a separate install and can be slow on wide data; use it as a supplement, never instead of the written findings.
