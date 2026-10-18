# Setup and custom render

## Vitest

```ts
// vitest.config.ts (or the `test` block of vite.config.ts)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',        // or 'happy-dom'
    setupFiles: ['./src/test/setup.ts'],
    globals: false,              // keep explicit imports unless the repo already uses globals
  },
});
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // MSW 3: onUnhandledFrame
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());
```

`cleanup` runs automatically when the runner exposes a global `afterEach` (Jest, or Vitest with `globals: true`). With Vitest and `globals: false`, call it yourself as above.

Install: `npm i -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom msw` (React Testing Library 16 lists `@testing-library/dom` as a peer dependency).

## Jest

```js
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',            // needs the jest-environment-jsdom package from Jest 28
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};
```

In the setup file use `import '@testing-library/jest-dom';` and the same MSW lifecycle with Jest globals.

MSW 2 under Jest + jsdom may need the Fetch API globals (`Request`, `Response`, `TextEncoder`) supplied; MSW's docs recommend `jest-fixed-jsdom` as the environment for this. Vitest does not need it.

## Custom render

```tsx
// src/test/utils.tsx
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';

type Options = RenderOptions & { route?: string };

export function renderWithProviders(ui: ReactElement, { route = '/', ...options }: Options = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export * from '@testing-library/react';
```

Keep only the providers the app actually uses. A new `QueryClient` per call stops cached data leaking between tests.
