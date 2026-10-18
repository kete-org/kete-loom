# Templates

Adapt to the project's module system and libraries; these use ESM and zod.

## Express: validation middleware and error handler

```ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export const validateBody = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: { code: 'invalid_request', issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } });
  }
  req.body = result.data;
  next();
};

// Register after all routes.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err); // let Express close a half-sent response
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: 'invalid_request' } });
  }
  req.log?.error({ err }, 'unhandled error');
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong' } });
}
```

## Express: server.ts with graceful shutdown

```ts
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { db } from './db.js';

const app = createApp();
const server = app.listen(config.port, () => logger.info({ port: config.port }, 'listening'));
server.headersTimeout = 65_000;
server.requestTimeout = 30_000;

let shuttingDown = false;
export const isReady = () => !shuttingDown; // the readiness route reads this

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  const force = setTimeout(() => { logger.error('forced exit'); process.exit(1); }, 25_000);
  force.unref();
  server.close(async (err) => {
    await db.end().catch((e) => logger.error({ err: e }, 'db close failed'));
    process.exit(err ? 1 : 0);
  });
  server.closeIdleConnections();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

## Fastify: schema-validated route and shutdown

```ts
import Fastify from 'fastify';

const app = Fastify({ logger: { redact: ['req.headers.authorization'] }, bodyLimit: 100_000 });

app.post('/orders', {
  schema: {
    body: {
      type: 'object',
      required: ['items'],
      additionalProperties: false, // stripped, not rejected, under Fastify's default ajv options
      properties: { items: { type: 'array', minItems: 1, items: { type: 'string' } } },
    },
    response: { 201: { type: 'object', properties: { id: { type: 'string' } } } },
  },
}, async (req, reply) => {
  const order = await placeOrder(req.body);
  return reply.code(201).send(order);
});

app.addHook('onClose', async () => { await db.end(); });

await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    setTimeout(() => process.exit(1), 25_000).unref();
    await app.close();
    process.exit(0);
  });
}
```

## Streaming a file download

```ts
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

app.get('/exports/:id', async (req, res, next) => {
  try {
    const path = await exportPathFor(req.params.id); // validates ownership, throws AppError(404)
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="export-${req.params.id}.csv"`);
    await pipeline(createReadStream(path), res);
  } catch (err) {
    if (!res.headersSent) next(err); else res.destroy(err as Error);
  }
});
```
