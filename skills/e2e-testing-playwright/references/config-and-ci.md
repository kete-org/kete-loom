# Playwright config and CI

Read this when creating or reworking `playwright.config.ts` or the CI job. Check option names against playwright.dev/docs/test-configuration for the installed version.

## Starting config

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Add Firefox, WebKit or mobile projects (`devices['Pixel 7']`, `devices['iPhone 15']`) only when the product supports them; each project multiplies run time.

## Auth setup file

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_USER!);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```

## Custom fixture

```ts
// e2e/fixtures.ts
import { test as base } from '@playwright/test';

type Fixtures = { project: { id: string; name: string } };

export const test = base.extend<Fixtures>({
  project: async ({ request }, use, testInfo) => {
    const name = `e2e-${testInfo.testId}`;
    const res = await request.post('/api/projects', { data: { name } });
    const project = await res.json();
    await use(project);
    await request.delete(`/api/projects/${project.id}`);
  },
});
export { expect } from '@playwright/test';
```

## GitHub Actions with sharding

```yaml
name: e2e
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}
        env:
          E2E_USER: ${{ secrets.E2E_USER }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report-${{ strategy.job-index }}
          path: |
            playwright-report/
            test-results/
          retention-days: 14
```

To combine shard reports into one, use the `blob` reporter on CI and `npx playwright merge-reports --reporter html ./all-blob-reports` in a follow-up job.

## Useful commands

| Goal | Command |
|---|---|
| Run one file | `npx playwright test e2e/checkout.spec.ts` |
| Run by title | `npx playwright test -g "applies coupon"` |
| Debug step by step | `npx playwright test --debug` |
| Interactive runner | `npx playwright test --ui` |
| Re-run last failures | `npx playwright test --last-failed` |
| Stress a test | `npx playwright test e2e/x.spec.ts --repeat-each=20` |
| Open a trace | `npx playwright show-trace test-results/.../trace.zip` |
| Open the report | `npx playwright show-report` |
| Record a draft test | `npx playwright codegen http://localhost:3000` |

Treat `codegen` output as a draft: replace its locators with role-based ones and add assertions.
