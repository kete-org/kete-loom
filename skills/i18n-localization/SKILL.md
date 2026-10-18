---
name: i18n-localization
description: Internationalises an application so it can ship in more languages and regions, by moving user-facing text into message catalogs, writing ICU MessageFormat messages with plural and select rules, formatting dates, numbers, currency and lists through locale-aware APIs, making layouts work right-to-left, testing with pseudo-localisation, and keeping translation keys in sync across locales. Use when adding a second language or locale to an app, setting up i18next, react-intl, vue-i18n, gettext, Android or iOS string resources, fixing plurals or currency that read wrong in one language, or adding Arabic or Hebrew support.
license: MIT
compatibility: Any Agent Skills host. Examples use JavaScript Intl and ICU MessageFormat; the rules apply to any i18n library or platform.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# i18n and localisation

Make the app translatable once, correctly, so each new locale is a translation job and not a code change. For library-specific syntax and setup, read `references/libraries.md`.

## 0. Before you start

1. Find what the project already uses: search for `i18next`, `react-intl`/`@formatjs`, `vue-i18n`, `next-intl`, `gettext`/`.po` files, `res/values*/strings.xml`, `Localizable.strings`/`.xcstrings`, Rails `config/locales`, or a hand-rolled `t()` helper. **Use the existing system.** Never add a second one.
2. If there is none, recommend one that fits the stack (see `references/libraries.md`) and **stop and ask the user** before adding a dependency.
3. Ask, if not stated: target locales, the source locale, who translates (people, a translation platform, machine translation with review), and whether locale comes from the URL, user profile or `Accept-Language`.

## 1. Externalise strings

- Every user-visible string goes into the catalog: labels, buttons, errors, empty states, emails, push notifications, `alt`, `title`, `aria-label`, `placeholder`, page titles, and validation messages from the server.
- Not translated: log messages, identifiers, CSS class names, enum values stored in the database, analytics event names.
- Key names describe meaning and place, not the English text: `checkout.summary.total`, not `total_colon`. Don't reuse one key for two contexts that look the same in English ("Open" as verb and as status).
- Add a translator description to any key whose meaning isn't obvious from its text, including what each placeholder holds.
- Server-side errors return a code plus parameters; the client turns the code into a message. Don't send English sentences over an API for display.

## 2. Write whole messages, never concatenations

- Never build a sentence from pieces: `t('hello') + ' ' + name + '!'` and `"You have " + n + " items"` break in languages with different word order. Use one message with named placeholders: `Hello, {name}!`.
- Don't put formatted values together with `+` either; pass raw values as arguments and let the message format them.
- Markup inside a sentence (a link, bold text) stays inside the message as a tag the library supports (`<link>terms</link>` in react-intl, `<0>…</0>` in react-i18next `Trans`), so translators can move it.
- Gender or variant wording uses `select`: `{gender, select, female {She replied} male {He replied} other {They replied}}`.

## 3. Plurals

- Use the library's plural support; never `n === 1 ? 'item' : 'items'`. Languages use up to six CLDR plural categories: `zero`, `one`, `two`, `few`, `many`, `other`. English uses `one` and `other`; Arabic uses all six; Japanese uses only `other`.
- ICU form: `{count, plural, =0 {No messages} one {# message} other {# messages}}`. `#` is the locale-formatted number. `other` is required.
- `=0` is an exact-match override, not a category. `one` is not "exactly 1" in every language (for example, in Russian `one` also covers 21, 31...), so never use `one` to mean "singular" in logic.
- Ordinals ("1st", "2nd") use `selectordinal`, or `Intl.PluralRules(locale, { type: 'ordinal' })`.
- When a translator adds a category your source lacks (Polish `few`, `many`), the catalog must accept it. Check that your extraction and validation tooling does not strip unknown categories.

## 4. Locale-aware formatting

Use platform formatting with the active locale; never hand-format. In JavaScript:

| Value | API |
|---|---|
| Number, percent | `new Intl.NumberFormat(locale).format(n)`, `{ style: 'percent' }` |
| Currency | `new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })` |
| Date and time | `new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone })` |
| "3 days ago" | `new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })` |
| "A, B and C" | `new Intl.ListFormat(locale, { type: 'conjunction' })` |
| Sorting | `new Intl.Collator(locale).compare` (never default `Array.prototype.sort` on display text) |
| Plural category | `new Intl.PluralRules(locale).select(n)` |

