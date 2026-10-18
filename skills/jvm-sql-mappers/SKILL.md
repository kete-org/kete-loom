---
name: jvm-sql-mappers
description: Writes and reviews SQL-first data access on the JVM without an ORM session, using MyBatis XML or annotation mappers with dynamic SQL and resultMaps, jOOQ's generated typesafe DSL, or Kotlin Exposed DSL and DAO tables, plus explicit transaction boundaries, HikariCP pool sizing, JDBC batch inserts and loading child rows without one query per parent. Use when a Java or Kotlin service uses MyBatis, jOOQ or Exposed rather than JPA, a mapper or query builder produces the wrong or slow SQL, ${} string substitution needs auditing for injection, bulk inserts are slow, or the connection pool times out under load.
license: MIT
compatibility: Any Agent Skills host. Needs the project's JDK build tool (Gradle or Maven) and its test runner; integration tests need the target database, ideally through Testcontainers.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# JVM SQL mappers: MyBatis, jOOQ, Exposed

You write the SQL (or a typed DSL of it) and the library maps rows to objects. No lazy loading and no dirty checking: what you query is what runs. For JPA or Hibernate entities use the JPA skill instead.

## 0. Before you start

1. Identify the library and version from the build file (`org.mybatis`, `mybatis-spring-boot-starter`, `org.jooq`, `org.jetbrains.exposed`) and the database and driver.
2. Exposed 1.0 moved packages to `org.jetbrains.exposed.v1.*` (core, jdbc, r2dbc, dao). Check which the project imports and follow the docs for that major version.
3. Find how transactions are managed: Spring `@Transactional`, jOOQ `transaction { }`, Exposed `transaction { }`, or manual `SqlSession`.
4. Run the existing tests once. Turn on SQL logging (MyBatis `logImpl`, jOOQ `executeLogging`, Exposed `addLogger(StdOutSqlLogger)`) while you work so you see the real statements.

Read `references/examples.md` for complete mapper, DSL and batching snippets.

## 1. Rules for every library

1. **Bind every value.** Values go in as bind parameters: MyBatis `#{param}`, jOOQ `DSL.val`/typed conditions, Exposed column comparisons. Never build SQL by string concatenation.
2. **Identifiers that must be dynamic** (sort column, table suffix) come from an allow-list in code, never from the request. This is the only acceptable use of MyBatis `${}` or jOOQ `DSL.field(name(...))` from input.
3. **Select only the columns you use.** No `select *` in mappers; it breaks when columns are added and wastes I/O.
4. **One transaction per unit of work**, started at the service layer, short, and never open across a remote call or user think time.
5. **Paginate** with keyset (`WHERE id > :last ORDER BY id LIMIT :n`) for large or deep lists; `OFFSET` only for small pages.
6. **Schema changes** go through migrations (Flyway or Liquibase), never `SchemaUtils.create` or `ddl` at app start in production.

## 2. MyBatis

- Put SQL in mapper XML (namespace = mapper interface) or annotations for one-liners. Map with explicit `<resultMap>`; turn on `mapUnderscoreToCamelCase` only if the project already relies on it.
- Dynamic SQL: `<where>` (drops leading AND/OR), `<if test>`, `<choose>/<when>/<otherwise>`, `<set>` for partial updates, `<foreach>` for `IN` lists. An empty list in `<foreach>` produces `IN ()`: guard it with `<if test="ids != null and !ids.isEmpty()">` or return early in code.
- Audit every `${}`: each one must be an allow-listed identifier. Replace any other with `#{}`.
- Avoid N+1: a nested `<collection select="...">` runs one query per parent. Prefer a join with a nested `<collection>` resultMap (with `<id>` columns so rows collapse correctly), or load children in a second query with `IN (...)` and group in code.
- Batching: open the session with `ExecutorType.BATCH` (or a separate batch `SqlSessionTemplate` in Spring), call the insert in a loop, `flushStatements()` every 500 to 1000 rows, commit once. A multi-row `<foreach>` `INSERT ... VALUES` works for moderate sizes but hits parameter limits on large ones.
- Generated keys: `useGeneratedKeys="true" keyProperty="id"`.

## 3. jOOQ

