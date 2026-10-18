---
name: browser-qa
description: Exploratory, manual-style QA session on a running web app through a real browser, walking the critical user journeys, abusing forms and validation, spot-checking small screens, keyboard use and contrast, and watching the console and network panel, then filing reproducible bug reports. Use when someone wants a site or staging build clicked through and checked before a release, demo or handover, rather than automated tests written.
license: MIT
compatibility: Any Agent Skills host with a browser-control capability (a browser automation tool or MCP server). Without one, produce the test plan and ask the user to run it.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Browser QA pass

Act as a careful human tester. You are looking for what a real user would hit, and you prove each problem with exact steps. You do not write automated tests here; if the user wants those, use the `e2e-testing-playwright` skill instead.

## 0. Agree the scope

Before opening the browser, confirm:

1. **The URL** and the environment (local, staging, preview). **Never test against production** with real data or payments unless the user says so explicitly in this conversation.
2. **Test accounts** and roles. Don't sign up with a real person's email or phone number. If you need an account and have none, **stop and ask**.
3. **What changed** or what matters most, if anything. Weight the pass toward it.
4. **What is off limits**: sending emails or SMS, real payments, deleting shared data. When an action would have an external effect you weren't cleared for, stop and ask.

If you have no way to control a browser, write the checklist from steps 1 to 5 and hand it to the user.

## 1. Map the critical journeys

List 3 to 7 journeys from the navigation, the README or the user: for example sign up, log in, log out, password reset, search, create/edit/delete the core object, checkout. Do them first, end to end, on a desktop-size window. Note every journey you could not complete and why.

## 2. Forms and validation

For each important form:

- Submit empty. Each required field should show a clear message tied to that field.
- Wrong formats: bad email, letters in a number, a date in the past where only future dates make sense, an amount of 0 and a negative one.
- Boundaries: very long text (500+ characters), emoji and non-Latin text (`Kwame Nkrumah`, `Ɔkɔmfo`, `Zoë`, `日本`), leading and trailing spaces, pasted text.
- Double submit: click the submit button twice quickly. Exactly one record or charge should result.
- Server errors: does a failed request show a helpful message and keep what the user typed?
- Navigation: back button after submit, refresh mid-flow, opening the same flow in two tabs.

## 3. Responsive spot check

Resize to about 375 px wide (phone), 768 px (tablet) and 1280 px (desktop), or use device emulation. On each: no horizontal scrolling, nothing cut off, menus open and close, tap targets are not crammed together, modals fit and can be closed.

## 4. Accessibility spot check

This is a quick screen, not an audit:

- Tab through each journey with the keyboard only. Focus is visible, the order makes sense, nothing traps focus, and Escape closes dialogs.
- Every input has a visible label; icon-only buttons have an accessible name.
- Images that carry meaning have alt text.
- Text contrast looks sufficient, and information is not conveyed by colour alone.
- Zoom to 200 %: content still usable.

For a full WCAG review, recommend the `accessibility-reviewer` agent or the `web-accessibility` skill.

## 5. Console and network

Keep the console and network log open during every journey.

- Console: uncaught errors, failed hydration, React or Vue warnings, CSP violations, mixed-content warnings.
- Network: any 4xx or 5xx, requests that take more than a couple of seconds, duplicate requests for the same thing, secrets or personal data in URLs or responses that shouldn't be there.
- Note which user action produced each one.

## 6. Verify before you report

For each issue: reproduce it a second time from a fresh page load. If it doesn't reproduce, report it as intermittent with what you observed, not as a confirmed bug. Check it isn't caused by your own test data or an expired session.

## Bug report format

One block per bug:

```
### BUG-<n>: <short title stating the wrong behaviour>
Severity: blocker | major | minor | cosmetic
Where: <URL or screen>, <browser and window size>, <account/role>
Steps:
  1. ...
  2. ...
Expected: ...
Actual: ...
Evidence: <console error text, failing request + status, screenshot name>
Reproduced: 2/2 | intermittent (1/3)
```

Severity guide: **blocker** stops a critical journey or loses data or money; **major** breaks a feature but has a workaround; **minor** is wrong but low impact; **cosmetic** is visual only.

## Final summary

End with:

1. Environment, browser and build tested, and the time.
2. A table of journeys with pass / fail / not tested.
3. Bugs ordered by severity (the blocks above).
4. What you did not cover (browsers, roles, screens, payments), stated plainly.

Never call a build "ready to ship"; report what you saw and let the user decide.
