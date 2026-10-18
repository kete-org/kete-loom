# Script-specific pitfalls

Check each against real samples from the user's data; spelling conventions vary by country and publisher.

## Bengali (Beng)

- Conjuncts are formed with virama (hasanta, U+09CD): `ক` + `্` + `ষ` = `ক্ষ`. Never strip U+09CD as "punctuation".
- Khanda ta: the atomic U+09CE `ৎ` and the older sequence `ত` + `্` + ZWJ may both appear in legacy data; normalization does not unify them. Decide on a search folding with the user.
- Ya-phala and ra-phala are virama sequences; the reph form also comes from virama ordering. Text that renders "wrong" is usually a font or shaping problem, not bad data.
- Two-part vowel signs (`ো` U+09CB, `ৌ` U+09CC) have canonical decompositions into `ে` + `া` / `ে` + `ৗ`; NFC composes them, so normalize before comparing.
- Bengali digits ০-৯ (U+09E6 to U+09EF) are `\p{Nd}`; `int()` in Python accepts them, many other parsers do not.
- The same script writes Assamese, which uses `ৰ` (U+09F0) and `ৱ` (U+09F1).

## Devanagari (Deva)

- Nukta letters U+0958 to U+095F (for example `क़`) are composition exclusions: NFC turns them into base + nukta (U+093C) and never back. Compare after normalization.
- ZWJ and ZWNJ after virama select half forms or explicit virama; they carry meaning in Marathi and Nepali spelling.
- Danda `।` (U+0964) and double danda `॥` (U+0965) are sentence punctuation; sentence splitters must know them.

## Tamil, Telugu, Kannada, Malayalam

- Malayalam chillu letters (U+0D7A to U+0D7F) and the older virama plus ZWJ sequences can both appear; plan a folding for search.
- Tamil `ஸ்ரீ` (shri) is several code points; count it as graphemes, not code points.

## Arabic, Persian, Urdu (Arab)

- Right-to-left; see the bidi section of `SKILL.md`.
- Tatweel (U+0640) is decorative elongation; remove it in search keys.
- Harakat (short-vowel marks, U+064B to U+0652) are usually optional; strip for search keys only.
- Alef variants (`أ إ آ ا`), teh marbuta (`ة`) vs heh (`ه`), alef maksura (`ى`) vs yeh (`ي`): common search foldings, but each loses distinctions. Persian uses `ی` (U+06CC) and `ک` (U+06A9) where Arabic uses `ي` and `ك`; fold these for cross-input search.
- Arabic presentation forms (U+FB50 to U+FDFF, U+FE70 to U+FEFF) come from bad PDF extraction; NFKC maps them back to base letters.
- Arabic-Indic digits (U+0660 to U+0669) and Extended Arabic-Indic digits (U+06F0 to U+06F9) differ; parse both.

## Hebrew (Hebr)

- Niqqud (vowel points) and cantillation marks are combining marks; strip for search keys only.

## Thai, Lao, Khmer, Burmese

- No spaces between words; use dictionary-based segmentation (ICU word break).
- Thai has no case and uses combining vowel and tone marks above and below; grapheme clustering keeps them with the consonant.
- Burmese text may be in the non-standard Zawgyi encoding rather than Unicode; it uses the same code points with different meanings. Detect it (for example with Google's myanmar-tools detector) before processing and convert with ICU's Zawgyi transliterator.

## Chinese, Japanese, Korean

- Full-width forms (`ＡＢＣ１２３`) and half-width katakana fold with NFKC.
- Han unification: the same code point renders differently in Chinese and Japanese fonts; set `lang` on HTML so the right font is used.
- Traditional and Simplified Chinese are different characters; conversion needs a dictionary (for example OpenCC), not normalization.
- Japanese search usually needs a morphological analyzer or n-grams; Korean Hangul syllables decompose under NFD into jamo, so normalize both sides to NFC.
- Text beyond the BMP (CJK Extension B onwards, emoji) is two UTF-16 code units; JavaScript `length` and Java `String.length()` count it as 2.
