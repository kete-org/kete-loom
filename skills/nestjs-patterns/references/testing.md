# NestJS test templates

Use the project's existing runner (Jest is the CLI default; Vitest needs SWC or a decorator-aware transform because Nest relies on `emitDecoratorMetadata`).

## Unit test a service

```ts
import { Test } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

describe('OrdersService', () => {
  let service: OrdersService;
  const repo = { findById: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [OrdersService, { provide: OrdersRepository, useValue: repo }],
    }).compile();
    service = moduleRef.get(OrdersService);
    jest.clearAllMocks();
  });

  it('rejects an order for a missing customer', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.place({ customerId: 'c1', items: [] })).rejects.toThrow('customer');
  });
});
```

- For request- or transient-scoped providers use `await moduleRef.resolve(Token)` instead of `get`.
- Test guards directly: construct with a fake `Reflector` and pass a hand-built `ExecutionContext` (`switchToHttp().getRequest()` returning a plain object).

## E2E test through HTTP

```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app'; // same pipes/filters/prefix as main.ts
import { PaymentsClient } from '../src/payments/payments.client';

describe('Orders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PaymentsClient)
      .useValue({ charge: async () => ({ id: 'ch_test', status: 'succeeded' }) })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unknown fields', () =>
    request(app.getHttpServer()).post('/orders').send({ items: [], admin: true }).expect(400));
});
```

- With the Fastify adapter, create the app with `createNestApplication<NestFastifyApplication>(new FastifyAdapter())` and call `await app.getHttpAdapter().getInstance().ready()` after `init()`.
- Point e2e tests at a disposable database (container or schema per run); never at a shared dev database.
- Other override helpers: `overrideGuard`, `overrideInterceptor`, `overridePipe`, `overrideFilter`, `overrideModule`.
