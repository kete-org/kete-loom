---
name: quarkus-patterns
description: Quarkus service conventions for ArC CDI beans, Quarkus REST (formerly RESTEasy Reactive) endpoints, Hibernate ORM with Panache, @ConfigMapping and %dev/%test/%prod profiles, Dev Services containers, GraalVM native-image limits, and @QuarkusTest or @QuarkusIntegrationTest suites. Use when writing or debugging a Quarkus application, choosing blocking versus reactive endpoints, configuring a Quarkus extension, or getting a Quarkus build to work as a native executable.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK and the project's Maven or Gradle wrapper (or the Quarkus CLI). Dev Services and container tests need Docker or Podman. Native builds need GraalVM/Mandrel or a container runtime. Written for Quarkus 3.x.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "java"
  kete-loom/owner: "Kete-org"
---

# Quarkus patterns

Quarkus moves work to build time. Most surprises come from forgetting that: beans, config and reflection are resolved when the app is built, not when it starts. Write code that the build can see.

## 0. Before you start

1. Read the Quarkus version and extensions from `pom.xml` (`quarkus-bom`) or `build.gradle(.kts)`. Note whether the project uses `quarkus-rest` (Quarkus REST) or the legacy `quarkus-resteasy` (Classic). **Never mix** `quarkus-rest*` and `quarkus-resteasy*` extensions; that causes duplicate-implementation startup errors.
2. Find the build and test command: `./mvnw verify`, `./gradlew build`, or `quarkus build`. Run tests once and record the result; stop and tell the user if they already fail.
3. Add extensions with `./mvnw quarkus:add-extension -Dextensions="..."` or `quarkus ext add ...`, not by guessing artifact ids.

## 1. CDI (ArC)

- Default to `@ApplicationScoped` for services. Use `@Singleton` only when you need no client proxy, and `@RequestScoped` for per-request state.
- Use constructor injection; a single constructor needs no `@Inject`. Package-private field injection also works without reflection, but private field injection forces reflection; avoid it.
- ArC discovers beans at build time. A class in a dependency jar without a Jandex index is invisible; add the index (`jandex-maven-plugin`) or `quarkus.index-dependency.*` config.
- Unused beans are removed at build time. If a bean is only looked up programmatically, mark it `@Unremovable`.
- Produce third-party objects with `@Produces` methods in an `@ApplicationScoped` class.
- Use `@Startup` or `void onStart(@Observes StartupEvent ev)` for startup work; keep it fast.

## 2. REST endpoints (Quarkus REST)

- Resources use Jakarta REST annotations: `@Path`, `@GET`, `@POST`, `@Produces`, `@Consumes`. Add `quarkus-rest-jackson` (or `-jsonb`) for JSON.
- **Threading rule**: a method returning a plain type or `Response` runs on a worker thread and may block. A method returning `Uni` or `Multi` runs on the event loop and **must never block** (no JDBC, no `Thread.sleep`, no blocking HTTP). Use `@Blocking` or `@NonBlocking` to override when needed. Blocking on the event loop logs a "blocked thread" warning; treat it as a bug.
- Pick one model per service. Hibernate ORM (blocking) with plain return types is the simple default; use Hibernate Reactive with `Uni` only when the project already does.
- Return DTO records, not entities. Validate input with `quarkus-hibernate-validator` and `@Valid`.
- Map exceptions to responses with `@ServerExceptionMapper` methods (or an `ExceptionMapper`). Never leak stack traces.
- Call other services with the REST client: an interface annotated `@RegisterRestClient(configKey = "orders-api")`, injected with `@RestClient`, base URL in `quarkus.rest-client.orders-api.url`.

## 3. Panache

- Choose one style per project and keep it:
  - **Active record**: `class Order extends PanacheEntity` (gives a `Long id`), static finders like `Order.find("status", s).list()`.
  - **Repository**: `class OrderRepository implements PanacheRepository<Order>`, injected into services. Easier to mock.
