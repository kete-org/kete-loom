# MySQL online DDL

Always name the algorithm and lock level so the server errors instead of silently falling back to a blocking table copy:

```sql
ALTER TABLE orders ADD COLUMN note VARCHAR(200) NULL, ALGORITHM=INSTANT;
ALTER TABLE orders ADD INDEX orders_status_idx (status, created_at), ALGORITHM=INPLACE, LOCK=NONE;
```

## What the InnoDB online DDL table says (MySQL 8.4 manual)

| Change | Algorithm | Concurrent DML |
|---|---|---|
| Add column (any position) | INSTANT (default) | yes |
| Drop column | INSTANT (default) | yes |
| Add secondary index | INPLACE, no rebuild | yes |
| Drop index | INPLACE | yes |
| Extend `VARCHAR` within the same length-prefix size (both under 256 bytes, or both 256+) | INPLACE | yes |
| Extend `VARCHAR` across 255 to 256+ bytes, or shrink it | COPY | no |
| Change column data type (for example `INT` to `BIGINT`) | COPY | no |
| Convert table character set (`CONVERT TO CHARACTER SET`) | COPY (rebuild) | no |

Limits on INSTANT: not for `ROW_FORMAT=COMPRESSED` tables, tables with a `FULLTEXT` index, temporary tables or tables in the data dictionary tablespace. Each instant add or drop creates a row version; when the per-table limit is reached (64 in 8.4, 255 as of MySQL 9.1) instant changes fail with error 4092 and the table must be rebuilt. Check `INFORMATION_SCHEMA.INNODB_TABLES.TOTAL_ROW_VERSIONS`.

MariaDB has its own instant and online rules; check its `ALTER TABLE` and InnoDB online DDL docs for the server version.

Source: https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html

## Metadata locks

Even INSTANT and INPLACE DDL need a brief exclusive metadata lock at start and end. If a long transaction holds a shared metadata lock on the table, the `ALTER` waits, and every new query on the table queues behind it. Before DDL:

```sql
SET SESSION lock_wait_timeout = 5;   -- seconds to wait for the metadata lock
```

Check for long transactions first: `SELECT * FROM information_schema.innodb_trx ORDER BY trx_started;`.

## When to use an external tool

Use `gh-ost` or `pt-online-schema-change` when the change needs COPY on a large, busy table (type changes, charset conversion). Both build a shadow table, copy rows in chunks with replica-lag throttling, then swap. They need a primary key or unique key, extra disk for a full copy, and testing on staging first. `pt-online-schema-change` uses triggers; `gh-ost` reads the binary log (row format) instead.