- Generate code from the real schema (the jOOQ codegen plugin against a migrated database, or from Flyway scripts via the DDL database) and commit the config, not hand-written table classes.
- Use one `DSLContext` configured with the pool's `DataSource` and the correct `SQLDialect`.
- Fetch into records or projections: `fetchInto(Dto.class)`, `fetch(Records.mapping(Dto::new))`.
- Nested children without N+1: `multiset(select(...).from(CHILD).where(CHILD.PARENT_ID.eq(PARENT.ID)))` mapped with `convertFrom`, or a join plus `fetchGroups`.
- Transactions: `dsl.transaction(cfg -> { DSL.using(cfg)... })`, or Spring's transaction manager if jOOQ is wired with Spring Boot's starter. Do not mix both styles in one call path.
- Batching: `dsl.batchInsert(records)` or `dsl.batch(query).bind(...).bind(...).execute()`; for very large loads, the Loader API (`loadInto`).
- Plain SQL templates (`DSL.field("...")`) are an escape hatch; pass values as `{0}` bind arguments, never concatenated.

## 4. Kotlin Exposed

- DSL: `object Users : LongIdTable("users") { val email = varchar("email", 255).uniqueIndex() }`; query with `Users.selectAll().where { Users.email eq e }`.
- DAO: `class User(id: EntityID<Long>) : LongEntity(id) { companion object : LongEntityClass<User>(Users) }`. DAO references are lazy: load children eagerly with `.with(User::orders)` or `load(...)` to avoid N+1.
- Every query runs inside `transaction(db) { }`. With coroutines on JDBC, use `suspendTransaction { }` on Exposed 1.x (`newSuspendedTransaction` on 0.x, deprecated in 1.0). It takes no `CoroutineContext`, so call it inside `withContext(Dispatchers.IO) { }`; blocking JDBC must not run on `Dispatchers.Default` or the main thread. For non-blocking drivers use the `exposed-r2dbc` module.
- Batching: `Users.batchInsert(rows) { row -> this[Users.email] = row.email }`.
- For any of the three libraries, JDBC batches only become multi-row inserts if the driver rewrites them: add `rewriteBatchedStatements=true` to a MySQL Connector/J URL, `reWriteBatchedInserts=true` to a PostgreSQL (pgjdbc) URL.
- Spring: use the Exposed Spring starter's transaction manager so `@Transactional` and `transaction {}` share a connection.

## 5. HikariCP

- Start small: `maximumPoolSize` about 10 per instance (the default) and raise it only with evidence. Total connections across all instances must stay under the database's limit minus admin headroom.
- Set `maxLifetime` (default 30 min) a little shorter than any database, proxy or firewall connection cutoff. `keepaliveTime` (default 2 min in current releases, minimum 30 s) must be shorter than any idle cutoff; lower it only if a firewall drops idle connections sooner.
- `connectionTimeout` (default 30 s) is how long a caller waits for a connection. Timeouts under load usually mean long transactions or leaked connections, not a small pool: set `leakDetectionThreshold` (off by default, minimum 2000 ms; for example 60000 ms) in staging to find the leak.
- Defaults above are from the current HikariCP README; earlier releases had `keepaliveTime` off (0) by default, so check the version in use.

## 6. Verify

1. Integration tests run against the same database engine (Testcontainers), not H2 standing in for PostgreSQL or MySQL.
2. For each changed query, log the generated SQL and run `EXPLAIN` on it with realistic data; confirm it uses the intended index.
3. For N+1 fixes, assert the statement count in a test (a counting `DataSource` proxy or the library's listener), not just the result.
4. For batching, time a load of 10,000 rows before and after.
5. Run the full test suite.

## Stop and ask the user

- A dynamic identifier cannot be allow-listed because callers pass arbitrary column names.
- A fix needs a schema change or a new index on a large production table.
- Switching libraries (for example MyBatis to jOOQ) or major versions.

## Never

- Never use `${}` or string concatenation with request data.
- Never hold a transaction or connection open across an HTTP call or message wait.
- Never raise the pool size to hide a connection leak.

## Report back

```
Library / DB: <MyBatis|jOOQ|Exposed version>, <database>
Changed queries: <mapper or method> | <problem> | <fix> | <statements before/after>
Injection audit: <each ${} or plain-SQL use and its status>
Pool: <settings changed and why>
Tests: <command> -> <result>; EXPLAIN checked for: <queries>
```
