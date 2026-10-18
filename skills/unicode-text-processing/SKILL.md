---
name: unicode-text-processing
description: Code-level correctness for text in complex and non-Latin scripts such as Bengali, Devanagari, Tamil, Arabic, Hebrew, Thai, Khmer, Chinese, Japanese and Korean - choosing NFC versus NFKC normalization and case folding, counting and truncating by grapheme cluster instead of code unit, detecting scripts from the Unicode Script property, dictionary-based word segmentation for languages written without spaces, ICU collation, locale-aware sorting and search folding, bidirectional text isolation, display width, and confusable or invisible characters. Use when string length, slicing, sorting, search matching, tokenization or rendering breaks on non-English text, when a database or search index must compare such text correctly, or when user input mixes scripts.
license: MIT
compatibility: Any Agent Skills host. Examples use Python 3 (unicodedata, the regex package, PyICU), JavaScript (Intl.Segmenter, Intl.Collator, String.prototype.normalize), Java (java.text, ICU4J) and PostgreSQL ICU collations; use the equivalent ICU binding in other languages.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Unicode text processing

A "character" is not a byte, not a UTF-16 code unit and often not a code point. Most bugs with non-Latin text come from code that assumes one of those. Fix them with the Unicode algorithms and ICU, never with hand-written character tables. This skill is about string handling in code; translating an app's UI and locale formatting is the `i18n-localization` skill.

Standards to cite in comments and reviews: UAX #15 (normalization), UAX #29 (text segmentation), UAX #24 (script property), UTS #10 (collation), UAX #9 (bidi), UAX #11 (East Asian width), UTS #39 (security and confusables). Library calls per language are in `references/apis.md`; script-specific pitfalls in `references/script-notes.md`.

## 0. Reproduce with real text

1. Get a failing sample in the real script from the user or the data, as text and as code points (`[hex(ord(c)) for c in s]` in Python, `[...s].map(c => c.codePointAt(0).toString(16))` in JS). Screenshots hide the difference between look-alike sequences.
2. Confirm the encoding end to end: files, HTTP `Content-Type; charset=utf-8`, database encoding and connection charset (MySQL `utf8mb4`, not `utf8`). Mojibake like `à¦¬` means UTF-8 bytes were decoded as Latin-1 or Windows-1252 somewhere; fix the boundary, never "repair" the data with replace tables.
3. Write a test with that sample before changing code.

## 1. Normalize at the boundary

| Form | Use for | Avoid for |
|---|---|---|
| NFC | Storing and comparing user text; default for the web and most APIs | |
| NFD | Stripping combining marks for accent-insensitive search keys (Latin) | Storing text |
| NFKC | Identifiers, usernames, search keys where full-width and compatibility forms should match (`Ａ` vs `A`, `ﬁ` vs `fi`) | Storing the user's text: it is lossy |
| NFKC_Casefold / `casefold()` after NFKC | Case-insensitive identifier matching | Display |

Rules:
- Normalize once when text enters the system (API input, file import), store NFC, and normalize again before comparing with outside data.
- NFC and NFKC give different results for the same input: compare strings normalized to the same form.
- Case-insensitive matching uses case folding (`str.casefold()`, ICU `foldCase`), not `lower()`. For Turkish and Azerbaijani, dotted and dotless i need the locale-specific rules.
- For search keys, keep the original string for display and store a separate folded key.

## 2. Count, slice and truncate by grapheme cluster

What a user sees as one character can be several code points: Bengali `ক্ষ` (conjunct), Devanagari `कि` (consonant plus vowel sign), emoji with skin tones or ZWJ families, flags, Hangul jamo sequences.

