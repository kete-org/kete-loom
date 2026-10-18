---
name: data-pipelines
description: Batch data pipeline engineering for extract-load-transform jobs run by an orchestrator such as Airflow, Dagster or Prefect, built so every task is idempotent and safe to rerun for any past interval, partitioned by logical date, guarded by row-count, freshness and schema checks before data is published, tolerant of late-arriving records, and traceable through lineage. Use when building or fixing a scheduled ingestion or ETL/ELT job, writing an Airflow DAG, Dagster asset or Prefect flow, planning a backfill, or chasing duplicate or missing rows after a rerun.
license: MIT
compatibility: Any Agent Skills host. Needs the project's orchestrator CLI (airflow, dagster or prefect) and warehouse client to run anything; the design rules apply to any batch pipeline.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Batch data pipelines

Build pipelines where running any task twice for the same interval gives the same result, any past day can be rebuilt on demand, and bad data stops before anyone reads it.

## Ground rules

1. **One run = one interval.** Every task processes a bounded window given by the orchestrator (`data_interval_start`/`data_interval_end` in Airflow, a partition key in Dagster, a parameter in Prefect). Never use `now()` or "since last run" inside task logic; it makes reruns and backfills give different answers.
2. **Idempotent writes.** A task replaces its output for its window: `DELETE ... WHERE partition = :d` then `INSERT` in one transaction, `MERGE` on a natural key, `INSERT OVERWRITE` of a partition, or write to a staging table and swap. Plain `INSERT`/append is only safe with a dedup step downstream on a unique key.
3. **Land raw first.** Extract to an immutable raw zone (object storage or a raw schema) keyed by source and interval, exactly as received. Transform from raw, so a logic bug is fixed by rerunning transforms, not by re-hitting the source.
4. **Check, then publish.** Data quality checks run between build and publish. A failed blocking check stops downstream tasks; consumers never see half-built or failed output.
5. **Small, single-purpose tasks.** Extract, load, transform, check, publish are separate tasks so one can be retried alone. Pass references (table names, paths) between tasks, not data.
6. **Secrets from the orchestrator's connection or secret store**, never in DAG code or the repo.

## Workflow

1. **Inventory.** Search the codebase for the orchestrator and its version (`airflow version`, `dagster --version`, `prefect version`), existing pipelines, the warehouse, and how tests run. Follow the existing patterns.
2. **Define the contract** for each output: grain (one row per what), primary key, partition column, freshness target ("yesterday's data by 06:00 UTC"), and who consumes it. If the grain or key is unclear, **stop and ask the user**.
3. **Pick the interval and schedule** from the freshness target and how the source exposes changes (full snapshot, `updated_at` watermark, change data capture, append-only events).
4. **Write extract** for one interval: paginate, retry transient errors with backoff, set timeouts, and save to the raw zone at a deterministic path such as `raw/<source>/<table>/dt=YYYY-MM-DD/`.
5. **Write load and transform** with one of the idempotent patterns from rule 2. If transforms live in dbt, the orchestrator calls dbt; model design is the `dbt-patterns` skill.
6. **Add checks** (next section) as their own tasks or asset checks.
7. **Handle late data** (below).
8. **Wire retries and alerts**: retries with delay on extract and load, no blind retries on checks, an alert on failure and on a missed freshness target.
9. **Test**: unit-test transform logic on small fixtures, then run one interval end to end, then run the same interval again and confirm row counts and checksums do not change.

Orchestrator-specific code (Airflow TaskFlow and backfills, Dagster partitioned assets and asset checks, Prefect flows and retries) is in `references/orchestrators.md`. Read it before writing or changing pipeline code.

## Data quality checks

Run at least these on every published table:

| Check | Example rule | Blocking? |
|---|---|---|
| Row count | not zero; within ±X% of the trailing 7-interval median | yes for zero, warn for drift |
| Primary key | unique and not null | yes |
| Freshness | `max(loaded_at)` within target | yes |
| Schema | expected columns and types present | yes |
| Referential | foreign keys exist in the parent table | warn, unless the user says block |
| Accepted values | status in the known set | warn |
| Reconciliation | totals match the source (count or sum per interval) | yes for money and counts reported outward |

Decide thresholds with the user; do not invent business tolerances.

## Late-arriving data

- Ask the user how late data can arrive, then pick one:
  - **Lookback window**: each run also rebuilds the previous N intervals. Simple; costs N times the compute.
  - **Partition by event time, reprocess on arrival**: detect which past partitions received new raw rows and rerun those.
  - **Partition by load time**: never late by definition; consumers filter by event time and accept that history changes.
- Keep both `event_time` and `loaded_at` on every row.
- Document the cut-off after which late rows are dropped or routed to a quarantine table, and count them.

## Backfills

1. Confirm the task is idempotent (ground rule 2) and that the source still holds the history.
2. **Stop and ask the user** before backfilling more than a few intervals against a production source or warehouse: confirm the date range, cost, source rate limits, and whether consumers will see changing numbers.
3. Run oldest first with capped concurrency, then re-run checks for the whole range.

## Lineage

- Name inputs and outputs explicitly (Airflow assets, Dagster asset dependencies, dbt `ref`/`source`) so the orchestrator draws the graph.
- If the project uses OpenLineage, emit through the orchestrator's OpenLineage integration instead of hand-written events.
- Record in each output table or its docs: source system, pipeline name, and the code version that built it.

## Never

- Never delete or overwrite the raw zone to "fix" a run.
- Never mark a failed check as passed, or downgrade it to a warning, to get a run green without the user agreeing.
- Never run a backfill or `--full-refresh` against production without confirmation.
- Never use the wall clock to decide which data a task reads.

## Report back

- Pipelines and tasks added or changed, with the output table, grain, key and partition.
- The idempotency pattern used for each write.
- Checks added and which ones block.
- Late-data policy and backfill instructions.
- Commands run and their results, including the rerun-same-interval test.
