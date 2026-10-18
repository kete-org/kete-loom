---
name: java-testing
description: Writes and repairs JVM tests in Java with JUnit Jupiter, AssertJ assertions, Mockito mocks, parameterized cases, Testcontainers-backed integration tests and Spring Boot test slices, and tracks down flaky tests. Use when adding unit or integration tests to a Java project, choosing between a mock and a real database container, speeding up a slow Java test suite, or diagnosing a JUnit test that passes locally and fails in CI.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK and the project's Maven or Gradle build; Testcontainers needs a running Docker-compatible engine.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "java"
  kete-loom/owner: "Kete-org"
---

# Java testing

Tests that state behaviour, fail for one reason, and run the same way on every machine.

## 0. Before you start

1. Find the test stack in the build file: `junit-jupiter` (JUnit 5, or JUnit 6 which needs Java 17+), `junit:junit` (JUnit 4), `assertj-core`, `mockito-core` / `mockito-junit-jupiter`, `org.testcontainers`, `spring-boot-starter-test`. Use what is there; don't add a second assertion or mocking library.
2. Find how tests run: `./mvnw test` (Surefire, unit), `./mvnw verify` (Failsafe, `*IT` classes), `./gradlew test`. Run one class with `./mvnw test -Dtest=OrderServiceTest` or `./gradlew test --tests 'com.example.OrderServiceTest'`.
3. Run the suite once and record the result. If it already fails, stop and tell the user which tests fail before you change anything.

## 1. Pick the test level

| What you're testing | Level | Tools |
|---|---|---|
| Pure logic, value objects, mappers | unit | JUnit + AssertJ, no mocks |
| A class with collaborators you own | unit | Mockito for the collaborators at the boundary |
| SQL, migrations, repository queries | integration | Testcontainers with the real database engine |
| HTTP layer only (Spring) | slice | `@WebMvcTest` + `MockMvc` |
| JPA repositories only (Spring) | slice | `@DataJpaTest` + Testcontainers |
| Whole service wiring | integration | `@SpringBootTest`, used sparingly |

Rules: don't mock what you don't own (wrap the third-party client and mock the wrapper, or use a fake server); don't mock value objects or records; don't test a database with H2 when production runs PostgreSQL or MySQL, because dialect differences hide bugs.

## 2. Write the test

```java
class PriceCalculatorTest {
    private final PriceCalculator calc = new PriceCalculator(new FixedTaxRate("0.15"));

    @Test
    void appliesTaxToSubtotal() {
        Money total = calc.total(List.of(item("10.00"), item("5.00")));
        assertThat(total).isEqualTo(Money.of("17.25"));
    }

    @ParameterizedTest
    @CsvSource({"0, 0.00", "1, 1.15", "100, 115.00"})
    void scalesLinearly(int qty, String expected) {
        assertThat(calc.total(List.of(item("1.00", qty)))).isEqualTo(Money.of(expected));
    }

    @Test
    void rejectsEmptyCart() {
        assertThatThrownBy(() -> calc.total(List.of()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("empty");
    }
}
```

- One behaviour per test; name it for the behaviour (`rejectsEmptyCart`), or use `@DisplayName`.
- Arrange, act, assert, in that order, with no logic (loops, ifs) in the test.
- Prefer AssertJ (`assertThat(list).containsExactly(...)`, `extracting`, `satisfies`) over bare `assertTrue`, so failures print the values.
- Parameterize instead of copy-pasting: `@ValueSource`, `@CsvSource`, `@MethodSource`, `@EnumSource`.
- Test classes and methods can be package-private in JUnit Jupiter; don't add `public`.

## 3. Mockito

```java
@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {
    @Mock PaymentGateway gateway;
    @InjectMocks CheckoutService service;

    @Test
    void chargesOnceForOrderTotal() {
        when(gateway.charge(any())).thenReturn(ChargeResult.ok("ref-1"));
        service.checkout(order("25.50"));
        verify(gateway).charge(argThat(c -> c.amount().equals(Money.of("25.50"))));
        verifyNoMoreInteractions(gateway);
    }
}
```

