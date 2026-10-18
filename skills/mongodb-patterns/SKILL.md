---
name: mongodb-patterns
description: MongoDB document modelling and query tuning, from embed-versus-reference decisions and unbounded-array traps to compound indexes ordered by the ESR rule, reading explain executionStats, aggregation pipelines, multi-document transactions on replica sets, and $jsonSchema collection validation. Use when designing or changing MongoDB collections, a MongoDB query or aggregation is slow, adding indexes or validators, or deciding whether a write needs a transaction, with the native driver, Mongoose or another ODM.
license: MIT
compatibility: Any Agent Skills host. Commands are mongosh syntax; the same options exist in every official driver. Atlas-only features (Atlas Search, Performance Advisor) are noted as such.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "mongosh"
  kete-loom/owner: "Kete-org"
---

# MongoDB patterns

Model documents around how the application reads them, index for the queries it actually runs, and prove every performance claim with `explain`. The detailed recipes live in `references/indexes-and-aggregation.md`.

## 0. Before you start

1. Find the driver or ODM (native driver, Mongoose, Motor, Spring Data, Prisma) and where the connection string comes from. Search for `MongoClient`, `mongoose.connect` or the `mongodb://` / `mongodb+srv://` variable.
2. Get the server version and topology with `db.version()` and `db.hello()` (look for `setName` for a replica set, `msg: "isdbgrid"` for mongos). Transactions and change streams need a replica set or sharded cluster.
3. List the queries the feature will run: filter fields, sort, projection, and how many documents each returns. If you can't list them, **stop and ask the user**; a model can't be judged without them.
4. Never run `dropDatabase`, `drop`, `deleteMany({})`, `updateMany` without a tight filter, or a `collMod` that tightens validation on a shared or production database without the user's explicit approval. Build indexes on large production collections only after the user has agreed on timing; they consume I/O while they build.

## 1. Embed or reference

Embed when the data is read together, owned by the parent, and bounded in size. Reference when it is shared, updated on its own, or grows without limit.

| Relationship | Default |
|---|---|
| One-to-few, read with the parent (addresses, line items of an order) | Embed an array |
| One-to-many, unbounded (comments on a post, events of a device) | Separate collection with the parent's `_id` indexed on the child |
| Many-to-many (students and courses) | Array of IDs on the side queried most, or a link collection |
| Data shared by many parents and edited (product name in old orders) | Reference; copy only fields that should freeze at write time (the price paid) |

Rules:

- A document is at most 16 MiB. Any array that grows with user activity must have a hard cap or live in its own collection. Large, frequently rewritten arrays also make every update expensive.
- Design so the common page loads with **one query**. If it needs `$lookup` on every request, reconsider the model (or accept it knowingly for low-traffic paths).
- Duplicating a field is fine when you know who updates the copies. Write it down in the code next to the update.
- Use the **bucket** pattern for time series on older servers (one document per device per hour), or a native time series collection (`db.createCollection(name, { timeseries: { timeField, metaField } })`).
- Use the **subset** pattern for large related lists: embed the latest N, keep the rest in a separate collection.

## 2. Indexes

- Every query in a request path needs an index that supports its filter and sort. A `COLLSCAN` in `explain` on a large collection is a bug.
- Order compound index keys by **ESR**: **E**quality fields first, then **S**ort fields, then **R**ange fields (`$gt`, `$lt`, `$in` with many values, regex).
- One compound index can serve its prefixes: `{ tenantId: 1, status: 1, createdAt: -1 }` also serves `{ tenantId: 1 }`. Drop indexes that are a prefix of another.
- Use partial indexes (`partialFilterExpression`) for queries that only touch a subset, unique indexes for invariants, and TTL indexes (`expireAfterSeconds`) for expiring data.
- Each index costs RAM and slows every write. Check usage with `db.coll.aggregate([{ $indexStats: {} }])` before adding more, and propose removing unused ones (hide them first with `db.coll.hideIndex(name)` to test safely).

Verify with:

```js
db.orders.find({ tenantId: t, status: "open" }).sort({ createdAt: -1 }).explain("executionStats")
```

Read `winningPlan` (want `IXSCAN`, no in-memory `SORT` stage), `totalKeysExamined` and `totalDocsExamined` against `nReturned` (want them close), and `executionTimeMillis`. Report these numbers before and after.

## 3. Aggregation

- Put `$match` first and `$project`/`$unset` early so later stages see fewer, smaller documents; only the leading `$match` and `$sort` can use an index.
- `$lookup` needs an index on the foreign field. Avoid `$lookup` inside hot request paths when an embed would do.
- Each blocking stage (`$group`, `$sort` without an index, `$bucket`) has a 100 MB memory limit before it spills to disk or errors, depending on `allowDiskUse` and the server default. Spilling is slow; prefer narrowing earlier.
- Use `$facet` for several counts over one result set instead of several round trips, and `$merge`/`$out` to precompute heavy reports on a schedule.
- Paginate with a range on an indexed key (`_id > lastSeenId`), not large `skip` values.

## 4. Transactions

- A single-document write is already atomic, including its embedded arrays. Model so most invariants live in one document; reach for a transaction only when several documents must change together.
- Transactions need a replica set or sharded cluster, and by default must finish within 60 seconds (`transactionLifetimeLimitSeconds`). Keep them short and touch few documents.
- Use the driver's callback API (`session.withTransaction(fn)`), which retries on `TransientTransactionError` and `UnknownTransactionCommitResult`. Pass the session to **every** operation inside, or that operation runs outside the transaction.
- Use `writeConcern: { w: "majority" }` and `readConcern: "snapshot"` for transactions whose result must survive failover.
- Outside transactions, guard concurrent updates with conditional filters (`updateOne({ _id, version: 3 }, { $set: {...}, $inc: { version: 1 } })`) and check `matchedCount`.

## 5. Schema validation

Keep the database honest even if one service skips the ODM's checks:

```js
db.runCommand({
  collMod: "orders",
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["tenantId", "status", "total"],
    properties: {
      status: { enum: ["open", "paid", "cancelled"] },
      total: { bsonType: "decimal" }
    }
  }},
  validationLevel: "moderate",
  validationAction: "error"
})
```

- Roll out on an existing collection with `validationAction: "warn"` first, check the logs for violations, fix the data, then switch to `"error"`. `validationLevel: "moderate"` checks inserts and updates to documents that are already valid; updates to documents that were already invalid are not checked, so fix those in a backfill.
- Store money as `Decimal128` or integer minor units, never as a double. Store dates as BSON dates, not strings.

## Never

- Build query filters from raw request JSON; a body like `{ "$ne": null }` becomes an operator. Validate types or use a sanitiser, and reject keys starting with `$`.
- Use `$where` or server-side JavaScript on user input.
- Let arrays grow without a limit inside a document.
- Claim a query is fast without `explain("executionStats")` output.

## Report format (when reviewing)

```
MongoDB review: <collections or feature>
Topology/version: <replica set | sharded | standalone>, <version>
Findings:
1. [severity] <file:line or collection>: <problem> → <fix>
Explain evidence: <query> keys/docs examined vs returned, before → after
Not verified: <anything you could not run>
```
