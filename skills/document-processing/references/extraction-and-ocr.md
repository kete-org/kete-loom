# Extraction and OCR

## Triage commands

```bash
pdfinfo in.pdf                      # pages, encryption, producer, PDF version
pdffonts in.pdf                     # no fonts => likely scanned
pdftotext -f 1 -l 3 -layout in.pdf - | head -50
qpdf --check in.pdf                 # structural problems
pdfimages -list in.pdf | head       # image resolution per page (OCR needs ~300 dpi)
```

## Text with pdfplumber

```python
import pdfplumber, json
rows = []
with pdfplumber.open("work/in/report.pdf") as pdf:
    for i, page in enumerate(pdf.pages, start=1):
        text = page.extract_text(layout=False) or ""
        rows.append({"page": i, "text": text})
json.dump(rows, open("work/out/report.text.json", "w"), ensure_ascii=False, indent=1)
```

Words with positions (for layout-aware work): `page.extract_words(keep_blank_chars=False, use_text_flow=True)` returns `x0, top, x1, bottom, text`.

## Tables with pdfplumber

```python
ruled = {"vertical_strategy": "lines", "horizontal_strategy": "lines"}
whitespace = {"vertical_strategy": "text", "horizontal_strategy": "text", "snap_tolerance": 3}

with pdfplumber.open("work/in/statement.pdf") as pdf:
    page = pdf.pages[0]
    region = page.crop((0, 120, page.width, 700))   # x0, top, x1, bottom in PDF points
    for table in region.extract_tables(ruled):
        for row in table:
            print(row)
```

Debug a table: `page.to_image(resolution=150).debug_tablefinder(ruled).save("debug.png")` and look at the detected lines.

Tips:
- Header rows that repeat on every page: drop them after the first page by matching the header.
- Cells that wrap onto two lines become `"line1\nline2"`; join them, do not split into rows.
- Numbers: strip thousands separators according to the document's locale (1.234,56 vs 1,234.56); keep the original string next to the parsed value.

## OCRmyPDF

```bash
tesseract --list-langs                         # confirm language data is installed
ocrmypdf -l eng --rotate-pages --deskew --clean --output-type pdfa --sidecar out.txt in.pdf out.pdf
ocrmypdf -l eng+deu --skip-text in.pdf out.pdf     # mixed: only OCR pages without text
ocrmypdf -l eng --redo-ocr in.pdf out.pdf          # replace a bad hidden text layer
ocrmypdf -l ben --force-ocr in.pdf out.pdf         # rasterise and OCR everything
```

- OCRmyPDF 17 added `--mode skip|redo|force`; the legacy flags still work.
- `--clean` needs the `unpaper` program installed; it only cleans the image Tesseract sees, not the output page (that is `--clean-final`).
- `--redo-ocr` cannot be combined with `--deskew`, `--rotate-pages` or `--clean`.
- Tesseract language codes are ISO 639-2 style (`eng`, `fra`, `deu`, `ben`, `hin`, `ara`, `chi_sim`, `jpn`). Choose `script/` models (for example `script/Devanagari`) when the language is unknown but the script is.
- Very low-resolution scans: upscale is no substitute for a rescan at 300 dpi; tell the user.

## Plain Tesseract on images

```bash
tesseract page.png out -l eng --psm 6       # writes out.txt; --psm 6 = single uniform block
tesseract page.png out -l eng tsv           # word-level confidence in out.tsv
```

Use the `conf` column of the TSV to flag words under about 60 for human checking.
