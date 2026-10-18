# Orchestrator notes

Check the installed version first; APIs differ between major versions. The official docs for the installed version are the final word.

## Airflow (3.x)

- Write DAGs with the TaskFlow API (`@dag`, `@task`) and pass `schedule=` (the old `schedule_interval` is gone in Airflow 3).
- `catchup` defaults to `False` in Airflow 3 (`[scheduler] catchup_by_default`). Set it explicitly on every DAG so behaviour does not depend on config.
- Read the window from the task context: `data_interval_start`, `data_interval_end`, `logical_date`. With the default `CronTriggerTimetable` in Airflow 3 the data interval can be zero-length; if the task needs a real window, use `CronDataIntervalTimetable` or compute the window from `logical_date` explicitly, and test it.
- Datasets were renamed **assets** in Airflow 3 (`from airflow.sdk import Asset`). Declare `outlets=[Asset(...)]` on producers and `schedule=[Asset(...)]` on consumers for data-aware scheduling and lineage.
- Retries: `default_args={"retries": 3, "retry_delay": timedelta(minutes=5), "retry_exponential_backoff": 2.0}`. Current Airflow 3 docs type `retry_exponential_backoff` as a float multiplier (0 = constant delay, 2.0 = doubling); Airflow 2 took a bool, so check the installed version. Set `execution_timeout` on every task.
- Limit parallel runs with `max_active_runs` on the DAG and pools for shared sources.
- Keep top-level DAG code cheap: no network or database calls at import time; the parser runs it constantly.
- Backfill (Airflow 3): `airflow backfill create --dag-id <id> --from-date 2025-01-01 --to-date 2025-01-31 --reprocess-behavior failed --max-active-runs 2`. `--reprocess-behavior` is `none`, `failed` or `completed`.
- Test one run locally with `airflow dags test <dag_id> <date>`.
- Secrets come from Connections and Variables backed by a secrets backend, read inside the task, not at parse time.

## Dagster

- Model outputs as **software-defined assets** (`@dg.asset`); dependencies come from function parameters or `deps=`.
- Partition by time with `DailyPartitionsDefinition(start_date="2025-01-01")`; read `context.partition_key` (or `context.partition_time_window`) inside the asset and write only that partition.
- Quality checks: `@dg.asset_check(asset=my_asset)` returning `AssetCheckResult(passed=..., severity=...)`, or `blocking=True` so downstream assets don't materialize on failure.
- Freshness and schedules: build a job from an asset selection and attach a schedule, or use declarative automation (`automation_condition=`).
- Backfill partitions from the UI or `dagster asset materialize --select <asset> --partition-range <start>...<end>` (the `--partition-range` flag appears in recent `dagster asset materialize --help` output but not in the CLI reference page; Dagster now recommends the `dg` CLI, so check `--help` for the installed version).
- Resources (`ConfigurableResource`) hold connections; secrets come from environment variables via `dg.EnvVar("NAME")`.

## Prefect (3.x)

- `@flow` for the pipeline, `@task` for steps. Pass the interval as flow parameters (`start: date, end: date`) so a backfill is just a run with old parameters.
- Retries: `@task(retries=3, retry_delay_seconds=[10, 60, 300])`; set `timeout_seconds`.
- Task caching: the default `cache_policy` keys on inputs, task source and the flow run ID, so a new run recomputes. A custom policy such as `INPUTS` can skip work across runs; make sure the key includes the interval, or use `NO_CACHE` for writes, otherwise a rerun silently does nothing.
- Deploy with `prefect deploy` / `flow.serve()` and a cron schedule; secrets come from Prefect `Secret` blocks or environment variables.
- Concurrency limits for shared sources: global concurrency limits or tags.

## Idempotent write snippets

Delete-insert one partition (Postgres, Snowflake, Redshift style):

```sql
BEGIN;
DELETE FROM analytics.orders_daily WHERE order_date = :ds;
INSERT INTO analytics.orders_daily SELECT ... FROM raw.orders WHERE order_date = :ds;
COMMIT;
```

Merge on a natural key:

```sql
MERGE INTO analytics.customers t
USING staging.customers_batch s ON t.customer_id = s.customer_id
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT (...) VALUES (...);
```

BigQuery or Spark/Hive partition overwrite: write the interval's rows with `INSERT OVERWRITE` (Spark, with dynamic partition overwrite mode) or a `WRITE_TRUNCATE` load job targeting the partition decorator (`table$20250131`) in BigQuery (with `bq load`, pass `--replace=true` to overwrite the partition instead of appending).

## Sources

- Airflow 3 upgrade notes (catchup default, `CronTriggerTimetable`, `airflow.sdk.Asset`): https://airflow.apache.org/docs/apache-airflow/stable/installation/upgrading_to_airflow3.html
- Airflow CLI (`backfill create`, `dags test`): https://airflow.apache.org/docs/apache-airflow/stable/cli-and-env-variables-ref.html
- Airflow Task SDK `BaseOperator` (`retry_exponential_backoff`): https://airflow.apache.org/docs/task-sdk/stable/api.html
- Dagster asset checks: https://dagster.io/docs/guides/test/asset-checks and https://dagster.io/docs/api/dagster/asset-checks
- Prefect caching and retries: https://docs.prefect.io/v3/concepts/caching and https://docs.prefect.io/v3/how-to-guides/workflows/retries
- BigQuery partition loads: https://docs.cloud.google.com/bigquery/docs/load-data-partitioned-tables
