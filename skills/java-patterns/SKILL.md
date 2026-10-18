---
name: java-patterns
description: Idiomatic modern Java (17 and 21 LTS and later) for writing and restructuring code with records, sealed interfaces, switch pattern matching, Optional, streams, checked versus unchecked exceptions, immutable collections, virtual threads and a standard Maven or Gradle layout. Use when writing new Java classes, modernising pre-17 Java code, choosing between a record, enum or sealed hierarchy, or deciding how to run blocking work concurrently on the JVM.
license: MIT
compatibility: Any Agent Skills host. Needs a JDK 17 or newer and the project's Maven or Gradle build.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "java"
  kete-loom/owner: "Kete-org"
---

# Modern Java patterns

Write Java that the compiler checks for you: model data with types, make illegal states unrepresentable, and keep mutation local.

## 0. Before you write

1. Find the language level the build actually uses: `maven.compiler.release` or `<release>` in `pom.xml`, or `java { toolchain { languageVersion = ... } }` / `options.release` in `build.gradle(.kts)`. Use only features that level allows. Never raise it without asking the user.
2. Match the codebase: if it already uses Lombok, Vavr, Guava or a null-annotation library (JSpecify, JetBrains, Checker Framework), follow that convention rather than mixing styles.
3. Feature floor, by release: records (16), sealed classes (17), pattern matching for `switch` and record patterns (21), virtual threads (21), unnamed variables `_` (22), scoped values (25). Preview features need `--enable-preview`; don't introduce them unless the project already does.

## 1. Model data

| Need | Use |
|---|---|
| Immutable value with fields, equality by value | `record` |
| Fixed set of constants | `enum` |
| One of several shapes with different data | `sealed interface` + `record` implementations |
| Mutable entity with identity (JPA entity, builder state) | ordinary class |

- Validate in the record's compact constructor and copy mutable inputs: `this.items = List.copyOf(items);`.
- A record's `equals`, `hashCode` and `toString` are generated. If a record holds an array, they compare by reference; prefer a `List`.
- Don't use records for JPA entities: they need a no-arg constructor, mutability and proxying.
- Keep sealed hierarchies in one package (or one module) and list `permits` only when the subtypes live in other files.

```java
sealed interface Payment permits Card, MobileMoney, Cash {}
record Card(String last4, Money amount) implements Payment {}
record MobileMoney(String msisdn, Money amount) implements Payment {}
record Cash(Money amount) implements Payment {}

String describe(Payment p) {
    return switch (p) {                      // exhaustive: no default needed
        case Card c -> "card ending " + c.last4();
        case MobileMoney(var msisdn, var amt) -> "MoMo " + msisdn;
        case Cash cash -> "cash";
    };
}
```

Leave `default` out of a switch over a sealed type, so adding a subtype becomes a compile error at every switch that must handle it.

## 2. Null and Optional

1. Return `Optional<T>` from methods where "no result" is a normal outcome (lookups). Never return `null` from a method declared to return `Optional`.
2. Don't use `Optional` for fields, parameters or collection elements. Return an empty collection, never `null`.
3. Consume with `map`, `filter`, `orElse`, `orElseGet` (when the default is expensive), `orElseThrow`. Avoid `isPresent()` + `get()`.
4. Check arguments at public boundaries: `Objects.requireNonNull(x, "x")`.
5. `Map.get` returns `null` for missing keys; use `getOrDefault`, `computeIfAbsent` or `containsKey` deliberately.

## 3. Collections and streams

- Prefer `List.of`, `Set.of`, `Map.of` and `List.copyOf` for immutable results. They reject `null` elements and throw on mutation.
- `stream().toList()` (16+) returns an unmodifiable list; `Collectors.toList()` makes no such promise. Pick deliberately when callers mutate the result.
- Use a stream when the pipeline reads clearly (filter, map, collect). Use a loop when you need early exit with side effects, checked exceptions, or index arithmetic.
- Never mutate shared state from inside `map` or `forEach` in a stream. Collect instead.
- `Collectors.toMap` throws on duplicate keys; pass a merge function when duplicates are possible.
- Don't add `.parallel()` without measuring; it runs on the common ForkJoinPool and rarely helps I/O-bound work.

