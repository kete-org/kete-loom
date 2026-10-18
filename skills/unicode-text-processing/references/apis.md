# Unicode APIs by language

## Python

```python
import unicodedata, regex          # pip install regex (the stdlib re has no \X or \p{Script})
s = unicodedata.normalize("NFC", s)
key = unicodedata.normalize("NFKC", s).casefold()

graphemes = regex.findall(r"\X", s)
def truncate(s, n):                # n user-visible characters
    return "".join(regex.findall(r"\X", s)[:n])

is_bengali = bool(regex.search(r"\p{Script=Bengali}", s))
words = regex.findall(r"[\p{L}\p{M}\p{N}]+", s)   # keeps vowel signs and virama with their letters
```

PyICU (`pip install PyICU`, needs the ICU C library):

```python
import icu
coll = icu.Collator.createInstance(icu.Locale("bn"))
coll.setStrength(icu.Collator.SECONDARY)
names.sort(key=coll.getSortKey)

bi = icu.BreakIterator.createWordInstance(icu.Locale("th"))
bi.setText(text)
u = icu.UnicodeString(text)                         # offsets below are UTF-16 code units
bounds = list(bi)                                   # end offsets of each segment
start, tokens = 0, []
for end in bounds:
    tokens.append(str(u[start:end])); start = end
```

Note: PyICU offsets are UTF-16 code units; for text outside the BMP (emoji, some CJK extension characters) slice `icu.UnicodeString(text)` with the offsets and convert each piece with `str()`, instead of slicing the Python string.

`unicodedata` follows the Unicode version of the Python release (`unicodedata.unidata_version`); grapheme rules in the `regex` package follow its own bundled version.

## JavaScript (Node 16+ and modern browsers)

```js
s = s.normalize('NFC');
const key = s.normalize('NFKC').toLowerCase();       // JS has no full case fold; toLowerCase is close but not identical

const graphemes = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map(x => x.segment);
const words = [...new Intl.Segmenter('th', { granularity: 'word' }).segment(text)]
  .filter(x => x.isWordLike).map(x => x.segment);

const coll = new Intl.Collator('bn', { sensitivity: 'base' });   // base | accent | case | variant
names.sort(coll.compare);
coll.compare(a, b) === 0;                                         // collation-equal

/\p{Script=Devanagari}/u.test(s);
/\p{Script_Extensions=Arabic}/u.test(s);
```

`s.length` counts UTF-16 code units; `[...s].length` counts code points; neither counts graphemes.

## Java

```java
String nfc = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFC);
java.text.Collator coll = java.text.Collator.getInstance(java.util.Locale.forLanguageTag("bn"));
coll.setStrength(java.text.Collator.SECONDARY);
java.text.BreakIterator words = java.text.BreakIterator.getWordInstance(java.util.Locale.forLanguageTag("th"));
```

ICU4J (`com.ibm.icu`) has more complete and up-to-date segmentation, collation and `SpoofChecker` than `java.text`; prefer it for non-trivial work.

## Go and Rust

- Go: `golang.org/x/text/unicode/norm`, `golang.org/x/text/collate`, `github.com/rivo/uniseg` for graphemes.
- Rust: `unicode-normalization`, `unicode-segmentation` (graphemes and words, no dictionary segmentation for Thai), `icu` (ICU4X) for collation and dictionary-based segmentation.

## PostgreSQL

```sql
CREATE COLLATION bn_icu (provider = icu, locale = 'bn-BD');
CREATE COLLATION ci_ai (provider = icu, locale = 'und-u-ks-level1', deterministic = false);  -- case- and accent-insensitive equality
SELECT name FROM people ORDER BY name COLLATE bn_icu;
CREATE INDEX people_name_bn ON people (name COLLATE bn_icu);
SELECT normalize(name, NFC) FROM people;          -- PostgreSQL 13+, needs a UTF8 database
```

Nondeterministic collations do not support `LIKE` in older PostgreSQL versions; check the docs for the installed version.

## Elasticsearch / OpenSearch

The `analysis-icu` plugin provides `icu_normalizer`, `icu_folding`, `icu_tokenizer` (dictionary-based for Thai, Lao, Khmer, Burmese, CJK) and `icu_collation_keyword`.
