---
name: dbt-patterns
description: dbt project conventions for analytics engineering, laying models out in staging, intermediate and marts layers, declaring sources with freshness, using ref and source instead of hard-coded tables, adding data tests, unit tests and enforced model contracts, choosing an incremental strategy, building snapshots for slowly changing history, documenting columns, and running slim CI on only the modified nodes. Use when creating or restructuring a dbt project, writing or refactoring a dbt model, an incremental model gives duplicates, adding dbt tests or snapshots, or setting up dbt CI with state:modified and defer.
license: MIT
compatibility: Any Agent Skills host. Needs dbt Core or the dbt Fusion/Cloud CLI with the project's adapter installed. Examples assume dbt 1.8 or later.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "dbt"
  kete-loom/owner: "Kete-org"
---

# dbt patterns

Keep a dbt project where every model has one clear job and grain, every table is reached through `ref` or `source`, tests catch broken keys before a dashboard does, and CI builds only what changed.

## Before you start

1. Run `dbt --version` and read `dbt_project.yml`, `packages.yml` and `profiles.yml` location (never print credentials). Note the adapter (Snowflake, BigQuery, Databricks, Postgres, Redshift, DuckDB...), because incremental strategies differ by adapter.
2. Run `dbt deps` then `dbt parse` (or `dbt compile`) to confirm the project builds before you change anything. If it already fails, **stop and tell the user**.
3. Find existing conventions (folder names, prefixes, style guide, `sqlfluff` config) and follow them over this skill.

## Layers

| Layer | Folder | Prefix | Job | Materialization |
|---|---|---|---|---|
| Staging | `models/staging/<source>/` | `stg_<source>__<entity>` | 1:1 with a source table: rename, cast, light cleanup. No joins, no aggregates. | view (or ephemeral) |
| Intermediate | `models/intermediate/<area>/` | `int_<entity>_<verb>` | Reusable joins, pivots, fan-outs between staging and marts | ephemeral or view |
| Marts | `models/marts/<area>/` | `fct_<event>`, `dim_<entity>` | Business-facing tables at a stated grain | table or incremental |

Rules:

- Only staging models call `{{ source('...', '...') }}`. Everything else uses `{{ ref('...') }}`. Never hard-code `database.schema.table`.
- Write the grain at the top of each mart's YAML description ("one row per order line").
- Use CTEs: import CTEs (`with orders as (select * from {{ ref('stg_shop__orders') }})`) at the top, logic in the middle, a final `select * from final`.
- Set materializations per folder in `dbt_project.yml` (`+materialized:`), and override in a model only with a reason.

## Sources

Declare every raw table in `models/staging/<source>/_<source>__sources.yml` with `loaded_at_field` and `freshness` (`warn_after`, `error_after`), then run `dbt source freshness` in production jobs. Examples are in `references/yaml-examples.md`.

## Tests and contracts

- Every model: primary key `unique` and `not_null` under `data_tests:` (the key name since dbt 1.8; older projects use `tests:`).
- Foreign keys: `relationships`. Enumerations: `accepted_values`. Use `dbt_utils` or `dbt_expectations` only if already installed or the user agrees to add them.
- Use `severity: warn` or `config: {where: ...}` for known noisy rules; never delete a failing test to make a build pass.
- **Unit tests** (`unit_tests:` in YAML, dbt 1.8+) for tricky SQL logic: given fixed input rows, expect fixed output rows. Run with `dbt test --select test_type:unit`.
- **Model contracts** (`config: contract: {enforced: true}` plus every column's `data_type`) on marts that other teams or tools consume. A contract change is a breaking change: tell the user, and consider model `versions`.

## Incremental models

1. Use incremental only when a full rebuild is too slow or costly. Start as `table`.
2. Choose the strategy the adapter supports:
   - `merge` with `unique_key` for rows that update in place.
   - `delete+insert` with `unique_key` where merge is slow or unsupported.
   - `insert_overwrite` for whole partitions (BigQuery, Spark, Databricks).
   - `append` only for immutable events with dedup downstream.
   - `microbatch` (dbt 1.9+) for large time series: set `event_time`, `batch_size`, `begin`, optional `lookback`.
3. Filter new rows inside `{% if is_incremental() %}`, with a lookback for late data, for example `where updated_at > (select max(updated_at) from {{ this }}) - interval '3 days'` (adjust the syntax for the warehouse).
4. Set `on_schema_change` (`fail` or `append_new_columns`) rather than relying on the default `ignore`.
5. Duplicates in an incremental model almost always mean a missing or non-unique `unique_key`, or `append` used for mutable data. Test the key.
6. **Stop and ask** before running `--full-refresh` on a large production model.

## Snapshots

Use snapshots to keep history of a mutable source (type 2 slowly changing dimension). In dbt 1.9+ define them in YAML (`snapshots:` with `relation`, `config: strategy, unique_key, updated_at`); older projects use `{% snapshot %}` blocks. Prefer `strategy: timestamp` when a reliable `updated_at` exists, else `check` with `check_cols`. Set `hard_deletes` (`ignore`, `invalidate` or `new_record`) deliberately. Snapshot sources, not marts. Never drop a snapshot table: its history cannot be rebuilt.

## Documentation

- Every mart and its columns get `description:` in YAML; reuse text with `{% docs %}` blocks for shared columns.
- `dbt docs generate` builds the site and lineage graph; check it renders.
- Add `meta: {owner: ...}` if the project tracks owners.

## Slim CI

On every pull request:

1. Fetch the production `manifest.json` (from the last prod run) into a folder such as `prod-artifacts/`.
2. Run `dbt build --select state:modified+ --defer --state prod-artifacts/` against a CI schema, so unchanged parents are read from production.
3. Optionally `dbt clone --select state:modified+,config.materialized:incremental --state prod-artifacts/` first so incremental models start from production data (worth it on warehouses with zero-copy cloning).
4. Use `dbt build --empty` (1.8+) for a cheap schema-only dry run where data volumes are huge.
5. Drop the CI schema after the run.

CI config examples are in `references/yaml-examples.md`.

## Never

- Never put credentials in `dbt_project.yml` or the repo; use `env_var()`.
- Never reference another model by its physical table name.
- Never change a contracted or widely used mart's columns without telling the user who consumes it.
- Never run `dbt run` against production from a laptop unless the user asks.

## Report back

Models added or changed (name, layer, grain, materialization), tests and contracts added, the exact dbt commands run with pass, warn and error counts, and any follow-up (full refresh needed, downstream consumers affected).