## 4. Exceptions

1. Throw unchecked exceptions for programming errors and for failures callers can't reasonably recover from. Use checked exceptions only when the caller must handle the case.
2. Never swallow: an empty `catch`, or `catch (Exception e) { log.error(e.getMessage()); }`, hides the stack trace. Log the exception object, or rethrow wrapped with the cause: `throw new OrderException("charge failed for " + id, e);`.
3. Catch the narrowest type. Don't catch `Throwable` or `Error`.
4. Use try-with-resources for anything `AutoCloseable` (streams, JDBC connections, `ExecutorService` on 19+).
5. On `InterruptedException`, restore the flag (`Thread.currentThread().interrupt()`) before rethrowing or returning.

## 5. Immutability and equality

- Make fields `final` by default. Expose no setters unless a framework needs them.
- If you override `equals`, override `hashCode` with the same fields. Never use mutable fields in either for objects stored in a `HashSet` or as `HashMap` keys.
- Compare strings and boxed numbers with `equals`, never `==`. Compare `BigDecimal` values with `compareTo`, because `equals` also compares scale.
- Use `BigDecimal` (or integer minor units) for money, never `double`.

## 6. Concurrency

Choose by workload:

| Workload | Use |
|---|---|
| Many blocking tasks (HTTP calls, JDBC, file I/O) on 21+ | virtual threads: `Executors.newVirtualThreadPerTaskExecutor()` |
| CPU-bound work | a fixed pool sized near `Runtime.getRuntime().availableProcessors()` |
| Composing async results | `CompletableFuture` with an explicit executor |
| Shared counters / maps | `AtomicLong`, `LongAdder`, `ConcurrentHashMap` |

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<Quote>> futures = suppliers.stream()
        .map(s -> executor.submit(() -> s.fetchQuote(order)))
        .toList();
    // close() waits for all tasks
}
```

Virtual thread rules:

1. Create one per task; never pool them.
2. Limit access to scarce resources (database connections, rate-limited APIs) with a `Semaphore`, not by shrinking a pool.
3. Avoid large `ThreadLocal` caches; with millions of threads they multiply memory.
4. On JDK 21 to 23, blocking inside `synchronized` pins the carrier thread; use `ReentrantLock` around blocking calls. JDK 24+ removed most of that pinning (JEP 491).
5. Virtual threads don't make CPU-bound code faster.

General rules: guard every piece of shared mutable state with one lock or make it immutable; never call `Thread.stop`; never block inside a `CompletableFuture` callback on the common pool; give threads and executors names for diagnostics.

## 7. Build layout

- Maven and Gradle share the layout: `src/main/java`, `src/main/resources`, `src/test/java`, `src/test/resources`. Packages follow reversed domain names (`com.example.orders`).
- Use the wrapper the repo ships (`./mvnw`, `./gradlew`), never a globally installed version.
- Set the language level with `release` (Maven `maven.compiler.release`, Gradle toolchains) rather than `source`/`target`, so the compiler also checks the JDK API level.
- Pin dependency versions in one place: Maven `<dependencyManagement>` or a BOM; Gradle version catalogs (`gradle/libs.versions.toml`) or platforms.
- Common commands: `./mvnw -q verify`, `./gradlew build`, `./mvnw dependency:tree`, `./gradlew dependencies --configuration runtimeClasspath`.

## Never

- Return `null` for a collection or an `Optional`.
- Use raw types (`List` instead of `List<String>`).
- Catch an exception just to log and continue as if it succeeded.
- Add a dependency for something the JDK already does (`java.net.http.HttpClient`, `java.time`, `HexFormat`).
- Use `java.util.Date` or `Calendar` in new code; use `java.time` (`Instant`, `LocalDate`, `ZonedDateTime`).

## Stop and ask the user

- Before raising the Java release level, adding Lombok, or enabling preview features.
- Before changing a public API's signature that other modules or services call.
- When moving existing thread-pool code to virtual threads in a service that holds locks or `ThreadLocal` state you can't fully trace.

## Finish

Compile and run the tests with the project's build command. Report what changed, the Java level you targeted, and anything you left on an older pattern on purpose.