Rules:

- **Currency is data, not locale.** Store amount and ISO 4217 code together; the locale only decides how it's displayed. Never derive the currency from the user's language.
- Store timestamps in UTC; format in the user's time zone. Date-only values (birthdays) must not be shifted by time zone.
- Don't parse user-typed numbers with `parseFloat`: `1.234,5` is valid German. Use a locale-aware input or a single agreed format.
- Hard-coded patterns like `MM/DD/YYYY`, `toFixed(2)` for display, and `'$' + amount` are bugs.
- Cache formatter instances; constructing `Intl.*` objects in a hot render loop is slow.

## 5. Right-to-left (Arabic, Hebrew, Persian, Urdu)

1. Set `lang` and `dir="rtl"` on `<html>` from the active locale (or `android:supportsRtl="true"` on Android; iOS mirrors automatically with leading/trailing constraints).
2. Replace physical CSS with logical properties: `margin-inline-start` not `margin-left`, `padding-inline-end`, `inset-inline-start`, `border-inline-start`, `text-align: start`. In Tailwind use `ms-*`, `me-*`, `ps-*`, `pe-*`, `rtl:`/`ltr:` variants, and for insets `start-*`/`end-*` (v3.3 to v4.1) or `inset-s-*`/`inset-e-*` (v4.2+, where `start-*`/`end-*` are deprecated).
3. Mirror direction-bearing icons (back/forward arrows, chevrons, progress) but not logos, media playback controls, clocks or checkmarks.
4. User-generated or mixed-direction text: use `dir="auto"` on the element, or `<bdi>` around an interpolated name, so a Latin username doesn't scramble an Arabic sentence.
5. Numbers, phone numbers and code stay left-to-right inside RTL text.
6. Check flex `row` order, absolutely positioned elements, transforms (`translateX`), and canvas or SVG drawing, which logical properties don't flip.

## 6. Pseudo-localisation

Run the UI in a pseudo-locale before real translations exist. It exposes hard-coded strings (unchanged English), truncation (translations into German or Finnish often run a third longer than English, and short labels can double), concatenation and encoding bugs.

- Generate an accented, padded locale: `Settings` → `[Šéţţîñĝš one two]`. FormatJS: `formatjs compile --ast --pseudo-locale en-XA` (also `en-XB`, `xx-LS`, `xx-AC`, `xx-HA`); Android: `pseudoLocalesEnabled true` in the build type gives `en-XA` and `ar-XB`.
- Add a bidi pseudo-locale (or `ar-XB`) to test RTL with readable text.
- Walk every changed screen at mobile width. Anything still plain English is a missed string.

## 7. Translation workflow and keeping keys in sync

1. The source locale is the only catalog developers edit by hand. Other locales come from translators or the translation platform.
2. Extract keys from code with the library's extractor (`formatjs extract`, `i18next-cli` (the replacement for the deprecated `i18next-parser`), `xgettext`, Xcode string catalog sync) instead of maintaining them by hand.
3. Add a check to CI that fails when:
   - a key used in code is missing from the source catalog;
   - a key exists in a locale catalog but not in the source (orphaned);
   - a translation's placeholders differ from the source (`{name}` renamed or dropped);
   - a message fails ICU syntax parsing.
4. Missing translations fall back through a defined chain (`pt-BR` → `pt` → source locale) at runtime and are reported, never shown as raw keys.
5. When English text changes meaning, change the key (or mark translations as needing review), so stale translations don't ship silently.
6. Never machine-translate straight into production catalogs for legal, medical, financial or safety text; a fluent human reviewer must approve those.

## Never

- Never concatenate translated fragments or format values with string operations.
- Never detect language from IP address or country alone; let users choose and remember their choice.
- Never use flags to represent languages.
- Never put translatable text in images, or truncate text with fixed-width containers.
- Never lowercase or uppercase translated strings in code without the locale (`toLocaleUpperCase(locale)`: Turkish dotted i).

## Report back

End with:

- **Strings externalised:** count and files touched.
- **Formatting changed:** which values moved to locale-aware APIs.
- **RTL:** done, partial or not in scope, and what was checked.
- **Sync check:** the command added or run and its result.
- **Open items:** strings not externalised, locales without translations, anything needing a translator or reviewer.
