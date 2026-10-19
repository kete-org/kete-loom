# Email client quirks and snippets

Support changes; check a current support table (for example caniemail.com) before relying on a CSS feature, and confirm in real inboxes.

## Document skeleton

```html
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Your receipt</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style>body, table, td, p, a { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) { .bg { background-color: #1e1e1e !important; } .fg { color: #eeeeee !important; } }
    @media (max-width: 480px) { .stack { display: block !important; width: 100% !important; } }
  </style>
</head>
<body style="margin:0; padding:0;">
  <div style="display:none; max-height:0; overflow:hidden;">Preheader text shown in the inbox list</div>
  <!-- content -->
</body>
</html>
```

The `PixelsPerInch` block stops classic Outlook scaling images on high-DPI Windows displays. The `mso` style block forces a safe font in Outlook only.

## Ghost table for a fluid container

```html
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<div style="max-width:600px; margin:0 auto;">
  ...
</div>
<!--[if mso]></td></tr></table><![endif]-->
```

## Background image with VML fallback

```html
<td background="https://example.com/hero.jpg" bgcolor="#2b3a55" width="600" height="300" valign="top" style="background:url('https://example.com/hero.jpg') center / cover no-repeat #2b3a55;">
  <!--[if gte mso 9]>
  <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:300px;">
    <v:fill type="frame" src="https://example.com/hero.jpg" color="#2b3a55" />
    <v:textbox inset="0,0,0,0">
  <![endif]-->
  <div>Headline over the image</div>
  <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
</td>
```

Always set a `bgcolor` that keeps the text readable if the image never loads.

## Bulletproof button

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
  <td bgcolor="#0b5cff" style="border-radius:6px;">
    <a href="https://example.com/orders/123" style="display:inline-block; padding:12px 24px; font:600 16px/1.2 Arial, sans-serif; color:#ffffff; text-decoration:none;">View your order</a>
  </td>
</tr></table>
```

Classic Outlook shows square corners and may shrink the padding on the link; the coloured cell keeps the button visible.

## Client notes

| Client | Watch for |
|---|---|
| Outlook 2016-2021 / classic 365 (Windows) | Word engine: no CSS backgrounds, no `max-width`, no `border-radius`, web fonts ignored, line-height and spacing differ; use `mso` conditionals |
| New Outlook for Windows, Outlook.com | Browser engine; rewrites class names and applies its own dark mode (`[data-ogsc]` / `[data-ogsb]` attribute selectors are sometimes used to target it) |
| Gmail web and apps | Clips at about 102KB; ignores the whole `<style>` block on CSS it rejects; some account types and app views drop embedded styles; forced dark-mode inversion |
| Apple Mail (macOS, iOS) | Most capable; honours `prefers-color-scheme`; auto-links dates, addresses and phone numbers (the `x-apple-disable-message-reformatting` meta helps with sizing, not linking) |
| Yahoo, AOL | Strip some head styles; test media queries |

## Size budget

Compiled HTML size is what counts towards the Gmail clip: text, inline styles, tracking pixels and rewritten links. Measure the final message as delivered (download the original message in Gmail) rather than only the template file, because providers add click-tracking URLs and footers.
