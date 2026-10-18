# Migration recipes

Each recipe assumes a large, busy table. Set the lock timeout first (Postgres `SET lock_timeout = '3s';`, MySQL `SET SESSION lock_wait_timeout = 5;`). Check the engine docs for your exact version before relying on a "no rewrite" claim.

## Add a column

PostgreSQL: nullable, or with a non-volatile default, is a metadata-only change (since PostgreSQL 11). A volatile default such as `clock_timestamp()`, a stored generated column or an identity column rewrites the table.

```sql
ALTER TABLE orders ADD COLUMN source text;                 -- instant
ALTER TABLE orders ADD COLUMN currency text DEFAULT 'GHS'; -- instant, default stored in catalog
```

MySQL 8: `ALTER TABLE orders ADD COLUMN source VARCHAR(50) NULL, ALGORITHM=INSTANT;`

## Add NOT NULL to an existing column

PostgreSQL (12+), without a long ACCESS EXCLUSIVE scan:

```sql
ALTER TABLE orders ADD CONSTRAINT orders_source_nn CHECK (source IS NOT NULL) NOT VALID;  -- brief lock
-- backfill NULLs in batches
ALTER TABLE orders VALIDATE CONSTRAINT orders_source_nn;  -- scans, SHARE UPDATE EXCLUSIVE: reads and writes continue
ALTER TABLE orders ALTER COLUMN source SET NOT NULL;      -- skips the scan thanks to the valid CHECK
ALTER TABLE orders DROP CONSTRAINT orders_source_nn;
```

MySQL: backfill first, then `ALTER TABLE orders MODIFY source VARCHAR(50) NOT NULL, ALGORITHM=INPLACE, LOCK=NONE;`. Needs strict `sql_mode` and fails if any NULL remains. `MODIFY` replaces the whole column definition: restate the charset, collation, default and comment from `SHOW CREATE TABLE` or they are lost. This rebuilds the table; on a large table expect replica lag, or use `gh-ost` / `pt-online-schema-change`.

## Add a foreign key

PostgreSQL:

```sql
CREATE INDEX CONCURRENTLY order_items_order_id_idx ON order_items (order_id);
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders (id) NOT VALID;   -- no scan
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_order_id_fkey;
```

MySQL: adding a foreign key with `foreign_key_checks` on copies the table; test duration on a copy. Many teams enforce the reference in the app on very large MySQL tables instead; that is a decision for the user.

## Add a unique constraint

PostgreSQL:

```sql
CREATE UNIQUE INDEX CONCURRENTLY users_email_key ON users (email);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE USING INDEX users_email_key;
```

Find duplicates first (`SELECT email, count(*) FROM users GROUP BY 1 HAVING count(*) > 1;`) or the build fails and leaves an INVALID index to drop.

## Add or drop an index

- PostgreSQL: `CREATE INDEX CONCURRENTLY ...` and `DROP INDEX CONCURRENTLY ...`, each outside a transaction block. After a failed build: `DROP INDEX CONCURRENTLY name;` and retry.
- MySQL: `ALTER TABLE t ADD INDEX name (cols), ALGORITHM=INPLACE, LOCK=NONE;`

## Change a column type (for example int to bigint)

1. Add `id_new bigint` (instant).
2. Dual write: app or trigger sets `id_new = id` on insert and update.
3. Backfill in batches; verify `SELECT count(*) FROM t WHERE id_new IS DISTINCT FROM id;` is 0.
4. Build any index or constraint on `id_new` online.
5. Make `id_new` NOT NULL without a long scan (the CHECK ... NOT VALID recipe above). Foreign keys in other tables that reference `id` must be recreated against the new key (each as NOT VALID then VALIDATE); plan them as their own steps.
6. In one short transaction with a lock timeout: rename `id` to `id_old`, `id_new` to `id`, move the default or sequence, swap the primary key with `ADD CONSTRAINT t_pkey PRIMARY KEY USING INDEX <prebuilt unique index>`.
7. Later, drop `id_old`.

PostgreSQL exception: binary-coercible changes with no `USING` expression, such as `varchar(50)` to `varchar(100)` or `varchar` to `text`, skip the rewrite.

## Rename a column

Expand-contract (see SKILL.md section 2). A database-only `RENAME COLUMN` is instant but breaks every running app instance that still uses the old name; only do it in one step when the user confirms nothing runs during the deploy.

## Drop a column

1. If the column is `NOT NULL` without a default, make it nullable (or give it a default) first, or inserts fail once the code stops writing it. Then remove all reads and writes in code; for ORMs, mark the column ignored (Rails `self.ignored_columns += ["col"]`, Django: remove the field with `SeparateDatabaseAndState` so the column stays) and deploy.
2. Wait a deploy cycle.
3. Confirm a backup, then `ALTER TABLE t DROP COLUMN col;`.

## Batched backfill template

```python
last_id = load_checkpoint() or 0
while True:
    rows = db.execute(
        "UPDATE t SET new_col = old_col WHERE id IN ("
        " SELECT id FROM t WHERE id > %s AND new_col IS NULL ORDER BY id LIMIT 5000"
        ") RETURNING id", [last_id]).fetchall()
    db.commit()
    if not rows:
        break
    last_id = max(r[0] for r in rows)
    save_checkpoint(last_id)
    sleep_if_replica_lag_high()
```

`RETURNING` is PostgreSQL (and MariaDB for `DELETE`/`INSERT`); in MySQL use an ID range per batch instead.
