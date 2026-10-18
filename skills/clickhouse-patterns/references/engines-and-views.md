# ClickHouse engines and materialised view recipes

Read this when choosing an engine, writing a rollup, or deduplicating. Check syntax against clickhouse.com/docs for the server version in use. On ClickHouse Cloud, write the plain engine name (`MergeTree`, `ReplacingMergeTree`); the service maps it to its shared engine. On a self-hosted cluster, use the `Replicated*` variant with the `ON CLUSTER` conventions the existing tables use.

## Choosing an engine

| Engine | Merges rows with the same sorting key by | Use for |
|---|---|---|
| `MergeTree` | nothing (keeps all rows) | raw events, logs, append-only facts |
| `ReplacingMergeTree(version)` | keeping the row with the highest `version` (or the last inserted) | latest state per entity, upserts, CDC from OLTP |
| `SummingMergeTree` | summing numeric columns | simple counters per key |
| `AggregatingMergeTree` | merging `AggregateFunction` states | rollups with `uniq`, `quantile`, `avg` |
| `CollapsingMergeTree(sign)` / `VersionedCollapsingMergeTree` | cancelling `+1`/`-1` row pairs | changing aggregates with explicit cancel rows |

All merging is eventual. Queries must be correct before merges happen.

## Raw events table

```sql
CREATE TABLE analytics.events
(
    tenant_id   UInt32,
    event_type  LowCardinality(String),
    ts          DateTime64(3),
    user_id     UInt64,
    session_id  String,
    props       String CODEC(ZSTD(3))
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (tenant_id, event_type, toDate(ts), user_id)
TTL toDateTime(ts) + INTERVAL 13 MONTH
SETTINGS ttl_only_drop_parts = 1;
```

## Latest state with ReplacingMergeTree

```sql
CREATE TABLE app.users_latest
(
    user_id    UInt64,
    email      String,
    plan       LowCardinality(String),
    updated_at DateTime64(3),
    is_deleted UInt8 DEFAULT 0
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;
```

Read the current state either way:

```sql
SELECT * FROM app.users_latest FINAL WHERE is_deleted = 0;

SELECT user_id, argMax(plan, updated_at) AS plan
FROM app.users_latest
GROUP BY user_id;
```

`FINAL` is much cheaper on recent versions than it used to be, but still costs more than a plain read; measure it. Newer versions also accept an `is_deleted` column as a second engine parameter; check the docs for your version before relying on it.

## Daily rollup with AggregatingMergeTree

```sql
CREATE TABLE analytics.daily_events
(
    tenant_id  UInt32,
    day        Date,
    event_type LowCardinality(String),
    events     SimpleAggregateFunction(sum, UInt64),
    users      AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, event_type);

CREATE MATERIALIZED VIEW analytics.daily_events_mv TO analytics.daily_events AS
SELECT tenant_id, toDate(ts) AS day, event_type,
       count() AS events,
       uniqState(user_id) AS users
FROM analytics.events
GROUP BY tenant_id, day, event_type;
```

Query it with merge functions, always grouping:

```sql
SELECT day, sum(events) AS events, uniqMerge(users) AS users
FROM analytics.daily_events
WHERE tenant_id = 42 AND day >= today() - 30
GROUP BY day ORDER BY day;
```

Backfill existing data once, in chunks by partition, with the same SELECT as the view:

```sql
INSERT INTO analytics.daily_events
SELECT tenant_id, toDate(ts) AS day, event_type, count(), uniqState(user_id)
FROM analytics.events
WHERE toYYYYMM(ts) = 202609
GROUP BY tenant_id, day, event_type;
```

To avoid double counting, create the view first, note the time, and backfill only rows before it, or pause ingestion during the switch.

## Materialised view gotchas

- The view's SELECT runs on each inserted **block**, not on the whole table. A `GROUP BY` in it aggregates within the block only; the target engine finishes the job.
- A failing view makes the insert into the source fail. Test the view's SELECT on sample data first.
- Joins inside an incremental view read the right-hand table at insert time; later changes to it don't update old rows. Use a dictionary or a refreshable view instead.
- Changing a view: create the new target and view, backfill, switch readers, then drop the old ones.

## Refreshable view

```sql
CREATE MATERIALIZED VIEW reports.top_customers
REFRESH EVERY 1 HOUR
ENGINE = MergeTree ORDER BY revenue
AS SELECT customer_id, sum(amount) AS revenue
FROM sales.orders
GROUP BY customer_id
ORDER BY revenue DESC
LIMIT 100;
```

Each refresh replaces the content atomically. Check status in `system.view_refreshes`.

## Useful system tables

| Table | Use |
|---|---|
| `system.query_log` | slow and heavy queries, `read_rows`, `memory_usage` |
| `system.parts` | active part counts and sizes per partition |
| `system.merges` | merges in progress |
| `system.mutations` | `ALTER ... UPDATE/DELETE` progress (`is_done`) |
| `system.columns` | compressed vs uncompressed size per column |
| `system.replication_queue` | replicated table backlogs (self-hosted) |
