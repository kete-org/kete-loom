---
name: html-email-templates
description: Markup for responsive HTML email that holds up in classic Outlook for Windows, Gmail and Apple Mail, authored in MJML or React Email - section and column layout on a 600px grid, table fallbacks, VML background images and font fallbacks for Outlook's Word engine, inlined CSS, staying under Gmail's roughly 102KB clipping point, dark-mode color-scheme meta and colours that survive forced inversion, accessible structure with lang, alt text and real link text, no scripts or forms, and previewing in real inboxes before anything ships. Use when designing or coding a newsletter, receipt or notification email template, converting a design into email-safe HTML, or fixing a template that breaks in Outlook, gets clipped in Gmail or looks wrong in dark mode.
license: MIT
compatibility: Any Agent Skills host. MJML needs Node and the mjml package; React Email needs Node and the react-email package. Inbox previews need test accounts or a preview service.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "node"
  kete-loom/owner: "Kete-org"
---

# HTML email templates

Email clients are not browsers. Classic Outlook for Windows renders with Word, Gmail rewrites your CSS, and dark mode recolours what you chose. Write for the weakest client, then enhance. This skill is about the template markup; sending it from code is `transactional-email`, inbox placement is `email-deliverability`.

## 0. Before you start

1. Find what the project uses: an `.mjml` folder, React Email templates (`emails/*.tsx`), a provider's template language (Handlebars, Liquid), or hand-written tables. Keep it; do not migrate frameworks unless asked.
2. Ask, if not stated: which clients matter (B2B audiences live in Outlook), brand fonts and colours, whether it is marketing or transactional, and what the fallback is for every dynamic value.
3. Get the plain-text version requirement. Every HTML email ships with a text part.

## 1. Pick the authoring tool

| Situation | Use |
|---|---|
| Designer-friendly templates, any backend | MJML: `<mjml><mj-body><mj-section><mj-column>`, compiled with `npx mjml in.mjml -o out.html` |
| React/TypeScript codebase, props-driven templates | React Email: components from `react-email` (older projects: `@react-email/components`), HTML from `await render(<Receipt {...props} />)`, text from `toPlainText(html)`, preview with `email dev` |
| Existing hand-coded tables | Keep tables; fix with the rules below |

Both compile to nested tables with inlined styles. Never write CSS grid, flexbox or `position` for layout in email.

## 2. Layout rules

- One centred container, 600px wide (up to about 640), fluid below that. In MJML, each `mj-section` is a row and `mj-column`s stack on mobile; columns stack below 480px by default; change it with `<mj-breakpoint width="...px" />` in `mj-head`.
- Layout tables get `role="presentation"`, `cellpadding="0" cellspacing="0" border="0"`. Spacing with `padding` on `td`, not `margin`.
- Images: absolute `https://` URLs, explicit `width` attribute (Outlook ignores CSS width on images), `style="display:block"`, `height:auto`, and real `alt` text. Expect images to be blocked; the email must still make sense.
- Buttons: a padded table cell with a link (MJML `mj-button`), not an image. Text at least 14px, tap targets about 44px tall.
- Hidden preheader text right after `<body>` (MJML `mj-preview`).
- Validate MJML with `npx mjml --validate in.mjml` or set `validationLevel` to `strict` in CI.

## 3. Outlook (classic Windows desktop)

- No background images in CSS: use VML (`v:rect` with `v:fill`) inside `<!--[if mso]>` conditionals; MJML `mj-section background-url` generates it. See `references/client-quirks.md`.
- Web fonts are ignored and the stack can fall back to Times New Roman. Put a safe font first in an Outlook-only rule, or set `mso-font-alt`.
- Widths and `max-width` are ignored; use ghost tables (`<!--[if mso]><table width="600">`) around fluid containers. MJML emits these for you.
- No `border-radius`, limited `padding` on `a` and `div`. Design square fallbacks.
- The new Outlook for Windows and Outlook on the web use a browser engine; test both.

## 4. Gmail

- Messages larger than about 102KB of HTML are clipped behind "View entire message", which can hide the footer and unsubscribe link. Keep the compiled HTML well under it: minify, remove unused CSS, avoid repeated inline styles from giant components. Measure the final rendered size, with real data, after the provider adds tracking.
- Gmail supports a `<style>` block in the head but drops the whole block if it hits CSS it rejects, and some account types and apps ignore it entirely. Everything essential must be inline; the `<style>` block only enhances (media queries, dark mode).
- Do not rely on attribute selectors or IDs; class selectors are fine as long as they are also inlined.

## 5. Dark mode

- Declare support: `<meta name="color-scheme" content="light dark">` and `<meta name="supported-color-schemes" content="light dark">`, plus `:root { color-scheme: light dark; }`.
- Add `@media (prefers-color-scheme: dark)` overrides for clients that honour them (Apple Mail and others). Gmail and some Outlook apps invert colours themselves: avoid pure `#ffffff`/`#000000` pairs that invert badly, give logos a transparent PNG with a light outline or a dark-mode variant, and never put text inside images.
- Check contrast in both modes.

## 6. Accessibility and safety

- `<html lang="...">` and `dir` for right-to-left languages, a `<title>`, headings in order, semantic `<p>` and `<h1>` inside cells.
- Link text that says where it goes; no "click here". Underline links in body copy.
- No JavaScript, forms, iframes, video embeds or external CSS: they are stripped or blocked. Use a linked thumbnail for video.
- Escape every dynamic value. Template engines that auto-escape must stay on; never inject user text as raw HTML.
- Unsubscribe link and physical address in marketing email footers.

## 7. Test before shipping

1. Compile with real and worst-case data: long names, missing optional fields, right-to-left text, 20 line items.
2. Check the HTML size and that every image has `alt` and `width`.
3. Send to real test inboxes (Gmail web and app, Outlook classic and new, Apple Mail light and dark) or a preview service. A local catcher such as Mailpit is for flow testing, not rendering.
4. Read the text part. It must carry every link and the key information.

Stop and ask the user before sending test mail to any address that is not a test inbox they own.

## Report

```
Template: <file(s)>, built with <MJML | React Email | tables>
Compiled size: <KB> (Gmail clip limit ~102KB)
Clients checked: <list, light/dark> - issues: <none | list with fix>
Accessibility: lang, alt text, link text, contrast <ok | gaps>
Text version: <generated | hand-written>
Still to verify: <clients not tested>
```

Client-by-client details and VML snippets: `references/client-quirks.md`.
