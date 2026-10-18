---
name: jpa-hibernate
description: Jakarta Persistence and Hibernate ORM data-layer rules for entity and association mapping, LAZY-by-default fetch plans, finding and fixing N+1 selects with JOIN FETCH, entity graphs or batch fetching, transaction scope and LazyInitializationException, @Version optimistic locking, and evolving the schema through Flyway or Liquibase rather than ddl-auto. Use when mapping JPA entities, chasing slow or repeated SQL from Hibernate, fixing lazy loading or stale-update errors, or adding a database migration in a Java or Kotlin JVM project.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK and the project's build wrapper. Written for Jakarta Persistence 3.x with Hibernate ORM 6.x; applies under Spring Boot, Quarkus or plain Jakarta EE.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "java"
  kete-loom/owner: "Kete-org"
---

# JPA and Hibernate

Hibernate hides SQL, which is why most of its bugs are invisible until production. Make the SQL visible, load exactly what each use case needs, and let migrations own the schema. Mapping examples are in `references/mapping.md`.

## 0. Before you start

1. Find the Hibernate version (Hibernate 6 uses `jakarta.persistence`; 5 and older use `javax.persistence`) and the framework (Spring Data JPA, Quarkus Panache, plain `EntityManager`).
2. Find the migration tool: `db/migration/V*__*.sql` (Flyway) or a `db.changelog-master` file (Liquibase). If neither exists and the schema comes from `ddl-auto`, tell the user and propose adding one before changing tables.
3. Turn on SQL logging in dev or tests so you can count statements: `spring.jpa.show-sql=true` / `quarkus.hibernate-orm.log.sql=true`, or log `org.hibernate.SQL` at DEBUG. Add `hibernate.generate_statistics=true` when chasing N+1.

## 1. Entity mapping rules

- Every entity has a surrogate id. Use `GenerationType.SEQUENCE` (or `IDENTITY` on MySQL). `IDENTITY` disables JDBC insert batching; prefer sequences where the database supports them.
- `equals`/`hashCode`: base them on a natural business key, or on the id with a constant `hashCode()` (`getClass().hashCode()`). Never include associations or lazy fields. In Kotlin, never use a `data class` for an entity.
- Map enums with `@Enumerated(EnumType.STRING)`, never the default `ORDINAL`.
- Money: `BigDecimal` with explicit `precision` and `scale`, or integer minor units. Never `double`.
- Time: `Instant` or `OffsetDateTime` for points in time; store in UTC (`hibernate.jdbc.time_zone=UTC`; in Spring Boot `spring.jpa.properties.hibernate.jdbc.time_zone=UTC`).
- Entities need a no-arg constructor (protected is fine) and must not be `final` if they are proxied lazily (Kotlin: use the `kotlin-jpa` and `allopen` compiler plugins).

## 2. Associations and fetch strategy

- **Make every association LAZY.** `@ManyToOne` and `@OneToOne` are EAGER by default: always write `fetch = FetchType.LAZY`. Collections are already lazy.
- Prefer unidirectional `@ManyToOne` from child to parent. Add the `@OneToMany(mappedBy = ...)` side only when you really navigate it, and keep both sides in sync with helper methods (`addItem`, `removeItem`).
- Avoid `@ManyToMany` when the join has attributes or might gain them; model the join table as its own entity.
- Use `Set` or `List` deliberately: fetching two `List` collections with `JOIN FETCH` in one query throws `MultipleBagFetchException`. Fetch one collection per query, or use `Set`.
- `cascade = ALL` and `orphanRemoval = true` belong only on true parent-owned children (order → order lines), never on references to shared entities (order → customer).

## 3. Finding and fixing N+1

Symptom: one query for the list, then one more per row. Confirm by counting statements in the SQL log or statistics before changing anything.

Fix with the narrowest tool:

1. **Fetch join** for a use case that always needs the association: `select o from Order o join fetch o.customer where o.status = :s`.
2. **Entity graph** to choose fetches per query without rewriting JPQL: `@EntityGraph(attributePaths = {"customer", "lines"})` on a Spring Data method, or a `jakarta.persistence.fetchgraph` hint.
3. **Batch fetching** to turn N queries into N/size: `@BatchSize(size = 50)` on the association or `hibernate.default_batch_fetch_size=50` globally. Good default for collections you can't fetch-join.
4. **DTO projection** for read-only screens: `select new com.acme.OrderRow(o.id, c.name) from Order o join o.customer c`, or a Spring Data interface/record projection. No entities, no dirty checking, no lazy surprises.

