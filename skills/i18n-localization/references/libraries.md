# i18n libraries: syntax and setup notes

Read the section for the library the project already uses. Check the installed version's docs before relying on a detail here.

## FormatJS / react-intl (ICU MessageFormat)

- Messages are ICU: `{count, plural, one {# file} other {# files}}`, `{role, select, admin {...} other {...}}`, `{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`.
- Components: `<FormattedMessage id="..." defaultMessage="..." description="..." values={{ name }} />`; hooks: `useIntl().formatMessage(...)`, `formatNumber`, `formatDate`, `formatList`.
- Rich text: `values={{ link: (chunks) => <a href="/terms">{chunks}</a> }}` with `<link>terms</link>` in the message.
- Extract: `formatjs extract 'src/**/*.{ts,tsx}' --out-file lang/en.json`. Compile: `formatjs compile lang/fr.json --out-file compiled/fr.json` (add `--ast` for pre-parsed messages; `--ast --pseudo-locale en-XA` for pseudo-localisation).
- `eslint-plugin-formatjs` can enforce `description`, placeholder use and no literal strings in JSX.

## i18next / react-i18next / next-i18next

- Not ICU by default. Interpolation is `{{name}}`. Use `i18next-icu` only if you want ICU syntax.
- Plurals use key suffixes from `Intl.PluralRules`: `item_one`, `item_other` (plus `_two`, `_few`, `_many` where the language has them). Call `t('item', { count })`; the option must be named `count`. A `_zero` key, if present, is used for 0.
- Ordinals: `t('place', { count, ordinal: true })` with `place_ordinal_one`, `place_ordinal_two`, `place_ordinal_few`, `place_ordinal_other`.
- Context (gender etc.): `t('friend', { context: 'female' })` → `friend_female`.
- Markup: `<Trans i18nKey="terms">Read the <0>terms</0></Trans>`.
- Extraction: `i18next-cli` (`npx i18next-cli extract`), configured with the project's locales and namespaces. `i18next-parser` is deprecated and unmaintained since September 2025; `npx i18next-cli migrate-config` converts its config.
- Set `fallbackLng`; enable `saveMissing` or a `missingKeyHandler` in development to report missing keys.

## vue-i18n

- `$t('key', { name })`, plurals with `$t('car', n)` and pipe-separated forms `no cars | one car | {n} cars`. `{n}` or `{count}` inserts the number. For languages whose forms don't fit the default order (Russian, Polish), supply a rule function per locale in `createI18n`: `pluralRules` with the Composition API, `pluralizationRules` with the legacy Options API.
- `$d(date, 'short')` and `$n(amount, 'currency')` with `datetimeFormats` and `numberFormats` per locale.
- Composition API: `const { t, d, n } = useI18n()`.

## gettext (Python, PHP, C, many others)

- `_("Text")`, `ngettext("%(n)d file", "%(n)d files", n)`, `pgettext("context", "Open")` for disambiguation.
- Extract with `xgettext` (or Babel `pybabel extract`, Django `makemessages`), update with `msgmerge`, compile with `msgfmt`.
- Plural forms are defined per language in the `.po` header `Plural-Forms:`.
- Use named placeholders (`%(name)s`) so translators can reorder them.

## Android

- `res/values/strings.xml` for the source, `res/values-fr/strings.xml` etc. for others. Plurals: `<plurals name="files"><item quantity="one">%d file</item><item quantity="other">%d files</item></plurals>`, read with `getQuantityString(R.plurals.files, n, n)`.
- Use positional args (`%1$s`) so translators can reorder.
- RTL: `android:supportsRtl="true"`, `start`/`end` instead of `left`/`right`.
- Pseudo-locales: `pseudoLocalesEnabled true` in a debug build type gives `en-XA` (accented) and `ar-XB` (bidi).

## iOS / macOS

- String Catalogs (`.xcstrings`, Xcode 15+) or `Localizable.strings` with `.stringsdict` for plurals. SwiftUI `Text("key")` looks up `LocalizedStringKey`; elsewhere `String(localized:)`.
- Format with `FormatStyle` (`.formatted(.currency(code: "EUR"))`, `Date.FormatStyle`) or `NumberFormatter`/`DateFormatter` with the user's locale.
- Use leading/trailing constraints for automatic RTL mirroring. Xcode scheme options include pseudo-languages such as double-length and right-to-left.

## Rails

- `config/locales/*.yml`, `t('.title')` with lazy lookup, plurals under `one:`/`other:` keys with `count:`. `l(date, format: :short)` and `number_to_currency` with the locale.
- `i18n-tasks missing` and `i18n-tasks unused` (gem) check sync.
