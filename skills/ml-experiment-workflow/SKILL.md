---
name: ml-experiment-workflow
description: Plans and runs machine learning experiments so results can be trusted, from a dumb baseline and leakage-free train, validation and test splits, through tracked runs, metrics chosen to match the business goal, and ablations, to turning a notebook into a repeatable pipeline. Use when starting a new model, comparing approaches, deciding whether an improvement is real, or productionising notebook experiments.
license: MIT
compatibility: Any Agent Skills host. Framework-agnostic (scikit-learn, PyTorch, XGBoost and others); needs Python to run experiments.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: runs-commands
  kete-loom/requires: "python, git"
  kete-loom/owner: "Kete-org"
---

# ML experiment workflow

An experiment is only useful if someone else could rerun it and get the same answer, and if the number it reports means what the user thinks it means. Follow these steps in order. For PyTorch training-loop mechanics use the `pytorch-patterns` skill; for evaluating LLM outputs use `llm-evals`.

## 1. Pin down the goal

Write these down with the user before touching data:

1. **Decision.** What will be done differently if the model is good? (Auto-approve claims, rank search results, flag churn risk.)
2. **Metric that matches it.** Pick from the cost of errors, not habit:
   - Imbalanced classes: precision/recall at an operating threshold, PR-AUC, or cost-weighted error. Accuracy is misleading when one class is 95% of the data.
   - Ranking: NDCG@k, recall@k, MRR at the k the product shows.
   - Probabilities used downstream: log loss and calibration (Brier score, reliability plot).
   - Regression: MAE when all errors cost the same, RMSE when large errors are much worse, MAPE only when targets are never near zero.
3. **Bar to beat.** The current system's number, or a minimum the decision needs.
4. **Unit of prediction.** Per user, per transaction, per day? This drives the split.

**Stop and ask** if the user cannot name the decision or the metric. Don't pick one silently.

## 2. Split without leakage

Decide the split before any exploration, then never look at the test set until the end.

- **Time-ordered data** (forecasting, anything predicted about the future): split by time. Train on the past, validate and test on later periods. Use `TimeSeriesSplit` or a rolling-origin scheme, not random K-fold. When the label looks ahead (for example "churns in the next 30 days"), leave a gap of at least that horizon between train and validation (`TimeSeriesSplit(gap=...)`) so training labels do not overlap the validation period.
- **Grouped data** (several rows per patient, user, device, document): split by group so no group appears on both sides. Use `GroupKFold` / `GroupShuffleSplit`.
- **Imbalanced labels**: stratify (`StratifiedKFold`, `StratifiedGroupKFold`).
- **Duplicates**: dedupe, or group near-duplicates, before splitting.

Leakage checklist (any yes means fix before continuing):

- Is any preprocessing (scaling, imputation, target encoding, feature selection, vocabulary, PCA) fitted on data that includes validation or test rows? Fit it inside the training fold only; in scikit-learn, put it in a `Pipeline` passed to cross-validation.
- Does any feature use information not available at prediction time (a later timestamp, a status set after the outcome, an aggregate over the whole dataset)?
- Was the test set used to choose features, hyperparameters, thresholds or the stopping epoch?
- Is a feature suspiciously predictive on its own? Check top-importance features one by one.

## 3. Baselines first

Before any real model, record:

1. A trivial baseline: majority class / mean prediction / "same as last period" / popularity ranking.
2. A simple model: logistic or linear regression, or gradient-boosted trees for tabular data, with default settings.
3. The current production system, if there is one.

If a complex model does not clearly beat the simple one, report that; it is a result, not a failure.

## 4. Track every run

Each run records, automatically:

- git commit (and whether the tree was dirty), config/hyperparameters, seed
- dataset version: file hash, snapshot id or query plus date
- metrics on validation (and test only for the final run), with the split definition
- environment: Python and key library versions, hardware
- artifacts: model file, predictions on the validation set

Use whatever the project already has (MLflow, Weights & Biases, DVC, a CSV log). If there's nothing, write one JSON line per run to a log file and commit the code that writes it. Don't add a tracking service the user did not ask for.

## 5. Decide whether a gain is real

- Run the leading candidates with at least 3 seeds (or use cross-validation folds) and report mean and spread, not the best run.
- A gain smaller than the seed-to-seed spread is noise. Say so.
- For a single held-out set, use a paired bootstrap over test examples to get an interval on the difference.
- Compare models on the same split, the same preprocessing and the same eval code.
- Look at the errors: slice the metric by important segments (region, device, class, new vs returning users). An average gain that hides a regression on a key segment must be reported.

## 6. Ablations

When a model has several changes stacked together, remove one at a time from the final configuration and rerun. Report a table:

```
| Variant                  | Val metric (mean ± std, n seeds) | Δ vs full |
|--------------------------|----------------------------------|-----------|
| Full                     | 0.812 ± 0.004                    | —         |
| − feature group X        | 0.809 ± 0.005                    | −0.003    |
| − augmentation           | 0.781 ± 0.006                    | −0.031    |
```

Drop any component whose removal does not hurt beyond noise; it is complexity with no evidence behind it.

## 7. From notebook to pipeline

Do this once an approach is worth keeping:

1. Move code out of cells into modules with functions: `load_data`, `build_features`, `split`, `train`, `evaluate`. The notebook then only imports and calls them.
2. Put every constant (paths, dates, hyperparameters, seed) in one config file.
3. Provide one command that runs the whole thing end to end, for example `python -m project.train --config configs/baseline.yaml`.
4. Add tests for the feature code and the split: a test that train and test share no group ids or overlapping time ranges is cheap and catches the worst bugs.
5. Rerun from a clean checkout and confirm the metric matches the notebook within seed noise. If it does not, find out why before anything else.

## 8. Final evaluation

Only after model, features and threshold are frozen: evaluate once on the test set. If the test result is then used to change anything, that set is no longer a test set; say so and hold out new data.

## Never

- Never report a test-set number that was used for tuning.
- Never report the best of many seeds as the result.
- Never fit preprocessing on the full dataset before splitting.
- Never claim an improvement without the baseline beside it.

## Report

```
Goal: <decision> | Metric: <metric @ threshold/k> | Bar: <number>
Split: <method, sizes, date ranges or group key>
Results (validation, n seeds):
  baseline: ... | simple model: ... | candidate: ...
Test (final, once): ...
Leakage checks: <passed / issues found>
Caveats: <segments that regressed, what was not checked>
Reproduce: <exact command and commit>
```