Don't fix N+1 by switching to `FetchType.EAGER`; that loads the association everywhere and often causes more queries.

Paging with collection fetch joins makes Hibernate load every row and page in memory (it logs a warning about applying the limit in memory). Page the ids first, then fetch the entities with their collections by id. Set `hibernate.query.fail_on_pagination_over_collection_fetch=true` so this fails in tests instead of silently loading everything.

## 4. Transactions and lazy loading

- Load and use entities inside one transaction, at the service layer. `LazyInitializationException` means a lazy field was touched after the session closed; fix it by fetching what the use case needs (section 3) or mapping to a DTO inside the transaction.
- **Do not** fix it with `hibernate.enable_lazy_load_no_trans` or by enabling open-session-in-view; both hide extra queries and run them outside a transaction. In Spring Boot set `spring.jpa.open-in-view=false`.
- Changes to managed entities are flushed automatically at commit (dirty checking). Calling `save()` on an already managed entity is unnecessary.
- Use read-only transactions for queries (`@Transactional(readOnly = true)` in Spring) so Hibernate skips dirty checking.
- Bulk `update`/`delete` JPQL bypasses the persistence context; clear it afterwards (`@Modifying(clearAutomatically = true)` in Spring Data) or reload entities.
- For large batch jobs: set `hibernate.jdbc.batch_size`, and `flush()` plus `clear()` every N entities so memory stays flat.

## 5. Optimistic locking

- Add `@Version private long version;` (or `Long`/`Integer`) to entities edited concurrently by users or jobs. Hibernate adds `where version = ?` to updates and throws `OptimisticLockException` (Spring: `ObjectOptimisticLockingFailureException`) when another transaction got there first.
- Expose the version to clients (an `ETag` header or a field in the DTO) and send it back on update, so a stale form fails instead of overwriting someone's change. Map the exception to HTTP 409 or 412.
- Retry only when the operation is safe to repeat (for example a counter increment), reloading the entity each time, with a small retry limit.
- Use pessimistic locks (`LockModeType.PESSIMISTIC_WRITE`, `select ... for update`) only for short critical sections such as allocating stock, and always inside a transaction with a lock timeout.
- Never set the version field by hand.

## 6. Migrations (Flyway or Liquibase)

- The schema is owned by migrations. Set schema generation (`spring.jpa.hibernate.ddl-auto`; Quarkus `quarkus.hibernate-orm.schema-management.strategy`, called `database.generation` before 3.23) to `validate` or `none` everywhere except throwaway local experiments.
- Flyway: versioned files `V<version>__<description>.sql` under `db/migration`, applied in order and checksummed. **Never edit a migration that has run anywhere shared**; add a new one. Repeatable `R__` scripts are for views and functions.
- Liquibase: changesets identified by `id` + `author` + file; same rule, never change an applied changeset.
- Write backward-compatible migrations so old and new app versions can run during a rolling deploy (expand, migrate data, then contract in a later release). Example: add a nullable column, backfill, then add `NOT NULL` later.
- Add indexes for every foreign key and for columns in frequent `where`/`order by`. On large PostgreSQL tables use `create index concurrently` (in Flyway, put it in its own migration so it runs outside a transaction; Flyway cannot mix it with transactional statements; if the migration hangs on Flyway's lock, set `flyway.postgresql.transactional.lock=false`).
- **Stop and ask the user** before any migration that drops or renames columns or tables, rewrites a large table, or deletes data.
- Test migrations against the real database engine (Testcontainers), not H2, and run `validate` in CI.

## Never

- EAGER fetching to silence a lazy loading error, or `enable_lazy_load_no_trans`.
- `ddl-auto=update` in production, or editing an applied migration.
- Entities serialised directly to JSON.
- `ORDINAL` enums, `double` money, or `equals` over lazy associations.

## Before you finish

Run the test suite with SQL logging on for the changed queries. Report: entities and mappings changed, the statement count before and after for any N+1 fix, migrations added (file names), whether they are backward compatible, and the final test counts.
