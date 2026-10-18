# MongoDB indexes and aggregation recipes

Read this when designing an index for a specific query, debugging a slow aggregation, or writing a migration that reshapes documents. Confirm option names against the MongoDB manual for the server version in use.

## ESR worked example

Query:

```js
db.orders.find({ tenantId: t, status: "open", total: { $gte: 100 } }).sort({ createdAt: -1 })
```

- Equality: `tenantId`, `status`
- Sort: `createdAt`
- Range: `total`

Index: `{ tenantId: 1, status: 1, createdAt: -1, total: 1 }`. Putting `total` before `createdAt` forces an in-memory sort.

A covered query (only indexed fields in filter and projection, `_id: 0` unless `_id` is indexed in that index) shows `totalDocsExamined: 0`.

## Reading explain

```js
db.coll.find(filter).sort(sort).explain("executionStats")
db.coll.aggregate(pipeline, { explain: true })   // or .explain("executionStats") on the cursor
```

| Field | Good sign | Bad sign |
|---|---|---|
| `winningPlan.stage` tree | `IXSCAN` → `FETCH` | `COLLSCAN`; `SORT` stage (in-memory sort) |
| `totalKeysExamined` / `nReturned` | close to 1 | much larger: index not selective or wrong order |
| `totalDocsExamined` / `nReturned` | close to 1 | large: filter applied after fetch |
| `rejectedPlans` | few | many similar indexes competing |

Use the profiler only with the user's agreement on shared servers: `db.setProfilingLevel(1, { slowms: 100 })`, then `db.system.profile.find().sort({ ts: -1 }).limit(10)`. Turn it off afterwards with `db.setProfilingLevel(0)`. On Atlas, the Query Profiler and Performance Advisor show the same without changing settings.

## Index options

```js
db.users.createIndex({ email: 1 }, { unique: true, collation: { locale: "en", strength: 2 } })   // case-insensitive unique
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })                             // TTL at the stored date
db.orders.createIndex({ status: 1, createdAt: -1 }, { partialFilterExpression: { status: "open" } })
db.coll.hideIndex("old_index_name")    // test dropping without losing it
db.coll.unhideIndex("old_index_name")
```

- A query uses a collation-specific index only if it specifies the same collation.
- A partial index is used only when the query filter implies the partial expression.
- The TTL monitor runs periodically, so expired documents disappear with some delay; don't rely on it for exact expiry.
- A multikey index (on an array field) can't be compound with a second array field.

## Aggregation patterns

Top N per group:

```js
db.orders.aggregate([
  { $match: { tenantId: t, createdAt: { $gte: since } } },
  { $sort: { customerId: 1, total: -1 } },
  { $group: { _id: "$customerId", top: { $firstN: { input: "$$ROOT", n: 3 } } } }
])
```

(`$firstN` needs MongoDB 5.2 or later; on older servers use `$push` then `$slice`.)

Indexed `$lookup` with a sub-pipeline (combining `localField`/`foreignField` with `pipeline` needs MongoDB 5.0 or later; older servers need `let` and `$expr`):

```js
{ $lookup: {
    from: "customers",
    localField: "customerId",
    foreignField: "_id",
    pipeline: [{ $project: { name: 1, tier: 1 } }],
    as: "customer"
}}
```

Several counts in one pass:

```js
{ $facet: {
    byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
    total:    [{ $count: "n" }]
}}
```

Precompute a report: end the pipeline with `{ $merge: { into: "daily_sales", on: "_id", whenMatched: "replace" } }` and run it from a scheduled job.

## Reshaping documents safely

1. Add the new field in code that writes both shapes; read with a fallback.
2. Backfill in batches with `bulkWrite` filtered on documents missing the new field, so the job can be re-run.
3. Switch reads to the new field, then stop writing the old one, then remove it with `$unset` in batches.
4. Tighten the `$jsonSchema` validator last.
