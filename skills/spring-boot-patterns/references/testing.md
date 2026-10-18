# Spring Boot testing reference

## Slice annotations

| Annotation | Loads | Typical collaborators |
|---|---|---|
| `@WebMvcTest(X.class)` | MVC infrastructure, controller `X`, advice, filters (not `@Configuration` or `@Component` beans) | `MockMvc` or `MockMvcTester`, `@MockitoBean` services |
| `@WebFluxTest(X.class)` | WebFlux infrastructure for controller `X` | `WebTestClient` |
| `@DataJpaTest` | JPA, repositories, `TestEntityManager`; each test rolls back | Testcontainers database |
| `@JsonTest` | Jackson configuration | `JacksonTester` |
| `@RestClientTest` | `RestClient` / `RestTemplate` builders | `MockRestServiceServer` |
| `@SpringBootTest` | The whole application | `@AutoConfigureMockMvc`, real containers |

`@DataJpaTest` replaces the datasource with an embedded one by default. To test against a container, add `@AutoConfigureTestDatabase(replace = Replace.NONE)` and import the container configuration below.

`@WebMvcTest` does not pick up a `SecurityFilterChain` defined in your own `@Configuration` class, so the slice runs Boot's default security instead of your rules. `@Import(SecurityConfig.class)` into the test; with a JWT resource server, also add `@MockitoBean JwtDecoder` so the context starts without an issuer.

## Mocks

- `@MockitoBean` and `@MockitoSpyBean` (Spring Framework 6.2+) replace `@MockBean` and `@SpyBean`. `@MockBean` is deprecated in Boot 3.4 and removed in Boot 4.
- `@MockitoBean` goes on test class fields, not in `@Configuration` classes.
- Every distinct set of mocks creates a new application context. Keep mock sets consistent across test classes so the context cache is reused.

## Example: controller slice

```java
@WebMvcTest(OrderController.class)
@Import(SecurityConfig.class)
class OrderControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean OrderService orders;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void returns404ProblemWhenMissing() throws Exception {
        when(orders.find(42L)).thenThrow(new OrderNotFoundException(42L));
        mvc.perform(get("/orders/42").with(jwt()))
           .andExpect(status().isNotFound())
           .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void rejectsAnonymous() throws Exception {
        mvc.perform(get("/orders/42")).andExpect(status().isUnauthorized());
    }
}
```

`jwt()` comes from `spring-security-test` (`SecurityMockMvcRequestPostProcessors`).

## Example: Testcontainers with service connections

```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfig {
    @Bean @ServiceConnection
    PostgreSQLContainer<?> postgres() { return new PostgreSQLContainer<>("postgres:16-alpine"); }
}
```

Import it with `@Import(TestcontainersConfig.class)` in `@SpringBootTest` classes, or in `@DataJpaTest` classes together with `@AutoConfigureTestDatabase(replace = Replace.NONE)`. `@ServiceConnection` (Boot 3.1+) sets the datasource URL and credentials, so no `@DynamicPropertySource` is needed.

## Boot 4 differences

From the Spring Boot 4.0 migration guide:

- Test support is split per technology. Add the matching test starter, for example `spring-boot-starter-webmvc-test` or `spring-boot-starter-data-jpa-test`; these bring in `spring-boot-starter-test`. Slice annotations move to the matching `spring-boot-<technology>-test` module, so imports change.
- `@SpringBootTest` no longer configures MockMvc on its own. Add `@AutoConfigureMockMvc`.
- `TestRestTemplate` needs `@AutoConfigureTestRestTemplate`; the newer `RestTestClient` uses `@AutoConfigureRestTestClient`.
- Jackson 3 is the default (`tools.jackson` packages; `@JsonComponent` becomes `@JacksonComponent`). The auto-configured mapper is a `JsonMapper`; to replace it, define a `JsonMapper` bean, because a plain `ObjectMapper` bean no longer makes it back off.

When upgrading, follow the official migration guide rather than this summary.
