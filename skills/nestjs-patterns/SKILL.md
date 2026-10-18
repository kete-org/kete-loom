---
name: nestjs-patterns
description: NestJS application structure and conventions, covering feature modules, providers and dependency-injection scopes, ValidationPipe with class-validator DTOs, guards, interceptors, exception filters, ConfigModule, database modules (TypeORM, Prisma, Mongoose) and Test.createTestingModule unit and e2e tests. Use when building or restructuring a NestJS API, wiring a new module or provider, fixing a circular dependency or "Nest can't resolve dependencies" error, adding auth guards, or writing NestJS tests.
license: MIT
compatibility: Any Agent Skills host. Needs Node.js and the project's package manager. Check the project's @nestjs/core major version and its migration guide before using version-specific APIs.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# NestJS patterns

Keep a Nest app boring: one feature per module, thin controllers, logic in providers, validation at the edge, and tests that swap providers instead of patching imports.

## First, look at the project

1. Read `package.json` for the `@nestjs/core` major, the HTTP adapter (`@nestjs/platform-express` or `@nestjs/platform-fastify`) and the ORM.
2. Read `src/main.ts` and `src/app.module.ts` to see global pipes, filters, prefixes and versioning already set.
3. Match existing conventions (folder layout, DTO library, error shape). Do not introduce a second ORM, validation library or config style.

Stop and ask the user before switching HTTP adapter, ORM, or moving from class-validator to a schema library: these touch every module.

## Module layout

```
src/
  main.ts
  app.module.ts
  orders/
    orders.module.ts
    orders.controller.ts      # HTTP only: route, DTO in, DTO out
    orders.service.ts         # business rules
    orders.repository.ts      # optional: data access behind an injectable
    dto/create-order.dto.ts
    orders.service.spec.ts
```

Rules:

- A module exports only the providers other modules need. Everything else stays private.
- Import a module to use its exported providers; never list another module's provider in your own `providers` array (that creates a second instance).
- Use `@Global()` only for true cross-cutting infrastructure (config, logger, database). Feature modules are never global.
- Controllers never touch the ORM directly.
- Use the CLI to scaffold (`nest g resource orders`) when the project already uses it.

## Providers and scopes

| Scope | Lifetime | Use for |
|---|---|---|
| `Scope.DEFAULT` | one instance per app | almost everything |
| `Scope.REQUEST` | one per request | per-request tenant or user context you cannot pass as an argument |
| `Scope.TRANSIENT` | one per consumer | stateful helpers each consumer must own, such as a logger with a context name |

- Request scope bubbles up: anything that injects a request-scoped provider becomes request-scoped too, which costs performance. Prefer passing the user or tenant as a method argument, or use `AsyncLocalStorage` (for example via `nestjs-cls`).
- Custom providers: `useValue` for constants and test doubles, `useClass` for swapping implementations, `useFactory` with `inject: [...]` for config-driven construction. Use a string or symbol token plus `@Inject(TOKEN)` for non-class dependencies.
- **"Nest can't resolve dependencies of X (?)"**: the `?` position names the missing dependency. Check, in order: the provider is in the module's `providers` or imported from a module that `exports` it; the import is not a type-only import (`import type` erases the token); there is no circular file import producing `undefined`.
- **Circular dependency**: first try to extract the shared logic into a third provider. Use `forwardRef(() => OtherModule)` / `@Inject(forwardRef(() => OtherService))` only when the cycle is genuine, and say so in a comment.

## Request pipeline

Order for each request: middleware, guards, interceptors (before), pipes, handler, interceptors (after), exception filters (on error).

- **Validation**: register one global pipe in `main.ts`:

  ```ts
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  ```

  `whitelist` strips unknown properties, `forbidNonWhitelisted` rejects them, `transform` turns the payload into the DTO class and converts primitive params. DTOs are classes (interfaces vanish at runtime) decorated with `class-validator`; nested objects need `@ValidateNested()` plus `@Type(() => Child)` from `class-transformer`.
- **Params**: use `ParseIntPipe`, `ParseUUIDPipe`, `ParseEnumPipe` on `@Param`/`@Query` instead of manual parsing.
- **Guards** answer "may this request run?" (`CanActivate`). Read route metadata with `Reflector` (for example a `@Roles()` or `@Public()` decorator). Register auth guards globally with `{ provide: APP_GUARD, useClass: AuthGuard }` so new routes are protected by default, and opt out with `@Public()`.
- **Interceptors** wrap the handler (`NestInterceptor`, RxJS `next.handle().pipe(...)`): response mapping, timing, caching, timeouts. They are not for authorization.
- **Exception filters**: throw built-in `HttpException` subclasses (`NotFoundException`, `ConflictException`) from services only when the service is HTTP-specific; otherwise throw domain errors and map them to HTTP in one `@Catch(DomainError)` filter. Register with `APP_FILTER` so it can inject providers. Never leak stack traces or ORM messages in the response body.

## Configuration

- `ConfigModule.forRoot({ isGlobal: true, validationSchema })` once in `AppModule`; validate env at boot so a missing variable fails startup, not the first request. The accepted schema libraries vary by major version; check the config docs for the installed version.
- Read values with `configService.getOrThrow<string>('DATABASE_URL')`. Group related settings with `registerAs('db', () => ({ ... }))` and inject the typed namespace.
- Never read `process.env` scattered through services.

## Database integration

- Use the official module for the chosen ORM (`TypeOrmModule.forRootAsync`, `MongooseModule.forRootAsync`) with `useFactory` + `inject: [ConfigService]`, or a small `PrismaService` that extends `PrismaClient` and connects in `onModuleInit`.
- Register entities or models per feature module (`TypeOrmModule.forFeature([Order])`).
- Wrap multi-write operations in a transaction from the ORM; do not rely on sequential awaits.
- Never use TypeORM `synchronize: true` outside local development; use migrations.

## Lifecycle and shutdown

- Call `app.enableShutdownHooks()` in `main.ts` so `onModuleDestroy` / `beforeApplicationShutdown` / `onApplicationShutdown` run on SIGTERM; close pools and consumers there.
- Hooks run in module dependency order; do not depend on ordering between unrelated modules.

## Testing

Follow `references/testing.md` for unit and e2e templates. The rules:

1. Unit-test services with `Test.createTestingModule({ providers: [OrdersService, { provide: OrdersRepository, useValue: fakeRepo }] })`.
2. E2E-test through HTTP: build the real `AppModule`, `.overrideProvider(...)` only external services, and apply the same global pipes/filters as `main.ts` (extract a `configureApp(app)` function and call it in both places).
3. Close the app in `afterAll` (`await app.close()`) or the test runner hangs.

## Never

- Put business logic in controllers, guards or interceptors.
- Use `any`-typed `@Body() body` without a DTO.
- Make a provider request-scoped "just in case".
- Catch an exception in a controller only to rethrow a generic 500.
- Disable `whitelist` to silence a validation error; fix the DTO.

## Before you finish

Run the project's build (`nest build` or `tsc --noEmit`), lint and test commands. Report: modules or providers added or changed, any new global pipe/guard/filter, any env variable the user must set, and test results.
