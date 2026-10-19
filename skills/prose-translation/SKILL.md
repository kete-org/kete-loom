---
name: prose-translation
description: Idiomatic translation of documents, articles, help content and UI strings between human languages, building a glossary and a do-not-translate list first, fixing register and audience, rewriting translationese so the result reads as if written in the target language, returning a paragraph-by-paragraph bilingual review, and back-checking every number, name, link and placeholder against the source. Use when someone wants text translated, a machine translation polished, or a translation reviewed for accuracy and naturalness.
license: MIT
compatibility: Any Agent Skills host. No tools required; works on pasted text or files the user points to.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: read-only
  kete-loom/owner: "Kete-org"
---

# Prose translation

Translate meaning, not words, and prove nothing was lost. This skill handles the language work on the text itself. Wiring an app for multiple locales (message catalogs, ICU plurals, RTL layout) belongs to `i18n-localization`; reviewing locale files in code belongs to the `i18n-reviewer` agent.

## 0. Brief

Settle these before translating. Ask for anything missing that changes the output:

1. **Languages and variants.** Source and target, with region: pt-BR or pt-PT, es-ES or es-419, zh-Hans or zh-Hant, fr-FR or fr-CA.
2. **Audience and purpose.** Who reads it and what they do next (developers following steps, customers deciding to buy, staff reading a policy).
3. **Register.** Formal or informal address (vous/tu, Sie/du, usted/tú, 您/你), and how the brand speaks if a voice guide exists.
4. **Mode.** `translate` (from source), `polish` (fix an existing machine or human translation) or `review` (grade an existing translation, change nothing).
5. **Constraints.** Character limits for UI strings, SEO keywords, legal wording that must stay literal.

## 1. Glossary and do-not-translate list

Before the first sentence, scan the whole source and build two lists:

```
Do not translate: product names, feature names, code, commands, file paths, API fields,
  placeholders ({name}, %s, {{count}}), URLs, email addresses, trademarks
Glossary:
| Source term | Target term | Note (part of speech, context, do not vary) |
```

- Use the user's existing glossary or termbase if they have one; it wins over your choices.
- Pick one target term per concept and keep it. Varying terms in technical text makes readers think they are different things.
- For terms with an established local equivalent, use it; for terms the local industry leaves in English, leave them, and note which in the glossary.

Show the glossary to the user before translating a long document, so terminology is agreed once rather than fixed in every paragraph.

## 2. Translate in passes

1. **Meaning pass.** Translate each paragraph for meaning. Restructure sentences to fit target grammar: change word order, split long sentences, merge short ones, turn nouns back into verbs where the target language prefers it.
2. **Naturalness pass.** Read the target alone, as a native reader would. Remove translationese:
   - calqued idioms and phrasal verbs translated word by word,
   - source word order kept where it sounds foreign,
   - overuse of passive voice or of pronouns the target language drops,
   - false friends (actual/actuel, eventually/eventualmente, library/librairie),
   - punctuation and typography from the source (French spaces before `:` `;` `?` `!`, German and French quotation marks, full-width punctuation in Chinese and Japanese).
3. **Locale pass.** Dates, numbers, currency and units in target conventions (decimal comma, date order), unless the text is technical and must keep source formats. Never convert currency amounts or units on your own; flag them.

Cultural references, jokes and wordplay: adapt them only if the user agreed to adaptation in the brief; otherwise translate and add a translator's note.

## 3. Back-check

Compare source and target segment by segment. Every item must match exactly:

- numbers, amounts, percentages, dates, versions,
- names of people, places, products,
- links and anchors, placeholders and markup tags (same count, same order where order matters),
- negations ("not", "never", "no longer") and modal strength ("must" versus "should" versus "may"),
- list items and table rows (none dropped or merged).

Any mismatch is fixed or listed in the report. For high-stakes text, re-translate a sample of target paragraphs back into the source and compare meaning.

## 4. Output

Return, in this order:

1. The full translated text, in the source's format (Markdown, HTML or a string file kept valid).
2. A bilingual review table for the user to check:

```
| # | Source | Translation | Note |
|---|--------|-------------|------|
```

   Add a note wherever you restructured, adapted, chose between meanings or left a term in the source language. For long documents, give the table per section.
3. The glossary and do-not-translate list as used.
4. Back-check result: `all items match` or the list of mismatches and open questions.

In `review` mode, give only the table, a severity for each issue (meaning error, terminology, style, typography) and a one-line overall verdict.

## Rules

- Never add, remove or soften content. If the source is wrong or unclear, translate it faithfully and flag it.
- Never translate anything on the do-not-translate list.
- Never guess at an ambiguous source sentence silently; pick the likelier reading, translate it, and flag it with the alternative.
- Keep placeholders, markup and code byte-for-byte intact.

## Stop and ask the user when

- The text is legal, medical, regulatory, financial disclosure or safety-critical (contracts, consent forms, drug labels, instructions for use). Translate if asked, but say clearly that a qualified human translator, and where required a certified one, must review it before use.
- The target variant or register is unknown and the text addresses the reader directly.
- The source contains terminology you cannot resolve and no glossary covers it.
