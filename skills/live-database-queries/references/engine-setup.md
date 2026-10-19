# Engine setup for agent queries

Run the account setup as a database administrator, not as the agent. Names here (`agent_ro`, `reporting`) are examples.

## PostgreSQL

```sql
CREATE ROLE agent_ro LOGIN PASSWORD '<from secrets manager>';
ALTER ROLE agent_ro SET default_transaction_read_only = on;
ALTER ROLE agent_ro SET statement_timeout = '30s';
ALTER ROLE agent_ro SET lock_timeout = '5s';
ALTER ROLE agent_ro SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE agent_ro CONNECTION LIMIT 3;

GRANT CONNECT ON DATABASE app TO agent_ro;
GRANT USAGE ON SCHEMA public TO agent_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO agent_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO agent_ro;
-- PostgreSQL 14+: GRANT pg_read_all_data TO agent_ro;  (reads every table; prefer per-schema grants)
```

Role-level settings are defaults; the client can override them with `SET`, which is why grants matter. Revoke `SELECT` on sensitive tables or expose views with only safe columns.

Check what the current login can do:

```sql
SELECT current_user, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = current_user;
-- any table this login can change, directly, via PUBLIC or an inherited role; should return no rows
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND has_table_privilege(format('%I.%I', table_schema, table_name), 'INSERT, UPDATE, DELETE, TRUNCATE');
SHOW default_transaction_read_only;
```

Credentials: `~/.pgpass` (mode 0600, `host:port:db:user:password`) or a `pg_service.conf` entry, then `psql "service=reporting"`. `PGPASSWORD` works but is visible to other processes on some systems.

## MySQL and MariaDB

```sql
CREATE USER 'agent_ro'@'%' IDENTIFIED BY '<from secrets manager>' WITH MAX_USER_CONNECTIONS 3;
GRANT SELECT, SHOW VIEW ON app.* TO 'agent_ro'@'%';
```

Check: `SHOW GRANTS FOR CURRENT_USER();` should list only `SELECT` (and `SHOW VIEW`) plus `USAGE`.

Session guards: `SET SESSION TRANSACTION READ ONLY;` or `START TRANSACTION READ ONLY;`, `SET SESSION max_execution_time = 30000;` (milliseconds, SELECT only; per query use the hint `SELECT /*+ MAX_EXECUTION_TIME(30000) */ ...`), `SET SESSION sql_select_limit = 500;`. The `mysql` client's `--safe-updates` flag is a further guard for interactive use. `max_execution_time` is a MySQL variable; MariaDB uses `max_statement_time` in seconds.

Credentials: `mysql_config_editor set --login-path=reporting --host=... --user=agent_ro --password` then `mysql --login-path=reporting`, or an option file `~/.my.cnf` with mode 0600.

## SQL Server

```sql
CREATE LOGIN agent_ro WITH PASSWORD = '<from secrets manager>';
USE app;
CREATE USER agent_ro FOR LOGIN agent_ro;
ALTER ROLE db_datareader ADD MEMBER agent_ro;
DENY SELECT ON SCHEMA::hr TO agent_ro;          -- example of carving out sensitive data
```

Check: `SELECT IS_ROLEMEMBER('db_datareader'), IS_ROLEMEMBER('db_datawriter'), IS_ROLEMEMBER('db_owner'), IS_SRVROLEMEMBER('sysadmin');` should return 1, 0, 0, 0.

Connection: `sqlcmd -S host -d app -t 30` with credentials from environment variables (`SQLCMDUSER`, `SQLCMDPASSWORD`) or integrated authentication. `ApplicationIntent=ReadOnly` (sqlcmd `-K ReadOnly`) routes to a readable secondary in an Always On availability group; it does not restrict permissions.

There is no session-level read-only mode, so rely on `db_datareader`, and for extra safety run the query inside `BEGIN TRANSACTION ... ROLLBACK`.
