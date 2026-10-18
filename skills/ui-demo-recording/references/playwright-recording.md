# Playwright recording script

Video is written when the browser context closes. Without an explicit size, Playwright scales the viewport down to fit in 800x800, so always set both `viewport` and `recordVideo.size`.

```js
// demos/onboarding/record.mjs
import { chromium } from 'playwright';
import { cursorOverlay } from './cursor-overlay.mjs';

const W = 1920, H = 1080;
const BASE = process.env.DEMO_URL ?? 'http://localhost:3000';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  locale: 'en-GB',
  timezoneId: 'Europe/London',
  storageState: 'demos/.auth/demo-user.json',
  recordVideo: { dir: 'demos/onboarding/raw', size: { width: W, height: H } },
});
await context.addInitScript(cursorOverlay);
await context.route(/(google-analytics|segment|intercom|hotjar)/, (r) => r.abort());

const page = await context.newPage();
await page.clock.setFixedTime(new Date('2026-03-02T10:00:00Z'));

async function clickLike(locator) {
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
  await page.waitForTimeout(200);
  await locator.click();
}
const hold = (ms = 1200) => page.waitForTimeout(ms);
const caption = (text) => page.evaluate((t) => window.__demoCaption?.(t), text);

// Scene 1
await page.goto(`${BASE}/projects`);
await caption('Create a project in seconds');
await hold();

// Scene 2
await clickLike(page.getByRole('button', { name: 'New project' }));
await page.getByLabel('Project name').pressSequentially('Harbour Bridge refit', { delay: 60 });
await hold(600);
await clickLike(page.getByRole('button', { name: 'Create' }));
await page.getByRole('heading', { name: 'Harbour Bridge refit' }).waitFor();
await caption('');
await hold(1500);

const video = page.video();
await context.close();            // finishes the file
await video.saveAs('demos/onboarding/raw/take.webm');
await browser.close();
```

Notes:
- `page.clock` exists in Playwright 1.45 and later; on older versions, override `Date` with an init script.
- With Playwright Test, set `use: { video: { mode: 'on', size: { width: 1920, height: 1080 } }, viewport: { width: 1920, height: 1080 } }` in a separate `demo` project. Recent versions also accept `video.show.actions` (outline and title for each action) and `video.show.test`; these are debugging annotations, usually unwanted in a marketing demo, and missing in older versions.
- Chromium gives the most consistent recordings; record in headless mode on the same machine type each time.
- Record a fresh take for each language or theme instead of editing one video.
