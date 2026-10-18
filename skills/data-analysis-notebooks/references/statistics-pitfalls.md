# Statistics pitfalls in exploratory analysis

For each, the sign to look for and what to do. Report the issue to the user; changing a conclusion is their call.

| Pitfall | Sign in the notebook | What to do |
|---|---|---|
| Multiple comparisons | Loops over many columns, groups or metrics with a p-value each; only the significant ones reported | Report every test run; adjust with Holm (`statsmodels.stats.multitest.multipletests(p, method="holm")`) or Benjamini-Hochberg (`method="fdr_bh"`) |
| Garden of forking paths / p-hacking | Outlier rules, subgroups or covariates changed between runs; cells commented out after a non-significant result | Write the analysis plan first; label later analyses "exploratory" |
| Optional stopping | Collecting more data until p < 0.05 | Fix sample size in advance, or use a sequential design built for it |
| Leakage | `fit` on the full dataset before `train_test_split`; target-derived features; random split of time series | Fit preprocessing inside a pipeline (`sklearn.pipeline.Pipeline`) on train only; split by time or group (`TimeSeriesSplit`, `GroupKFold`) |
| Non-independence | Several rows per person, site or day treated as independent samples | Aggregate to the unit of analysis, or use mixed models / cluster-robust errors |
| Wrong test assumptions | t-test on heavily skewed small samples; chi-square with expected counts below 5 | Check assumptions; use a rank-based test, exact test, or bootstrap |
| Significance without size | Only p-values reported | Report effect size with a confidence interval |
| Absence of evidence | "p = 0.2 so no effect" | Say the data cannot distinguish; show the interval |
| Simpson's paradox | Overall trend differs from within-group trends | Stratify by the likely confounder and show both |
| Survivorship and selection | Analysing only customers who stayed, only completed records | State who is missing and why; compare with the full population if possible |
| Regression to the mean | Extreme groups "improve" on remeasurement | Compare against a control group |
| Base rates | Accuracy reported on imbalanced classes | Report precision, recall, and the base rate; use a confusion matrix |
| Correlation as causation | Causal wording ("drives", "causes") from observational data | Use associational wording unless the design supports causal claims |

## Randomness

- Seed every random step (`np.random.default_rng(seed)`, `random_state=` in scikit-learn). Report results across several seeds when they vary.
- Bootstrap intervals: state the number of resamples and the seed.
