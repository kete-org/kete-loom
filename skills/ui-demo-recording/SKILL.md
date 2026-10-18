---
name: ui-demo-recording
description: Produces polished, repeatable product demo videos and feature walkthroughs of a web app by scripting the story as a Playwright run with recordVideo, seeding fixed demo data and a frozen clock, pacing actions for a human viewer, injecting a visible cursor and click ripples, adding captions or chapter titles, then trimming, scaling and encoding the WebM with FFmpeg into MP4 or GIF. Use when marketing, docs or a release note needs a screen recording of the app, when an existing demo video is out of date after a UI change, or when the same walkthrough must be re-recorded on every release.
license: MIT
compatibility: Any Agent Skills host. Needs Node 18+, the @playwright/test or playwright package with a Chromium browser installed, and ffmpeg. The app must run locally or on a staging URL with demo data.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "node, npx, ffmpeg"
  kete-loom/owner: "Kete-org"
---

# UI demo recording

A demo video is a script, not a screen grab. Write the walkthrough as code so it records identically every time, looks like a calm human is driving, and can be re-run after the next UI change. This skill makes videos for people to watch; for tests that assert behaviour, use the `e2e-testing-playwright` skill.

## 0. Agree the storyboard

Ask the user (stop until you have answers):

1. **Story**: the 3 to 7 steps the viewer should see, and the one outcome to end on.
2. **Output**: length target, resolution (1920x1080 or 1280x720 for docs, 1080x1920 for vertical), MP4, WebM or GIF, with or without captions.
3. **Environment**: local or staging URL, a demo account, and confirmation that **no real customer data** appears.
4. **Branding**: light or dark theme, browser chrome or none (Playwright records the page only, without browser chrome).

Write the storyboard as a numbered list of scenes, each with an action, the on-screen caption and a hold time. Get a yes before recording.

## 1. Make the app deterministic

The recording must look the same on every run.

- **Data**: seed a dedicated demo tenant or database with believable fake names, round numbers and no lorem ipsum. Reset it before each recording.
- **Time**: freeze the clock so dates and "5 minutes ago" labels are stable (`page.clock.setFixedTime` in Playwright 1.45+; see `references/playwright-recording.md`).
- **Network noise**: block analytics, chat widgets and cookie banners with `page.route`, or set the consent cookie in advance.
- **Randomness**: disable onboarding tours, A/B variants and "what's new" pop-ups through feature flags or localStorage before the first navigation.
- **Login**: sign in once in setup and save `storageState`; never record typing a real password.
- **Animations**: keep the app's own animations (they look good on video), but wait for them to finish before the next action.

## 2. Write the recording script

Use a plain Playwright library script (or a dedicated Playwright Test project) separate from the test suite. Skeleton in `references/playwright-recording.md`.

1. Create the context with `viewport` equal to the output size and `recordVideo: { dir, size }` set to the same size, plus `deviceScaleFactor: 1`. A mismatch gives blurry or letterboxed video.
2. Inject the cursor overlay with `context.addInitScript` before the first page loads (`references/cursor-and-captions.md`).
3. Drive each scene with role-based locators, moving the mouse to the target first (`page.mouse.move` with `steps`) so the viewer sees the pointer travel, then click.
4. Type with `locator.pressSequentially(text, { delay: 40 to 80 })` so typing is visible; use `fill` for fields the viewer does not need to watch.
5. Hold after each meaningful change (`page.waitForTimeout(800 to 1500)`). Holds are fine here because this is a recording, not a test; always wait for the visible result first (`expect(locator).toBeVisible()` or `locator.waitFor()`).
6. Show captions or chapter titles through the overlay, or leave them for post-production (step 4).
7. Close the context (`await context.close()`): the video file is only finished then. Get the path from `page.video().path()` or `saveAs`.

## 3. Review the raw take

Play it back at full speed and check:

- [ ] Every scene from the storyboard appears in order, nothing extra.
- [ ] No spinners, flashes of unstyled content, error toasts, scrollbars jumping or debug panels.
- [ ] No real personal data, internal URLs, API keys or staff names visible.
- [ ] The cursor is visible and never teleports.

If a scene is flaky, fix the wait in the script; do not cut around it in the edit.

## 4. Post-process with FFmpeg

Recipes in `references/post-processing.md`:

1. Trim the blank first frames and the tail after the last hold.
2. Convert WebM to H.264 MP4 with `yuv420p` and `+faststart` for the web.
3. Optionally speed up dull stretches, add a title card or fade, burn in or attach captions (SRT or WebVTT), and add a music bed at low level if the user supplies a licensed track.
4. For GIF, use the two-pass palette method, at most about 15 fps and 800 px wide, and keep it short.
5. Probe the output (duration, resolution, size) before handing it over.

## 5. Make it repeatable

- Commit the script, the seed data and the storyboard next to each other (for example `demos/<name>/`).
- Add an npm script such as `"demo:onboarding": "node demos/onboarding/record.mjs"`.
- If the user wants it refreshed each release, run it in CI against staging and upload the MP4 as an artifact; a human approves before it replaces the published video.

## Never

- Never record production with real customer accounts or data.
- Never leave real credentials in the script; read them from the environment for a demo-only account.
- Never publish a recording without the user watching it first.

## Report back

```
Demo: <name>   Length: mm:ss   Output: <path> (WxH, fps, MB)
Script: <path>   Seed: <path>   Run: <command>
Scenes: 1 ... 2 ... (one line each with start time)
Checks: data is fake, no secrets on screen, cursor visible
Known gaps: ...
```
