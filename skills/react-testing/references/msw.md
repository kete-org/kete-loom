# MSW network mocks for component tests

MSW 2.x and 3.x syntax (handlers below are the same in both). Check the installed major in `package.json`; MSW 1 used `rest.get` and `res(ctx.json())`. MSW 3 is ESM-only and needs Node 22+; on a CommonJS Jest setup stay on MSW 2 unless the user agrees to migrate.

## Handlers and server

```ts
// src/test/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada Lovelace' })),
  http.post('/api/todos', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 't1', ...body }, { status: 201 });
  }),
];
```

```ts
// src/test/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Lifecycle (in the setup file): `server.listen({ onUnhandledRequest: 'error' })` before all, `server.resetHandlers()` after each, `server.close()` after all. MSW 3 renamed the option: `server.listen({ onUnhandledFrame: 'error' })`. MSW 2 uses `onUnhandledRequest`.

## Per-test overrides

```ts
it('shows an error when the profile cannot load', async () => {
  server.use(
    http.get('/api/users/:id', () => HttpResponse.json({ message: 'nope' }, { status: 500 })),
  );
  renderWithProviders(<Profile id="1" />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
});
```

- Network failure: `http.get(url, () => HttpResponse.error())`.
- Slow response to test a spinner: `import { delay } from 'msw'` (MSW 3 also exports it from `msw/utils`) then `await delay(200)` inside the resolver; or keep it pending with `await delay('infinite')`.
- One-off: `http.get(url, resolver, { once: true })`.
- Fake timers: MSW 3 no longer patches `setTimeout`, so with fake timers a `delay()` response only resolves after you advance the timers.

## Asserting the request

Only when sending the right data is the component's job:

```ts
let sent: unknown;
server.use(http.post('/api/todos', async ({ request }) => {
  sent = await request.json();
  return HttpResponse.json({ id: 't1' }, { status: 201 });
}));
// ...interact...
await waitFor(() => expect(sent).toEqual({ title: 'Buy milk' }));
```

## Absolute vs relative URLs

jsdom resolves relative `fetch('/api/...')` against its `location` (default `http://localhost/` in Vitest and Jest). If the app uses an `API_URL` env variable, write handlers with the same base, or use a wildcard (`*/api/users/:id`).
