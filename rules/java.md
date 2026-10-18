---
name: java
description: Always-on rules for Java files, covering build tooling, null handling, exceptions, resources, concurrency and injection safety.
license: MIT
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: read-only
  kete-loom/paths: "**/*.java"
  kete-loom/owner: "Kete-org"
---

- Use the project's build tool through its wrapper (`./mvnw` or `./gradlew`), not a globally installed `mvn` or `gradle`.
- Use the project's configured formatter and static analysis; never disable a check to make the build pass.
- Use `try`-with-resources for streams, readers, connections and statements so they always close.
- Never catch and ignore an exception. Catch the narrowest type, and pass the original as the cause when wrapping.
- Never catch `Throwable` or `Error`; when catching `InterruptedException`, restore the flag with `Thread.currentThread().interrupt()`.
- Return empty collections or `Optional`, not `null`. Use `Optional` only as a return type, never for fields or parameters.
- Validate parameters at public boundaries with `Objects.requireNonNull` or explicit checks.
- Override `equals` and `hashCode` together, never one alone.
- Compare strings and boxed numbers with `equals`, never `==`.
- Pass an explicit `Charset` (`StandardCharsets.UTF_8`) when converting bytes and text.
- Use `java.time` (`Instant`, `LocalDate`, `ZonedDateTime`), never `Date` or `Calendar` in new code.
- Use `PreparedStatement` or the framework's parameter binding; never concatenate user input into SQL or JPQL. Run processes with `ProcessBuilder` and an argument list.
- Never deserialize untrusted data with `ObjectInputStream`. Disable external entities when parsing untrusted XML.
- Run concurrent work on an `ExecutorService` (or the framework's executor) and shut it down, rather than unmanaged `new Thread(...)`. Guard shared mutable state with `java.util.concurrent` types or locks.
- Use `SecureRandom`, not `Random`, for tokens and keys.

For more, load the java-patterns and java-testing skills.