- `MockitoExtension` uses strict stubs: an unused `when(...)` fails the test. Remove the stub rather than switching to lenient.
- Stub return values for queries; `verify` only commands (calls whose side effect is the point).
- Use `ArgumentCaptor` when you need to assert several fields of an argument.
- Mockito 5 uses the inline mock maker by default, so final classes and records can be mocked; mock them only when there is no simpler real instance.
- On JDK 21+, Mockito's self-attaching agent prints a dynamic agent loading warning; the fix is to pass the `mockito-core` jar as `-javaagent` in the Surefire `argLine` or Gradle `jvmArgs`. Check Mockito's current docs for the exact snippet.

## 4. Integration tests with Testcontainers

```java
@Testcontainers
class OrderRepositoryIT {
    @Container
    static PostgreSQLContainer db = new PostgreSQLContainer("postgres:16-alpine");
    // connect with db.getJdbcUrl(), db.getUsername(), db.getPassword()
}
```

- Testcontainers 2.x renamed module artifacts (`org.testcontainers:testcontainers-postgresql`) and moved classes (`org.testcontainers.postgresql.PostgreSQLContainer`, no type parameter); 1.x uses `org.testcontainers:postgresql` and `org.testcontainers.containers.PostgreSQLContainer<?>`. Match the version in the build file.
- Pin the image tag to the version production runs; never use `latest`.
- `static` containers start once per class; instance containers restart per test (slow).
- In Spring Boot 3.1+, annotate the container field with `@ServiceConnection` instead of wiring `@DynamicPropertySource` by hand.
- With `@DataJpaTest`, if the test still connects to an embedded database, add `@AutoConfigureTestDatabase(replace = Replace.NONE)`.
- Run the real migrations (Flyway, Liquibase) against the container so schema and code are tested together.
- Clean data between tests (truncate tables, or a transaction rolled back per test) so order doesn't matter.
- If Docker isn't available, stop and tell the user; don't fall back to H2 silently.

## 5. Flaky tests

Reproduce first: rerun the single test many times (a `@RepeatedTest(50)` locally, or a loop over the single-test command), then the whole class, then with the CI's JVM flags and parallelism.

| Symptom | Usual cause | Fix |
|---|---|---|
| Fails only with other tests | shared static state, leftover DB rows, test order | reset state in `@BeforeEach`; isolate data |
| Fails on slow CI | `Thread.sleep` waits, fixed timeouts | poll with Awaitility (`await().atMost(...).until(...)`) |
| Fails near midnight or in other zones | `LocalDate.now()`, default time zone | inject a `java.time.Clock`; use `Clock.fixed` in tests |
| Fails on assertion order | `HashMap`/`HashSet` iteration | `containsExactlyInAnyOrder`, or sort |
| Port already in use | hard-coded ports | random ports; Testcontainers mapped ports |

Never fix flakiness by adding retries, raising timeouts blindly, or `@Disabled`. If you can't find the cause, report what you tried and leave the test enabled.

## 6. Coverage and speed

- If the project uses JaCoCo, run its report goal and look at uncovered branches in the code you changed, not the global number.
- Keep unit tests free of Spring context and containers. Reuse one Spring context across tests by keeping configuration identical; each distinct `@MockBean`/`@MockitoBean` set forces a new context.

## Never

- Delete, skip or weaken an existing test to make the suite pass without the user's agreement.
- Assert on log output or `toString()` when a real return value or state is available.
- Use `Thread.sleep` to wait for asynchronous work.
- Leave `System.out.println` debugging in tests.

## Finish

Run the test command for the classes you touched, then the full suite. Report the tests added or changed, the command and its result, and any flaky test you could not fix.
