---
name: spring-boot-patterns
description: Spring Boot application structure and conventions, covering controller-service-repository layering, constructor injection, typed @ConfigurationProperties, @Transactional boundaries, Bean Validation, ProblemDetail error responses, SecurityFilterChain setup, Actuator exposure and focused test slices such as @WebMvcTest and @DataJpaTest. Use when building or changing a Spring Boot service, adding an endpoint or configuration, securing routes, wiring health checks, or writing Spring Boot tests.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK and the project's Maven or Gradle wrapper. Written for Spring Boot 3.x and 4.x; version-specific differences are called out.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "java"
  kete-loom/owner: "Kete-org"
---

# Spring Boot patterns

Write Spring Boot code that is easy to test, fails loudly on bad configuration, and keeps transactions and security explicit. For entity mapping, fetch plans and N+1 problems, use the `jpa-hibernate` skill alongside this one.

## 0. Before you change anything

1. Find the Boot version in `pom.xml` (`spring-boot-starter-parent`) or `build.gradle(.kts)` (`org.springframework.boot` plugin). Boot 3 and 4 differ in test setup and Jackson (see `references/testing.md`).
2. Find the build command: `./mvnw verify` or `./gradlew build`. Run it once and record the result. If it already fails, **stop and tell the user** before editing.
3. Read one existing controller, service and test, and follow their package layout, naming and style. Don't introduce a second style.

## 1. Structure

- Package **by feature** (`orders/`, `billing/`), not by layer, unless the project already does otherwise. Keep the `@SpringBootApplication` class in the root package so component scanning finds everything.
- Layers inside a feature:
  - **Controller**: HTTP only. Parse, validate, call one service method, map to a response DTO. No repository calls, no business rules.
  - **Service**: business rules and the transaction boundary.
  - **Repository**: Spring Data interfaces. No business logic.
- Never return JPA entities from controllers. Map to records (`record OrderResponse(...)`) so lazy fields, internal columns and cycles never leak into JSON.

## 2. Dependency injection

- Use **constructor injection** with `final` fields. One constructor needs no `@Autowired`. Never use field injection in new code.
- Prefer one implementation per interface. When there are several, choose with `@Qualifier` or a `Map<String, T>` injection, not `@Primary` scattered around.
- A circular dependency is a design bug. Split the class; don't enable `spring.main.allow-circular-references`.

## 3. Configuration

- Bind related settings to a typed record and validate it at startup:

  ```java
  @ConfigurationProperties(prefix = "payments")
  @Validated
  public record PaymentsProperties(@NotBlank String baseUrl, @NotNull Duration timeout) {}
  ```

  Register it with `@ConfigurationPropertiesScan` (or `@EnableConfigurationProperties`). Prefer this over many `@Value` fields.
- Secrets come from environment variables or a secret store, never committed `application.yml`. Relaxed binding maps `PAYMENTS_BASEURL` to `payments.base-url`.
- Profiles (`application-dev.yml`, `spring.profiles.active`) change environment details, not behaviour. Never gate business logic on a profile name.
- Set `spring.jpa.open-in-view=false` in new services so lazy loading can't run during view rendering (Boot logs a warning while it is left on).

## 4. Transactions

- Put `@Transactional` on **public service methods**, not controllers or repositories. Use `@Transactional(readOnly = true)` for queries.
- The annotation works through a proxy, so it is **ignored** on a call from another method in the same class (self-invocation) and on private methods. Move the method to another bean if it needs its own transaction.
- By default only unchecked exceptions roll back. If a checked exception must roll back, set `rollbackFor`.
- Never call a slow remote API (payment provider, email) inside a database transaction. Commit first, then call out, or use an outbox table or `@TransactionalEventListener(phase = AFTER_COMMIT)`.

## 5. Validation and errors

- Annotate request DTOs with Jakarta Bean Validation (`@NotBlank`, `@Size`, `@Email`) and the controller parameter with `@Valid`. Needs `spring-boot-starter-validation`.
- Return RFC 9457 problem details. Set `spring.mvc.problemdetails.enabled=true` or add one `@RestControllerAdvice` (extending `ResponseEntityExceptionHandler`) that maps domain exceptions to `ProblemDetail` with the right status:

  ```java
  @ExceptionHandler(OrderNotFoundException.class)
  ProblemDetail notFound(OrderNotFoundException e) {
      return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
  }
  ```

- Never return stack traces, SQL or exception class names to clients. Log them server-side with a correlation id.
- Don't catch an exception just to log and rethrow it; let the advice handle it once.

## 6. Security basics

- Configure Spring Security with a `SecurityFilterChain` bean (the old `WebSecurityConfigurerAdapter` is gone):

  ```java
  @Bean
  SecurityFilterChain api(HttpSecurity http) throws Exception {
      return http
          .authorizeHttpRequests(a -> a
              .requestMatchers("/actuator/health/**").permitAll()
              .anyRequest().authenticated())
          .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
          .build();
  }
  ```

- Deny by default: end with `.anyRequest().authenticated()` (or `denyAll()`), and permit only named paths.
- Disable CSRF only for stateless token-authenticated APIs; keep it for cookie sessions.
- Hash passwords with `PasswordEncoderFactories.createDelegatingPasswordEncoder()` (bcrypt by default). Never store or log raw passwords or tokens.
- Check ownership in the service ("does this order belong to the caller?"), not only the role. `@PreAuthorize` needs `@EnableMethodSecurity`.
- **Stop and ask the user** before changing who can reach an endpoint, the auth mechanism, or CORS origins.

## 7. Actuator

- Add `spring-boot-starter-actuator`. Only `health` is exposed over HTTP by default; keep it that way and expose more by name (`management.endpoints.web.exposure.include=health,info,prometheus`), never `*` on a public port.
- Use the liveness and readiness health groups (`/actuator/health/liveness`, `/actuator/health/readiness`, enabled by default) for container probes. Readiness may check dependencies; liveness must not, or a database outage restarts every pod.
- Put management on a separate port (`management.server.port`) when the platform allows, and protect anything beyond health.

## 8. Testing

Use the narrowest slice that covers the behaviour. Details, annotations and Boot 3 versus 4 differences are in `references/testing.md`.

| What you test | Use |
|---|---|
| Pure business logic | Plain JUnit, no Spring context |
| Controller: routing, validation, status codes, JSON | `@WebMvcTest(OrderController.class)` with `@MockitoBean` services; `@Import` your security config |
| Repository queries and mappings | `@DataJpaTest` with `@AutoConfigureTestDatabase(replace = NONE)` and a Testcontainers database |
| Full wiring, security and config | `@SpringBootTest` sparingly, with `@ServiceConnection` containers |

- Assert status, body and problem details for error paths, not only the happy path.
- Test security rules: an unauthenticated request gets 401, the wrong user gets 403 or 404.
- Don't use H2 to stand in for PostgreSQL or MySQL in repository tests; dialect differences hide real bugs.

## Never

- Field injection, entities in API responses, or `@Transactional` on private or self-invoked methods.
- `permitAll()` on everything "for now", or `exposure.include=*` in production.
- `spring.jpa.hibernate.ddl-auto=update` or `create` outside local dev; use migrations.
- Catching `Exception` in controllers and returning 200 with an error message.

## Before you finish

Run the full build (`./mvnw verify` or `./gradlew build`). Report: what changed (files), new config keys and their defaults, security rules touched, tests added, and the final test counts.