- Length limits shown to users ("max 50 characters") count extended grapheme clusters (UAX #29): Python `regex.findall(r"\X", s)`, JS `Intl.Segmenter(undefined, { granularity: "grapheme" })`, ICU `BreakIterator.getCharacterInstance`.
- Storage limits (database column bytes, SMS segments, protocol fields) count bytes or code units; check them separately and **truncate at a grapheme boundary**, never mid-cluster, then verify the byte length.
- Never reverse, split or slice user-visible strings by index without segmenting them first.
- Note: a grapheme cluster is not always one Indic syllable (aksara). If the product needs syllable-level units (for example a cursor or a typing tutor for Bengali), check with the user. Unicode 15.1 added rule GB9c, so conjuncts such as `ক্ষ` in Bengali, Devanagari, Gujarati, Malayalam, Oriya and Telugu are one extended grapheme cluster; libraries on older Unicode data split them after the virama, so check the library's Unicode version.

## 3. Detect scripts

1. Use the Unicode `Script` and `Script_Extensions` properties (UAX #24): Python `regex` `\p{Script=Bengali}` / `\p{scx=Beng}`, JS `/\p{Script=Bengali}/u`, ICU `UScript`.
2. Ignore characters whose script is `Common` or `Inherited` (digits, punctuation, combining marks) when deciding the dominant script.
3. Script is not language: Bengali script covers Bengali and Assamese; Devanagari covers Hindi, Marathi, Nepali and Sanskrit; Arabic script covers Arabic, Persian and Urdu. Use a language-ID model only if the language matters, and report its confidence.
4. Mixed-script identifiers (Latin plus Cyrillic in one username) are a spoofing signal; see step 7.

## 4. Segment words and tokenize

- Languages written without spaces between words (Thai, Lao, Khmer, Burmese, Chinese, Japanese) need dictionary-based word segmentation: ICU `BreakIterator.getWordInstance(locale)` or `Intl.Segmenter(locale, { granularity: "word" })` and its `isWordLike` flag. Splitting on whitespace returns whole sentences.
- For Chinese and Japanese search, character bigrams or a dedicated analyzer (for example a morphological analyzer for Japanese) usually beat ICU word breaks; choose with the user and measure on their queries.
- Splitting on `\w` or `[a-zA-Z]` breaks Indic and Arabic words, because combining vowel signs and virama are marks (`\p{M}`), not letters. Use `[\p{L}\p{M}\p{N}]+` with a Unicode-aware regex engine, or a word segmenter.
- For ML tokenizers, normalize (NFC or the model's documented form) before tokenizing, and check the tokenizer does not strip ZWJ or ZWNJ, which change meaning and shape in Indic and Persian text.

## 5. Sort and search with collation

- Never sort user-visible text by code point. Use ICU collation for the user's locale (UTS #10 plus CLDR tailoring): Python `icu.Collator.createInstance(icu.Locale("bn"))`, JS `Intl.Collator("bn")`, Java `Collator.getInstance(Locale.forLanguageTag("bn"))`.
- Choose strength deliberately: primary ignores accents and case, secondary ignores case, tertiary compares both.
- In the database, use ICU collations (PostgreSQL `CREATE COLLATION bn_icu (provider = icu, locale = 'bn-BD')`; nondeterministic collations for case- or accent-insensitive equality) and index with the same collation the queries use.
- For search, build a folded key: NFKC, case fold, and the script-specific foldings the user agrees to (for example removing Arabic tatweel and optional diacritics, unifying alef forms). Document every folding; each one makes some distinct words match.
- Collation rules change with ICU and CLDR versions: rebuild indexes that depend on collation after an ICU upgrade (PostgreSQL warns about collation version mismatches).

## 6. Bidirectional text

- Set `dir="auto"` on user-generated content and wrap embedded values in `<bdi>` or Unicode isolates (FSI U+2068 ... PDI U+2069) so a Hebrew or Arabic name does not reorder the surrounding text.
- Use logical order in storage; never reverse strings to "fix" display.
- Use CSS logical properties (`margin-inline-start`) for layout; layout mirroring belongs to the `i18n-localization` skill.

## 7. Security and invisible characters

- Strip or reject bidi control characters (U+202A to U+202E, U+2066 to U+2069) in source code, filenames and identifiers; they enable "Trojan Source" style attacks (CVE-2021-42574).
- Check identifiers for confusables and mixed scripts with UTS #39 (ICU `SpoofChecker`).
- Keep ZWJ (U+200D) and ZWNJ (U+200C) in natural-language text where they are meaningful; remove them only in identifiers where policy says so.

## 8. Display width and rendering

- Terminal and fixed-width layouts: use East Asian Width and `wcwidth`, not `len`, and measure per grapheme.
- Rendering needs a font that covers the script and a shaping engine (HarfBuzz in browsers and most toolkits). Boxes (tofu) or detached vowel signs mean a missing font or no shaping, not bad data.

## Never

- Never compare or deduplicate user text without normalizing both sides to the same form.
- Never store NFKC-folded text as the only copy of the user's input.
- Never hand-roll tables of letters, vowels or word lists for a script; use Unicode properties and ICU.
- Never silently strip characters you do not recognise; log and report them.

## Report back

```
Symptom: ... (sample as text and code points)
Cause: which assumption failed (code units, no normalization, whitespace tokenization, code-point sort, ...)
Fix: files changed, library calls used, form chosen (NFC/NFKC), collation and strength
Tests: samples per script covered, command run, results
Follow-ups: indexes to rebuild, data to re-normalize (with a migration the user approves)
```
