---
name: document-processing
description: Pipelines for PDFs and scanned paperwork built on open tools - triage each file as born-digital, scanned or mixed, pull text and tables with pdfplumber or pdftotext, add a searchable text layer with OCRmyPDF and Tesseract language packs, split, merge, rotate, decrypt and repair with qpdf, read and fill AcroForm fields with pypdf or pdftk, redact so the underlying text and metadata are truly gone and prove it, and translate a document while keeping its layout. Use when someone has a folder of PDFs or scans to extract data from, needs a scanned contract made searchable, wants a PDF form filled from a spreadsheet, or must hand over a redacted document that has to survive copy-paste and text extraction.
license: MIT
compatibility: Any Agent Skills host. Uses Python 3 with pdfplumber and pypdf, plus the qpdf, ocrmypdf, tesseract (with the needed language data), pdftotext/pdfinfo (poppler-utils) and optionally pdftk CLIs. Redaction examples use PyMuPDF, which is AGPL-licensed.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "python3, qpdf, ocrmypdf, tesseract, pdftotext"
  kete-loom/owner: "Kete-org"
---

# Document processing

Treat every document as evidence: never change the original, keep each step's output, and check results against the page images, not just the extracted text. Command and code detail is in `references/extraction-and-ocr.md`, `references/forms-and-conversion.md` and `references/redaction.md`.

## 0. Before you start

1. Copy inputs to `work/in/` and treat them as read-only. Outputs go to `work/out/`.
2. Ask the user what the result is for (search, a spreadsheet, a filled form, a redacted copy for disclosure, a translation) and the languages in the documents.
3. **Sensitive content** (IDs, health, financial, legal): confirm the user may process it and that no cloud OCR, translation or AI service will be used without their approval. Default to local tools.
4. Do not open files from untrusted sources with tools that execute embedded content; work with command-line tools and libraries, not by opening JavaScript-enabled viewers.

## 1. Triage each file

Run `pdfinfo file.pdf` (pages, encryption, PDF version, tagged or not) and `pdffonts file.pdf`, then sample text with `pdftotext -f 1 -l 3 -layout file.pdf -`.

| Finding | Class | Next step |
|---|---|---|
| Text comes out readable, fonts listed | Born-digital | Extract directly (step 2) |
| No text, no fonts, pages are images | Scanned | OCR first (step 3) |
| Some pages have text, others not | Mixed | OCR with skip mode for pages that already have text |
| Text is garbled (wrong glyphs, `(cid:123)`) | Broken font encoding | OCR with force mode, or redo |
| `qpdf --check` reports damage | Damaged | Repair with `qpdf in.pdf repaired.pdf`, then re-triage |
| Encrypted | Protected | Decrypt with `qpdf --decrypt` only with the password and permission from the user |

## 2. Extract text and tables (born-digital)

1. Plain text in reading order: `pdftotext -layout` for column-preserving text, or pdfplumber `page.extract_text()` for per-page control.
2. Tables: pdfplumber `page.extract_tables()` with explicit `table_settings` (lines strategy for ruled tables, text strategy for whitespace tables). Crop to the table region with `page.crop(bbox)` when a page has more than one table.
3. Keep provenance on every row: file, page number and, for tables, the bounding box.
4. Validate: row counts per page, column totals against the printed totals, and a manual spot check of at least three rows against the page image. Report any mismatch rather than "fixing" numbers.

## 3. OCR scans

1. Run OCRmyPDF with the right languages (`-l eng+fra`; install the Tesseract language data first, check with `tesseract --list-langs`).
2. For phone photos or skewed scans add `--rotate-pages --deskew --clean`. These cannot be combined with redo mode.
3. For mixed files use skip mode (`--skip-text`, or `--mode skip` in OCRmyPDF 17+); for an existing bad text layer use `--redo-ocr` (`--mode redo`); `--force-ocr` (`--mode force`) rasterises everything and loses vector quality.
4. Write PDF/A for archiving (`--output-type pdfa`) and a `--sidecar out.txt` for the plain text.
5. Check quality: sample pages, compare OCR text with the image, and note low-confidence areas (handwriting, stamps, tables). OCR is never 100% accurate; say so in the report and keep the images as the source of truth.

## 4. Convert, split, merge, rotate

Use qpdf for structural work (no re-rendering, so quality is kept): `--pages` to select, split or merge, `--rotate`, `--linearize` for web viewing, `--split-pages` for one file per page. Office formats to PDF via `libreoffice --headless --convert-to pdf` if installed. Recipes in `references/forms-and-conversion.md`.

## 5. Fill forms

1. List the fields first (`pypdf` `reader.get_fields()` or `pdftk in.pdf dump_data_fields_utf8`) and map them to the user's data. **Show the user the mapping** before filling.
2. Fill with pypdf (`writer.update_page_form_field_values`) or pdftk (`fill_form data.fdf output out.pdf`), one output per record.
3. Checkboxes and radio buttons need their export value (often `/Yes` or `/On`), not `True`.
4. Flatten (`pdftk ... flatten`, or render) only when the user wants a non-editable copy; keep the unflattened version.
5. XFA forms (dynamic forms from Adobe LiveCycle) are not AcroForms; most open tools cannot fill them. Stop and tell the user.
6. Open each output and check a few fields by eye.

## 6. Redact (must be real)

Drawing a black box over text does **not** redact it: the text stays in the content stream and is copied, searched and extracted. Follow `references/redaction.md` exactly:

1. Find every occurrence (search the text layer and the OCR layer; patterns for IDs, emails, phone numbers; ask the user for names and terms).
2. Apply true redaction that removes the text, vector graphics and image pixels under each area (PyMuPDF `add_redact_annot` then `apply_redactions`), or rasterise the pages and re-OCR the result.
3. Remove metadata, XMP, attachments, annotations, form field values, bookmarks and earlier revisions (incremental updates) by rewriting the file.
4. **Verify**: extract all text from the output and search for every redacted term; inspect metadata; check that the file has no incremental updates left. Any hit means the redaction failed.
5. A person must review redactions before disclosure. Legal, court or regulatory redaction rules (what must be withheld, how it is marked) are outside this skill; the user's legal team decides.

## 7. Translate with layout

1. Extract text per block with its position, font size and page (pdfplumber words or PyMuPDF blocks).
2. Translate block by block, with the tool or service the user approves; keep numbers, names, codes and dates unchanged and give the translator a glossary.
3. Rebuild: either an overlay PDF that writes translated text into each block's box (shrink font to fit, flag blocks that overflow) or a bilingual table (source, translation, page) when layout matters less than accuracy.
4. Fonts must cover the target script (for example Noto fonts for Bengali, Arabic, CJK); check that no characters render as boxes. Complex scripts need a shaping-capable text engine.
5. Machine translation of legal, medical or official documents needs review by a qualified translator before use; certified translations are out of scope.

## Never

- Never modify or delete the original files.
- Never present OCR or extracted numbers as exact without a spot check.
- Never send documents to an online service without the user's explicit approval.
- Never call a document redacted until the verification step passes.

## Report back

```
Files: n (born-digital / scanned / mixed / damaged)
Outputs: <paths>   Tools and versions: ...
Extraction: rows or pages extracted, spot checks done, mismatches
OCR: languages, pages OCRed, known weak areas
Redaction: terms and patterns, hits after verification (must be 0), metadata cleared
Needs a human: legal review of redactions, translation review, unreadable pages
```
