---
name: office-documents
description: Word and Excel files made, read and edited with open tools - .docx built with python-docx or the docx npm package, .xlsx with openpyxl and pandas, live formulas instead of pasted numbers, a LibreOffice headless recalculation followed by a scan for #REF!, #NAME? and other error cells, separate formula and cached-value reads, surgical edits to the raw OOXML parts including tracked changes, a render-to-PDF visual check, and Markdown converted to DOCX or EPUB with pandoc and a reference document. Use when someone needs a Word report, letter or contract edited or generated, a spreadsheet model or export with working formulas, data read out of .docx or .xlsx files, or a manuscript turned into an e-book.
license: MIT
compatibility: Any Agent Skills host. Needs Python 3 with python-docx, openpyxl and pandas (or Node with the docx package), pandoc for conversions, and LibreOffice (soffice) for recalculation and PDF rendering.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: docs
  kete-loom/risk: runs-commands
  kete-loom/requires: "python3, pandoc, soffice"
  kete-loom/owner: "Kete-org"
---

# Office documents (Word and Excel)

Generate or edit `.docx` and `.xlsx` files so they open cleanly in Word, Excel and LibreOffice, keep their formatting, and compute what they claim to compute. PDFs belong to the `document-processing` skill and PowerPoint to `slide-decks`.

## Ground rules

1. **Never overwrite the user's file.** Work on a copy (`report.edited.docx`) and keep the original until the user accepts the result.
2. **Pick the lightest tool that keeps fidelity.** New file from data: a library. Small change to an existing styled file: the library if it can, raw OOXML if it can't. Format conversion: pandoc or LibreOffice.
3. **Spreadsheets keep their logic.** A total, ratio or lookup is written as a formula (`=SUM(B2:B13)`), not a number you computed in Python. Hardcode only true inputs, and mark them (blue font or an "Inputs" sheet).
4. **Check by rendering.** A file that unzips is not a file that looks right. Convert to PDF and look at the pages before you say it is done.
5. **Stop and ask** before removing tracked changes or comments, changing a template's styles, or touching macros (`.docm`, `.xlsm`); libraries can silently drop VBA, so keep macro files untouched unless the user agrees.

## Word (.docx)

**Create** with python-docx (`Document()`, `add_heading`, `add_paragraph(style=...)`, `add_table`, `add_picture`, `sections[0]` for margins and orientation) or, in Node, the `docx` package (`new Document({ sections: [...] })`, `Packer.toBuffer`). Use named styles (`Heading 1`, `List Bullet`), never manual bold-and-size, so a table of contents and navigation work. To match a house look, start from the client's template: `Document("template.docx")`, delete its body, then fill it.

**Read** paragraphs with their style names and tables cell by cell. For plain text quickly: `pandoc in.docx -t plain` or `-t markdown` (keeps headings and tables). Headers, footers, footnotes and comments live in separate parts, so read them too when the user asks for "everything".

**Edit**:
- Find and replace with python-docx works per *run*, and Word splits text across runs at every formatting or spell-check boundary. Search the paragraph's joined text, then rewrite the runs that hold the match, keeping the first run's formatting.
- When the library cannot express the change (tracked changes, content controls, field codes, complex numbering), edit the XML: follow `references/ooxml-editing.md`.
- To propose changes for review instead of applying them, write them as tracked changes (`w:ins` / `w:del`) with an author and date, never as silent edits.

## Excel (.xlsx)

**Create or edit** with openpyxl. Use pandas only to shape data before writing it, or for a plain data export (`df.to_excel(..., index=False)`), because pandas writes values, not formulas, and rewrites the whole sheet.

1. Write inputs, then formulas as strings (`ws["D2"] = "=B2*C2"`). Use absolute references (`$B$1`) for constants, and named ranges or a clear "Assumptions" block for model inputs.
2. Set number formats (`cell.number_format = "#,##0.00"`, `"0.0%"`, `"yyyy-mm-dd"`), freeze the header row (`ws.freeze_panes = "A2"`), and set column widths. Dates go in as `datetime` objects, not strings.
3. **Recalculate.** openpyxl stores formulas with no computed results, so a file it saved shows blanks in some viewers and gives `None` to anyone reading values. Run LibreOffice headless over it (`references/recalc-and-checks.md`) so the cached values are filled.
4. **Scan for errors** after recalculation: every cell whose value is `#REF!`, `#NAME?`, `#DIV/0!`, `#VALUE!`, `#N/A`, `#NUM!` or `#NULL!`. Fix each one; report any that are intended (an `#N/A` from a deliberate lookup miss).
5. **Spot-check numbers**: recompute two or three totals independently (pandas over the inputs) and compare with the cached values.

**Read** in two passes when formulas matter: `load_workbook(p)` gives formulas, `load_workbook(p, data_only=True)` gives the cached results (or `None` if never calculated). Never save a workbook opened with `data_only=True`; that replaces every formula with its last value. For large files use `read_only=True`. Merged cells, hidden sheets and hidden rows change what a reader sees: list them.

Never do: compute totals in code and paste the numbers; convert an `.xls`/`.xlsm` through openpyxl without saying what is lost (openpyxl reads `.xlsx`/`.xlsm` only, and `.xls` must be converted first with LibreOffice); widen a chart or pivot table's range by hand-editing XML without re-rendering it.

## Conversions with pandoc

- Markdown to Word with house styles: `pandoc --print-default-data-file reference.docx > ref.docx`, restyle `ref.docx` in Word or LibreOffice, then `pandoc in.md -o out.docx --reference-doc=ref.docx --toc`.
- Word to Markdown: `pandoc in.docx -t gfm --extract-media=media -o out.md`.
- Markdown to EPUB: `pandoc book.md -o book.epub --toc --epub-cover-image=cover.jpg --metadata title="..." --metadata author="..." --css epub.css`. One `#` heading per chapter; `--split-level` (pandoc 3; older pandoc uses `--epub-chapter-level`) controls where files split. Validate with EPUBCheck if it is installed, and open the result in an e-reader app.
- Any office format to PDF: `soffice --headless --convert-to pdf --outdir out in.docx`.

## Visual check (always)

1. Convert the output to PDF with LibreOffice, then render pages to images (`pdftoppm -png -r 80 out.pdf page`) if you can view images.
2. Look for: overflowing tables, lost images, wrong fonts (a missing font silently falls back), empty headers or footers, broken numbering, page breaks in odd places, and in sheets, `####` (column too narrow) or error cells.
3. LibreOffice and Word lay out slightly differently. If exact pagination matters, tell the user to confirm in Word.

## Report

```
File: <output path> (original kept at <path>)
Changes: <what was created or edited, sheet/section by section>
Formulas: <n> written, recalculated with LibreOffice, error cells: <none | list>
Checks: rendered to PDF, <pages> pages viewed, <issues or "no layout issues">
Not done / needs you: <macros, Word-only features, things to confirm in Excel or Word>
```

References: `references/ooxml-editing.md` (unpacking, run merging, tracked changes, repacking) and `references/recalc-and-checks.md` (recalculation and the error scan).
