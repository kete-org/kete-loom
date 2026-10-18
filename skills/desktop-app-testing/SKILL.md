---
name: desktop-app-testing
description: Automates end-to-end UI tests for native desktop applications (WPF, WinForms, Win32, Qt and Electron) by driving them through UI Automation with pywinauto, through the Appium Windows driver backed by WinAppDriver, or through Playwright's Electron support, with stable automation IDs instead of screen coordinates, isolated app data per test, screenshots on failure, and CI runners that have a real interactive desktop session or a virtual display. Use when writing UI tests for a Windows or cross-platform desktop app, a desktop test passes locally but cannot find windows in CI, choosing between pywinauto, Appium and Playwright for a desktop app, or replacing coordinate-click scripts that break on every resolution change.
license: MIT
compatibility: Any Agent Skills host. Windows targets need a Windows machine or runner with an unlocked interactive session; Electron tests run on Windows, macOS or Linux (Linux needs a display, for example Xvfb).
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Desktop app testing

Write desktop UI tests that find controls by identity, start from a known state, and give a screenshot and log when they fail, in CI as well as on a developer machine.

Browser apps belong to `e2e-testing-playwright`. Unit and component tests belong to the language's testing skill (`csharp-testing`, `python-testing`, `cpp-testing`). This skill is for driving the packaged, running desktop app.

## 0. Before you start

1. Identify the UI framework and target OS: WPF, WinForms, Win32/MFC, WinUI/UWP, Qt (Widgets or QML), Electron, or other.
2. Find how the app is built and launched (path to the built `.exe`, command-line flags, config or data directories).
3. Check for existing UI tests and their tool. Extend that tool unless it is unworkable; tell the user before switching.
4. Inspect the UI tree with Accessibility Insights for Windows or `Inspect.exe` (Windows SDK) to see which controls expose `AutomationId`, `Name` and `ControlType`. For Electron, use DevTools.

## 1. Pick the driver

| App | Tool | Why |
|---|---|---|
| Electron | Playwright `_electron.launch` | Same API as web tests, access to the main process |
| WPF, WinForms, WinUI, Win32, Qt on Windows, test code in Python | pywinauto with `backend="uia"` | No server process, direct UI Automation |
| Same apps, team wants WebDriver or non-Python language | Appium with the Windows driver (`appium driver install windows`) | WebDriver protocol, any client language; needs WinAppDriver and Windows Developer Mode |
| Old Win32/MFC controls with poor UIA support | pywinauto `backend="win32"` | Reads native Win32 controls |
| Qt on Linux or macOS | the platform accessibility layer, or Squish (commercial) if the team owns it; **stop and ask** | Few free options; confirm the choice |
| macOS native (AppKit/SwiftUI) | XCUITest, or Appium Mac2 driver | Out of scope here beyond this pointer |

WinAppDriver has seen no active development for years; it still works for many apps but check its status and the Appium Windows driver's current requirements before committing a new suite to it. Prefer pywinauto for new Python suites.

## 2. Make the app testable

1. Give every control a test needs a stable automation identifier:
   - WPF: `AutomationProperties.AutomationId="SaveButton"` (or `x:Name`, which UIA exposes).
   - WinForms: the control's `Name` property becomes the `AutomationId`.
   - Qt: `setObjectName("saveButton")` and accessible names; check what UIA shows.
   - Electron: `data-testid` or accessible roles and names in the renderer.
2. Add a launch flag or environment variable for tests: a separate data directory, disabled auto-update, telemetry off, animations off, a fixed locale. Never point tests at the user's real profile.
3. Where a test needs data, seed it through files or an API before launch, not by clicking through setup screens.

Changing app code to add IDs is in scope; ask before changing behaviour.

## 3. Write the tests

### Locators

- Order of preference: automation ID, then control type plus accessible name, then a path inside a uniquely identified parent. Never screen coordinates, image matching or tab-order key presses as the main strategy.
- Scope searches to the app's top window, not the desktop root; desktop-wide searches are slow and pick up other apps.

### Waiting

- Wait for a condition (window exists, control enabled, text equals) with a timeout. pywinauto: `.wait("visible enabled", timeout=10)`; Appium: explicit WebDriver waits; Playwright: web-first `expect` assertions.
- Never use fixed sleeps except as a last resort with a comment explaining what is missing.

### Structure

- One fresh app instance per test or per test class, launched with a clean temp data directory; close it in teardown even when the test fails, and kill leftover processes by PID.
- Page-object style: one class per window or dialog wrapping its locators and actions.
- Assert on visible outcomes (a list row appears, a file is written, a status label changes), not on internal state.
- On failure, save a screenshot of the app window and the app's log file as test artifacts.

Code templates for each tool are in `references/drivers.md`.

## 4. CI

1. Windows UI automation needs an **interactive, unlocked desktop session**. A runner installed as a Windows service, a locked screen or a disconnected RDP session makes window searches fail or hang.
   - GitHub-hosted Windows runners: try them first; check that windows are found and screenshots are not black.
   - Self-hosted: run the runner as a normal user with auto-logon and the screensaver and lock disabled, not as a service. Keep the screen resolution fixed.
2. Linux (Electron, Qt): run under a virtual display, `xvfb-run -a <test command>`.
3. Install the app from the same build artifact the release uses, not a debug build, at least for the smoke subset.
4. Run UI tests serially on one desktop; parallel instances fight over focus. Shard across machines instead.
5. Upload screenshots, app logs and test reports on failure.

## 5. Flakiness

When a test is flaky, find the cause before adding retries: a missing wait, focus stolen by another window (update prompts, notifications), shared state between tests, or animations. One CI retry is acceptable while the cause is investigated; report each flaky test to the user.

## Never

- Never automate the user's real profile, real accounts or production back ends.
- Never rely on screen coordinates, pixel matching or fixed sleeps as the main technique.
- Never disable OS security features (UAC, Defender) on shared machines to make tests pass; use a dedicated test VM.
- Never leave app processes running after the suite.

## Report back

```
## Desktop UI tests: <app>
Framework / OS: <WPF on Windows 11, ...>
Tool: <pywinauto uia | Appium Windows | Playwright Electron> and why
Tests added: <names, what each covers>
App changes: <automation IDs or test flags added>
CI: <runner type, session setup, artifacts>
Result: <command, pass/fail counts, runs repeated for flakiness>
Gaps: <controls without IDs, untestable areas>
```
