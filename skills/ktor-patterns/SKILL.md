---
name: ktor-patterns
description: Kotlin Ktor server guidance for Application modules, the routing DSL, installing ContentNegotiation with kotlinx.serialization, Authentication (JWT, bearer, sessions), StatusPages error mapping, structured coroutines and Dispatchers.IO for blocking work, wiring dependencies with Ktor DI or Koin, and in-process tests with testApplication. Use when writing or refactoring a Ktor backend, adding routes or plugins, fixing Ktor serialization or auth errors, or testing Ktor endpoints.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK and the project's Gradle (or Maven) wrapper. Written for Ktor 3.x; the built-in DI plugin needs a recent 3.x release.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "java"
  kete-loom/owner: "Kete-org"
---

# Ktor server patterns

Ktor gives you a small core and explicit plugins. Keep it that way: every behaviour is installed in code you can read, and every module can be started in a test.

## 0. Before you start

1. Find the Ktor version (`io.ktor` dependencies or `libs.versions.toml`) and the engine (`ktor-server-netty`, `-cio`, `-jetty`). Ktor 2 and 3 differ in some APIs; follow the version the project uses.
2. Find how the app starts: `embeddedServer(...)` in `main`, or `EngineMain` with `application.conf`/`application.yaml` listing `ktor.application.modules`.
3. Run `./gradlew test` once and record the result. If it already fails, **stop and tell the user**.

## 1. Modules and structure

- Split setup into extension functions on `Application`: `fun Application.configureSerialization()`, `configureSecurity()`, `configureRouting()`. The main `module()` calls them in order.
- Keep routes in feature files as extension functions on `Route` (`fun Route.orderRoutes(service: OrderService)`), registered inside `routing { }`.
- Routes are thin: read parameters, validate, call a service, respond. Business logic and database access live in services and repositories that don't import Ktor.
- Read config from `environment.config` (`property("payments.baseUrl").getString()`) or env vars, never hard-coded. Secrets come from the environment.

## 2. Routing

- Group with `route("/orders") { get { } ; get("{id}") { } ; post { } }`.
- Read path and query parameters defensively: `call.parameters["id"]?.toLongOrNull() ?: return@get call.respond(HttpStatusCode.BadRequest)`. Better still, throw a domain exception and map it in StatusPages.
- For typed routes, the `Resources` plugin (`@Resource` classes) gives compile-checked paths; use it if the project already does.
- `call.receive<CreateOrder>()` throws on malformed bodies; let StatusPages turn that into 400.
- Respond with DTOs annotated `@Serializable`, never database rows or internal models.

## 3. Plugins

Install each plugin once, at application level unless it must be scoped to a route.

**ContentNegotiation**

```kotlin
install(ContentNegotiation) {
    json(Json { ignoreUnknownKeys = true; explicitNulls = false })
}
```

Needs `ktor-server-content-negotiation`, `ktor-serialization-kotlinx-json` and the `kotlin("plugin.serialization")` Gradle plugin. A missing `@Serializable` or missing compiler plugin is the usual cause of "Serializer for class ... is not found".

**StatusPages**

```kotlin
install(StatusPages) {
    exception<NotFoundException> { call, e -> call.respond(HttpStatusCode.NotFound, ErrorBody(e.message)) }
    exception<BadRequestException> { call, _ -> call.respond(HttpStatusCode.BadRequest, ErrorBody("Invalid request")) }
    exception<Throwable> { call, e ->
        call.application.log.error("Unhandled", e)
        call.respond(HttpStatusCode.InternalServerError, ErrorBody("Internal error"))
    }
}
```

Map each domain exception to one status. The catch-all logs and returns a generic body; never send `e.message` or stack traces from unexpected errors to clients.

**Authentication**

```kotlin
install(Authentication) {
    jwt("auth-jwt") {
        realm = "api"
        verifier(JWT.require(Algorithm.HMAC256(secret)).withIssuer(issuer).withAudience(audience).build())
        validate { cred -> if (cred.payload.subject != null) JWTPrincipal(cred.payload) else null }
        challenge { _, _ -> call.respond(HttpStatusCode.Unauthorized) }
    }
}
routing { authenticate("auth-jwt") { orderRoutes(service) } }
```

- Everything that isn't public goes inside `authenticate(...)`. Read the user with `call.principal<JWTPrincipal>()` and check ownership in the service.
- Always verify issuer, audience and expiry. Prefer RS256 with a JWKS provider (`jwt { verifier(jwkProvider, issuer) }`) when tokens come from an identity provider.
- **Stop and ask the user** before changing which routes are public or how tokens are verified.

Other common plugins: `CallLogging` (with `callIdMdc`), `CallId`, `CORS` (list origins explicitly; never `anyHost()` in production), `Compression`, `DefaultHeaders`.

## 4. Coroutines

- Route handlers are `suspend` and run on the engine's threads. **Never block them**: wrap JDBC, file I/O and blocking SDK calls in `withContext(Dispatchers.IO) { }`, or use a non-blocking client.
- Never call `runBlocking` inside a handler or service.
- Don't start work with `GlobalScope.launch`. For fire-and-forget work tied to the app, launch in the `Application` scope (`application.launch { }`) so it is cancelled on shutdown; for durable work use a queue.
- Let `CancellationException` propagate. Don't swallow it in a `catch (e: Exception)`; rethrow it.
- Set timeouts on outbound calls (`HttpTimeout` in the Ktor client) so a slow dependency can't hold requests open.

## 5. Dependency injection

Pick one approach and keep it:

- **Manual wiring** (fine for small services): build services in `module()` and pass them into route functions.
- **Ktor DI plugin** (`ktor-server-di`): register with `dependencies { provide<OrderService>(::OrderServiceImpl) }` (constructor parameters are resolved by type) and resolve with `val service: OrderService by dependencies` or `dependencies.resolve<OrderService>()`.
- **Koin** (`koin-ktor`): `install(Koin) { modules(appModule) }` and `val service by inject<OrderService>()` in routes. Use it when the project already does.

Whatever you use, services must be constructible in a test without a running server.

## 6. Testing with testApplication

```kotlin
class OrderRoutesTest {
    @Test
    fun `returns 404 for unknown order`() = testApplication {
        application { module(orderService = FakeOrderService()) }
        val client = createClient { install(ContentNegotiation) { json() } }
        val response = client.get("/orders/999") { bearerAuth(testToken()) }
        assertEquals(HttpStatusCode.NotFound, response.status)
    }
}
```

- `testApplication` runs the app in process with no real network. Load your real modules with `application { }` so the plugins under test are the real ones; with `EngineMain`, set config via `environment { config = ApplicationConfig("application-test.conf") }`.
- The client in `createClient` is a Ktor client; install client `ContentNegotiation` to send and read JSON bodies.
- Replace external dependencies with fakes passed into the module, or with test registrations in your DI setup. Use Testcontainers for real database tests.
- Cover for each route: success, validation failure (400), unauthenticated (401), wrong owner (403 or 404), not found, and the StatusPages mapping.
- Use `externalServices { }` to stub third-party HTTP APIs the app calls.

## Never

- Blocking I/O on request threads, `runBlocking` in handlers, or `GlobalScope`.
- Returning exception messages from the catch-all handler.
- `anyHost()` CORS, or protected routes outside `authenticate { }`.
- Installing the same plugin twice (Ktor throws `DuplicatePluginException`).

## Before you finish

Run `./gradlew test` (and `./gradlew build` if there are other checks). Report: routes added or changed with their auth requirement, plugins installed or reconfigured, tests added, and the final test counts.
