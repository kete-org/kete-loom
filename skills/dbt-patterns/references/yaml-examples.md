# dbt YAML examples

Check key names against the docs for the installed dbt version (docs.getdbt.com).

## Source with freshness

```yaml
# models/staging/shop/_shop__sources.yml
sources:
  - name: shop
    database: raw
    schema: shop
    loaded_at_field: _loaded_at
    freshness:
      warn_after: {count: 12, period: hour}
      error_after: {count: 24, period: hour}
    tables:
      - name: orders
      - name: customers
```

In newer dbt versions these keys live under `config:` (`freshness` from v1.9, `loaded_at_field` from v1.10), and v1.10 raises deprecation warnings for properties that moved to configs. Follow what the project's dbt version and existing files do. Sources: https://docs.getdbt.com/reference/resource-properties/freshness and https://docs.getdbt.com/docs/dbt-versions/core-upgrade/upgrading-to-v1.10

## Model with tests and a contract

```yaml
# models/marts/sales/_sales__models.yml
models:
  - name: fct_orders
    description: One row per order.
    config:
      contract: {enforced: true}
    columns:
      - name: order_id
        data_type: varchar
        data_tests: [unique, not_null]
      - name: customer_id
        data_type: varchar
        data_tests:
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: status
        data_type: varchar
        data_tests:
          - accepted_values:
              values: ['placed', 'shipped', 'returned']
      - name: amount
        data_type: numeric
```

From dbt v1.10.5, generic test arguments (`to`, `field`, `values`) can be nested under `arguments:`; older versions take them at the top level as shown. See https://docs.getdbt.com/reference/resource-properties/data-tests

## Unit test

```yaml
unit_tests:
  - name: test_order_amount_excludes_refunds
    model: fct_orders
    given:
      - input: ref('stg_shop__orders')
        rows:
          - {order_id: 'a', amount: 100, is_refund: false}
          - {order_id: 'b', amount: 40, is_refund: true}
    expect:
      rows:
        - {order_id: 'a', amount: 100}
```

## Incremental model (merge)

```sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge',
    on_schema_change='append_new_columns'
) }}

with orders as (select * from {{ ref('stg_shop__orders') }})

select * from orders
{% if is_incremental() %}
where updated_at > (select max(updated_at) from {{ this }}) - interval '3 days'
{% endif %}
```

## Snapshot (dbt 1.9+)

```yaml
# snapshots/customers_snapshot.yml
snapshots:
  - name: customers_snapshot
    relation: source('shop', 'customers')
    config:
      schema: snapshots
      unique_key: customer_id
      strategy: timestamp
      updated_at: updated_at
      hard_deletes: invalidate
```

## Slim CI job (GitHub Actions outline)

```yaml
- run: pip install dbt-core dbt-snowflake   # pin versions the project uses
- run: dbt deps
- run: ./scripts/fetch-prod-manifest.sh prod-artifacts/   # however the team stores it
- run: dbt build --select state:modified+ --defer --state prod-artifacts/ --target ci
  env:
    DBT_CI_SCHEMA: pr_${{ github.event.number }}
```

The CI target in `profiles.yml` must read that variable (`schema: "{{ env_var('DBT_CI_SCHEMA') }}"`), or the build lands in the default schema. Profiles for CI read credentials with `{{ env_var('SNOWFLAKE_PASSWORD') }}` from CI secrets.
