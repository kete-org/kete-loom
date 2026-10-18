---
name: data-analysis-notebooks
description: Keeps Jupyter and other notebook analyses reproducible from a clean kernel, with a set project layout, a pinned environment, raw data treated as read-only, pandas and polars code free of chained assignment and silent dtype or join errors, honest plots, and statistics that avoid p-hacking, multiple-comparison and leakage traps, then moves code that has settled into tested modules. Use when starting or cleaning up an exploratory analysis notebook, when a notebook gives different results on rerun, when reviewing the statistics or charts in an analysis, or when turning notebook code into a script or package others can run.
license: MIT
compatibility: Any Agent Skills host. Examples use Python with Jupyter, pandas or polars, and matplotlib; the rules carry over to R Markdown, Quarto and other notebook tools.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Data analysis notebooks

A notebook is finished when someone else can run it top to bottom on a fresh kernel and get the same numbers and figures.

## 0. Assess first

1. Restart the kernel and run all cells (`jupyter nbconvert --to notebook --execute analysis.ipynb --output /tmp/check.ipynb`). Record which cell fails or which numbers change. This is the baseline.
2. Find the environment file (`pyproject.toml` with a lock file, `requirements.txt`, `environment.yml`). If none exists, create one before changing code.
3. Find where the data comes from. If it is a file only on someone's laptop or a query with no saved text, stop and ask the user how to get it reproducibly.

## 1. Project layout

```
project/
├── data/raw/          # read-only originals, never edited, usually git-ignored
├── data/processed/    # produced by code, safe to delete and regenerate
├── notebooks/         # numbered: 01-explore.ipynb, 02-model.ipynb
├── src/<package>/     # functions that notebooks import
├── tests/
├── reports/figures/
└── pyproject.toml + lock file (or environment.yml)
```

- Paths are relative to the project root (`pathlib.Path`), never `/Users/me/Downloads/...`.
- Secrets and connection strings come from environment variables, never cells.
- Commit notebooks with outputs stripped (`nbstripout --install`) or pair each with a text copy (`jupytext --set-formats ipynb,py:percent`) so diffs are reviewable.

## 2. Pin the environment

- Use one tool consistently: `uv` (`uv add pandas`, commit `uv.lock`), `pip-tools`, `poetry`, or `conda` with an exported `environment.yml`.
- Pin exact versions of the analysis libraries. pandas 3.0 changed defaults (Copy-on-Write always on, a new `str` dtype for text columns, microsecond datetime resolution), so results can differ between pandas 2.x and 3.x.
- Register the kernel from that environment (`python -m ipykernel install --user --name <project>`), and record the Python version.

## 3. Notebook hygiene

1. First cell: imports, settings, seeds (`rng = np.random.default_rng(42)`), and paths. No imports further down.
2. Run cells in order only. No cell may depend on a variable created by a cell below it or by a deleted cell.
3. Parameters (dates, thresholds, file names) in one cell near the top, tagged `parameters` if the notebook will be run with papermill.
4. One question per notebook. Over roughly 50 cells or several unrelated questions, split it.
5. Every result cell that a conclusion relies on prints the number it relies on, not just a chart.
6. Never mutate raw data in place; write derived data to `data/processed/` with code.

## 4. pandas and polars correctness

Full checklist in `references/dataframe-pitfalls.md`. The core rules:

- **Assignment:** use `df.loc[mask, "col"] = value`. Chained assignment (`df[mask]["col"] = value`) never updates `df` under pandas 3.0 Copy-on-Write; it only raises a `ChainedAssignmentError` warning, which is easy to miss.
- **Joins:** always pass `validate="one_to_one"` / `"many_to_one"` in pandas `merge` (polars: `validate="1:1"` / `"m:1"`), and check row counts before and after. A silent many-to-many join is the commonest wrong-answer bug.
- **Types:** declare dtypes when reading (`dtype=`, `parse_dates=`, polars `schema_overrides=`). Check `df.dtypes` and `df.isna().sum()` after loading. IDs with leading zeros are strings.
- **Missing values:** decide per column (drop, impute, keep as category) and write the decision down; `mean()` skips NaN silently.
- **Polars:** prefer lazy queries (`pl.scan_parquet(...)...collect()`) on large files; expressions inside `with_columns`, not Python loops or `map_elements` when a built-in expression exists.
- **Assert as you go:** `assert df["id"].is_unique`, `assert len(out) == len(left)`, value ranges. Cheap asserts catch the errors plots hide.

## 5. Plotting

- Label axes with units, title the question the chart answers, and state n.
- Start bar charts at zero. Use the same axis scales when panels are compared.
- Show uncertainty (confidence intervals, error bars, or raw points) whenever you show an estimate.
- Prefer colour-blind-safe palettes (matplotlib `viridis`, `cividis`) and never rely on colour alone.
- Save figures from code (`fig.savefig("reports/figures/fig1.png", dpi=200, bbox_inches="tight")`), not screenshots.

## 6. Statistics pitfalls (stop and flag)

Detail and fixes in `references/statistics-pitfalls.md`. Flag to the user, do not silently "fix":

- Many tests, one reported: correct for multiple comparisons (Holm, Benjamini-Hochberg) or report all tests run.
- Deciding the analysis after seeing the data (choosing subgroups, outlier rules or covariates by which gives p < 0.05).
- Train/test leakage: scaling, imputation or feature selection fitted on all data before splitting; time-series split at random.
- Non-independent observations (repeated measures, clustered data) analysed as independent.
- Correlation reported as causation.
- p-values without effect sizes and confidence intervals; "not significant" read as "no effect".
- Simpson's paradox: a trend that reverses within groups. Check the main result by key subgroups.

If the analysis supports a regulated, clinical or financial decision, say a qualified statistician should review it.

## 7. Move code out of the notebook

When a cell is reused, longer than about 20 lines, or the analysis is going into production:

1. Move the function into `src/<package>/`, with a docstring and type hints, and import it back (`%load_ext autoreload` and `%autoreload 2` while developing).
2. Add a test in `tests/` with a small fixed DataFrame that covers the edge cases you found (empty, missing values, duplicates).
3. Leave narrative, charts and parameter choices in the notebook. Leave logic in modules.
4. For scheduled or repeated runs, convert to a script (`jupyter nbconvert --to script`) and clean it up, or run the notebook with `papermill` and parameters. Production pipelines belong in a pipeline tool, not a notebook.
5. Re-run the notebook from a clean kernel and confirm the numbers match the baseline from step 0.

## Never

- Delete or edit files in `data/raw/`.
- Report a number that only appears after running cells out of order.
- Drop rows or outliers without printing how many and why.
- Commit large data files, credentials or notebooks full of personal data outputs.

## Report back

```
Reruns clean: <yes/no, which cell failed before>
Environment: <tool, lock file, Python and key library versions>
Changes: <layout, hygiene, dataframe fixes, code moved to src/ with tests>
Statistics flags: <each issue, where, suggested fix>
Numbers changed vs baseline: <none, or which and why>
```
