---
name: node-backend-patterns
description: Production rules for Node.js HTTP services written directly on Express or Fastify, without a full framework, including app/server split, schema validation of request input, centralised error middleware, graceful SIGTERM shutdown, structured pino logging, streaming with pipeline, helmet security headers, CORS and rate limiting. Use when starting or hardening an Express or Fastify service, adding request validation or an error handler, fixing dropped requests on deploy, or streaming large uploads and downloads.
license: MIT
compatibility: Any Agent Skills host. Needs Node.js 18+ (prefer the current LTS) and the project's package manager.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# Node backend patterns (Express and Fastify)

A Node service is production-ready when bad input is rejected at the edge, every error ends in one handler, logs are structured, and a deploy never cuts a request in half.

## First, look at the project

1. Read `package.json`: framework and major (`express` 4 vs 5, `fastify`), `"type"` (ESM or CJS), Node `engines`, existing validation (zod, TypeBox, Joi, ajv) and logger.
2. Find the entry point and check whether app construction and `listen()` are separated.
3. Keep the existing framework and libraries. Stop and ask the user before migrating Express to Fastify (or the reverse), or Express 4 to 5.

If the project is NestJS, use the `nestjs-patterns` skill instead.

## Structure

```
src/
  app.ts        # builds and returns the app; no listen(), no process handlers
  server.ts     # reads config, calls listen(), wires signals and shutdown
  config.ts     # parses and validates env once at boot
  routes/       # one router/plugin per resource
  services/     # business logic, no req/res objects
  errors.ts     # AppError classes with status and code
```

- `app.ts` exports a factory so tests can create the app without a port (`supertest(app)` for Express, `app.inject()` for Fastify).
- Route handlers parse input, call a service, shape the response. Services never see `req`/`res`.
- Validate config at boot (for example a zod schema over `process.env`) and exit with a clear message if anything is missing.

## Validation at the edge

- Validate `body`, `params`, `query` and relevant headers on every route that accepts input. Treat everything from the client as `unknown` until parsed.
- **Fastify**: declare a JSON `schema` on the route (`body`, `querystring`, `params`, `response`). Fastify validates with ajv and serializes the response with fast-json-stringify, so a `response` schema keeps undeclared fields out of the output and stops columns leaking. Use TypeBox or a type provider for static types.
- **Fastify's ajv defaults are not strict.** They are `removeAdditional: true`, `coerceTypes: 'array'` and `useDefaults: true`. So `additionalProperties: false` silently strips unknown fields instead of rejecting them, and `"5"` is coerced to `5`. If you need unknown fields rejected, set `ajv: { customOptions: { removeAdditional: false } }` on the Fastify instance. Never enable ajv `allErrors` on public routes, because it opens a DoS risk.
- **Express**: a small middleware that runs `schema.safeParse(req.body)`, returns `400` with field errors on failure, and replaces `req.body` with the parsed value.
- Set body limits explicitly (`express.json({ limit: '100kb' })`, Fastify `bodyLimit`) and reject unexpected content types.

## Errors

1. Define `AppError` subclasses with `status`, a stable `code` and a safe `message`.
2. One error handler, registered last: Express `app.use((err, req, res, next) => ...)` with four arguments; Fastify `app.setErrorHandler(...)`.
3. Known `AppError`: respond with its status and `{ error: { code, message } }`. Validation errors: `400` with field details. Anything else: log the full error with the request id and respond `500` with a generic message.
4. **Express 4 does not catch rejected promises** from async handlers; wrap them or upgrade. Express 5 and Fastify forward rejections to the error handler.
5. Also send a `404` JSON response for unmatched routes.
6. Register `process.on('unhandledRejection')` and `uncaughtException` only to log and exit non-zero; never to keep running.

## Graceful shutdown

On `SIGTERM` (and `SIGINT` locally):

1. Mark the service not ready so the readiness probe fails and the load balancer stops sending traffic. On Kubernetes, keep serving for a few seconds (or add a `preStop` sleep) so endpoint removal propagates before you close the listener.
2. Stop accepting new connections: `server.close()` (Express/`http`) or `await app.close()` (Fastify, which also runs `onClose` hooks).
3. Let in-flight requests finish; close idle keep-alive sockets with `server.closeIdleConnections()`.
4. Close database pools, queue consumers and caches.
5. Force exit with code 1 after a timeout shorter than the orchestrator's grace period (Kubernetes defaults to 30 seconds).

Template in `references/templates.md`. Never call `process.exit()` before the server has closed.

## Logging

- Use `pino` (Fastify's built-in logger; `pino-http` for Express). JSON to stdout; pretty-print only in development.
- Attach a request id to every log line (honour an incoming `x-request-id` or generate one) and return it in the response header.
- Redact secrets: `redact: ['req.headers.authorization', 'req.headers.cookie', '*.password']`.
- Never log full request bodies, tokens or card data. Never use `console.log` in request paths.

## Streaming

- Use `pipeline` from `node:stream/promises` to connect streams; it propagates errors and destroys every stream on failure. Never chain bare `.pipe()` without error handling.
- Stream large files and exports instead of buffering them into memory. Set `Content-Type` and `Content-Disposition` before writing.
- For uploads, use a streaming parser (`busboy`, `@fastify/multipart`) with size and file-count limits, and stream to storage.
- Stop work when the client disconnects (listen for `close` on the request, or pass an `AbortSignal` to downstream calls).

## Security

- Headers: `helmet` (Express) or `@fastify/helmet`. Disable `x-powered-by` in Express (`app.disable('x-powered-by')`; helmet does this).
- CORS: an explicit origin allowlist (`cors` / `@fastify/cors`). Never reflect any origin together with `credentials: true`.
- Rate limiting: `express-rate-limit` or `@fastify/rate-limit`, stricter on login, signup and password reset. Use a shared store (Redis) when running more than one instance.
- Behind a proxy, set `app.set('trust proxy', ...)` (Express) or `trustProxy` (Fastify) to the real hop count so client IPs and rate limits are correct; never `true` on a directly exposed server.
- Set timeouts: `server.headersTimeout`, `server.requestTimeout`, and timeouts on every outbound HTTP and database call.
- Run as a non-root user; keep `npm audit` or the `dependency-audit` skill in CI.

## Never

- Trust `req.body` types without validation.
- Return raw error messages, stack traces or SQL errors to clients.
- Do blocking CPU work (sync crypto, large `JSON.parse`, image processing) on the request thread; move it to a worker or queue.
- Read `process.env` inside handlers.

## Before you finish

Run the project's lint, type-check and tests. Check by hand, or with a test: an invalid body returns 400, an unknown route returns 404 JSON, a thrown error returns a generic 500 and is logged with the request id, and `SIGTERM` during a slow request lets it complete. Report what changed, any new dependency, and any env variable the user must set.
