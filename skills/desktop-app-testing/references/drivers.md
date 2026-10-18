# Desktop driver templates

Read this when writing the first test with a tool. Check the tool's current documentation for version-specific capability names.

## pywinauto (Python, UI Automation backend)

```python
import subprocess, tempfile, pytest
from pywinauto import Application

APP = r"C:\build\MyApp\MyApp.exe"

@pytest.fixture
def app():
    data_dir = tempfile.mkdtemp()
    application = Application(backend="uia").start(f'"{APP}" --data-dir "{data_dir}" --no-update')
    main = application.window(title_re="MyApp.*")
    main.wait("visible ready", timeout=20)
    yield application, main
    application.kill()

def test_save_creates_record(app, request):
    _, main = app
    try:
        main.child_window(auto_id="NameBox", control_type="Edit").set_edit_text("Ama")
        main.child_window(auto_id="SaveButton", control_type="Button").click_input()
        row = main.child_window(title="Ama", control_type="DataItem")
        row.wait("visible", timeout=10)
    except Exception:
        main.capture_as_image().save(f"{request.node.name}.png")
        raise
```

Use `print_control_identifiers()` on a window once to explore its tree; do not leave it in tests. `click_input()` moves the real mouse (needs focus); `invoke()` uses the UIA Invoke pattern and is often steadier.

## Appium Windows driver (WebDriver)

Install: `npm install -g appium`, `appium driver install windows`, install WinAppDriver, enable Windows Developer Mode, start `appium`.

```python
from appium import webdriver
from appium.options.windows import WindowsOptions
from appium.webdriver.common.appiumby import AppiumBy

opts = WindowsOptions()
opts.app = r"C:\build\MyApp\MyApp.exe"
opts.set_capability("appium:appArguments", "--data-dir C:\\temp\\t1")
driver = webdriver.Remote("http://127.0.0.1:4723", options=opts)
try:
    driver.find_element(AppiumBy.ACCESSIBILITY_ID, "NameBox").send_keys("Ama")
    driver.find_element(AppiumBy.ACCESSIBILITY_ID, "SaveButton").click()
finally:
    driver.quit()
```

`ACCESSIBILITY_ID` maps to UIA `AutomationId`. Use `"appium:app": "Root"` to attach to the desktop for apps you start yourself, then find the window by name.

## Playwright for Electron (TypeScript)

```ts
import { test, expect, _electron as electron } from '@playwright/test';
import os from 'node:os'; import path from 'node:path'; import fs from 'node:fs';

test('save creates a record', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'app-'));
  // Pass the temp dir however the app accepts it (a flag or env var that calls app.setPath('userData', ...)).
  const app = await electron.launch({ args: ['.'], env: { ...process.env, MYAPP_USER_DATA: userData } });
  try {
    const win = await app.firstWindow();
    await win.getByLabel('Name').fill('Ama');
    await win.getByRole('button', { name: 'Save' }).click();
    await expect(win.getByRole('row', { name: /Ama/ })).toBeVisible();
    const version = await app.evaluate(({ app }) => app.getVersion());
    expect(version).toMatch(/\d+\.\d+\.\d+/);
  } finally {
    await app.close();
  }
});
```

For a packaged build pass `executablePath` to the built binary. The config's `use.trace` option does not cover a context you launch yourself; record a trace with `await app.context().tracing.start({ screenshots: true, snapshots: true })` after launch and `tracing.stop({ path })` in the `finally` block when the test failed.
