# DataFrame pitfalls (pandas and polars)

## Loading

- pandas: `pd.read_csv(path, dtype={"zip": "string", "id": "string"}, parse_dates=["created_at"])`. Prefer Parquet over CSV for intermediates; it keeps types.
- polars: `pl.read_csv(path, schema_overrides={"zip": pl.String})`, `pl.scan_csv` / `pl.scan_parquet` for lazy reading.
- Check straight after loading: shape, `dtypes`, null counts, duplicate keys, min/max of numeric and date columns.

## Assignment and copies (pandas)

- pandas 3.0 makes Copy-on-Write the only mode: any indexing result behaves as a copy. `df[df.a > 0]["b"] = 1` never updates `df` (only a `ChainedAssignmentError` warning). Use `df.loc[df.a > 0, "b"] = 1`.
- `SettingWithCopyWarning` is gone in 3.0; do not rely on warnings to catch mistakes, assert on the result.
- Avoid `inplace=True`; reassign instead (`df = df.dropna(subset=["x"])`).

## Strings and dates (pandas 3.0)

- Text columns infer to the `str` dtype (backed by PyArrow when installed), not `object`. Code that checks `dtype == object` for strings will break.
- Default datetime resolution is microseconds when inferred from strings. Compare timestamps with matching time zones; localise with `tz_localize`, convert with `tz_convert`.

## Joins

```python
before = len(left)
out = left.merge(right, on="customer_id", how="left", validate="many_to_one", indicator=True)
assert len(out) == before
print(out["_merge"].value_counts())
```

polars: `left.join(right, on="customer_id", how="left", validate="m:1")`.

- Check key dtypes and formats match on both sides. pandas raises on int vs string keys, but `"007"` vs `"7"` (an ID read as a number on one side) silently matches nothing.
- Strip whitespace and normalise case on string keys before joining.

## Grouping and aggregation

- `groupby(..., dropna=False)` if missing keys are a real group; pandas drops them by default.
- Use named aggregation (`df.groupby("g").agg(n=("id", "size"), mean_x=("x", "mean"))`) so columns say what they are.
- `size` counts rows including nulls; `count` excludes nulls.
- polars: `df.group_by("g").agg(pl.len().alias("n"), pl.col("x").mean())`; order is not guaranteed unless `maintain_order=True`.

## Floats and money

- Compare floats with tolerance (`np.isclose`). Money: integer minor units or `decimal`, not float sums.

## Performance without changing results

- Vectorise; avoid `iterrows` and `apply(axis=1)` for arithmetic.
- `category` dtype for low-cardinality strings in pandas.
- polars lazy queries: build the whole query, then `.collect()` once; `explain()` shows the plan.