- Panache entities use public fields; Quarkus rewrites access into getters and setters at build time.
- Writes need a transaction: annotate the service or resource method with `@Transactional` (`jakarta.transaction`). Reads outside a transaction work but lazy loading after the method returns fails.
- Page large queries: `find(...).page(Page.of(index, size))`. Never `listAll()` on a table that grows.
- The fetch, N+1 and locking rules in the `jpa-hibernate` skill apply here too.

## 4. Configuration and profiles

- Group related settings in an interface with `@ConfigMapping(prefix = "payments")`; use `@ConfigProperty(name = "...")` only for one-off values. Missing required values fail startup, which is what you want.
- Profiles prefix keys: `%dev.`, `%test.`, `%prod.` in `application.properties`, or `application-{profile}.properties`. A custom profile is set with `quarkus.profile`.
- Know the two kinds of config: **build-time** properties (marked with a lock in the config reference, such as `quarkus.datasource.db-kind`) are fixed when you build and can't be changed by environment at runtime. Runtime properties can be set by env vars (`QUARKUS_DATASOURCE_JDBC_URL`).
- Secrets come from environment variables or a config source like Vault or Kubernetes secrets, never committed properties.

## 5. Dev Services

- With an extension such as `quarkus-jdbc-postgresql` and **no** URL configured, dev and test mode start a container automatically. Don't configure `%dev`/`%test` datasource URLs unless you want to opt out.
- Set `quarkus.datasource.devservices.image-name` to match the production database version.
- Dev Services never runs in prod. Production config must set real URLs and credentials.
- Use `quarkus dev` (or `./mvnw quarkus:dev`) for live reload and the Dev UI at `/q/dev-ui`.

## 6. Native image constraints

Build with `./mvnw install -Dnative`, `./gradlew build -Dquarkus.native.enabled=true`, or `quarkus build --native`. Add `-Dquarkus.native.container-build=true` when no local GraalVM is installed. Native code is closed-world:

- Reflection, dynamic proxies and resources must be known at build time. Register classes used only reflectively (for example DTOs serialised by a library Quarkus doesn't know) with `@RegisterForReflection`; include resource files with `quarkus.native.resources.includes`.
- Static initialisers run at build time by default. Code that reads the clock, randomness, env vars or opens connections in a static block must be moved to runtime init.
- Prefer Quarkus extensions over plain libraries; extensions carry the native configuration.
- Run `@QuarkusIntegrationTest` against the native build. Passing JVM tests prove nothing about native.
- **Stop and ask the user** before switching a project to native: builds are slow and memory-hungry, and some libraries won't work.

## 7. Testing

- `@QuarkusTest` starts the app once per test run in JVM mode, with Dev Services, on the `test` profile. Use REST Assured (`given().when().get("/orders/1").then().statusCode(200)`).
- `@QuarkusIntegrationTest` runs the packaged artifact (jar, native binary or container) as a black box; it can't inject beans.
- Mock beans with `@InjectMock` (needs `quarkus-junit5-mockito`); it works for normal-scoped beans like `@ApplicationScoped`; a `@Singleton` bean can only be mocked with `@MockitoConfig(convertScopes = true)`, which changes its scope in the test, so prefer making the bean `@ApplicationScoped`. Beans used during startup are not mocked. Use `@TestProfile` for different config; each profile restarts the app, so use few.
- Use `@TestTransaction` to roll back database changes after each test.
- Use a test resource (`@QuarkusTestResource`, or `@WithTestResource` to group tests by resource) only for dependencies Dev Services can't provide.

## Never

- Blocking calls inside a `Uni`/`Multi` method or on the event loop.
- `quarkus-rest` and `quarkus-resteasy` in the same build.
- Private field injection or reflection-heavy libraries in a native build without registering them.
- Hard-coded datasource URLs in `%dev`/`%test` that disable Dev Services by accident.

## Before you finish

Run the tests (and `-Dnative` integration tests if the project ships native). Report: extensions added, config keys and which profile they apply to, threading model of new endpoints, tests added, and the final test counts.
