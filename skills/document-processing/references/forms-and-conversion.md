# Forms and structural conversion

## qpdf

```bash
qpdf in.pdf repaired.pdf                                   # rewrite, fixes many damaged files
qpdf --decrypt --password-file=pw.txt locked.pdf open.pdf  # only with the owner's permission; a file keeps the password out of shell history
qpdf --empty --pages a.pdf b.pdf 1-3 -- merged.pdf          # all of a, pages 1-3 of b
qpdf in.pdf --pages . 5-10 -- part.pdf                      # extract pages
qpdf --split-pages in.pdf page-%d.pdf                       # one file per page
qpdf in.pdf rotated.pdf --rotate=+90:2,4                    # rotate pages 2 and 4 by 90 degrees clockwise
qpdf --linearize in.pdf web.pdf                             # fast web view
qpdf --qdf --object-streams=disable in.pdf inspect.pdf      # human-readable objects for debugging
```

Office documents to PDF (if LibreOffice is installed):

```bash
libreoffice --headless --convert-to pdf --outdir work/out work/in/*.docx
```

## List form fields

```bash
pdftk form.pdf dump_data_fields_utf8
```

```python
from pypdf import PdfReader
reader = PdfReader("form.pdf")
for name, f in (reader.get_fields() or {}).items():
    print(name, f.get("/FT"), f.get("/V"), f.get("/_States_", ""))   # /_States_ lists checkbox values
```

If `get_fields()` is empty but the PDF looks like a form, it is either flat (no fields) or XFA. Check with `acro = reader.trailer["/Root"].get("/AcroForm")` then `acro is not None and "/XFA" in acro.get_object()`. Report which.

## Fill with pypdf

```python
from pypdf import PdfReader, PdfWriter
reader = PdfReader("form.pdf")
writer = PdfWriter(clone_from=reader)
values = {"FullName": "Ama Mensah", "Date": "2026-03-02", "Agree": "/Yes"}
for page in writer.pages:
    writer.update_page_form_field_values(page, values, auto_regenerate=False)
writer.set_need_appearances_writer(True)   # ask viewers to regenerate appearances
with open("filled.pdf", "wb") as fh:
    writer.write(fh)
```

Check the pypdf version's docs: the signature of `update_page_form_field_values` has gained options (such as `flatten`) over releases.

## Fill with pdftk

Write an FDF or XFDF with the values, then:

```bash
pdftk form.pdf fill_form data.xfdf output filled.pdf            # keeps fields editable
pdftk form.pdf fill_form data.xfdf output filled_flat.pdf flatten
```

Use `need_appearances` if the viewer shows empty fields after filling.

## Batch filling from a CSV

1. Read the CSV with the csv module (UTF-8, keep leading zeros as strings).
2. Map CSV columns to field names with an explicit dict the user approved.
3. One output per row named from a key column, sanitised to a safe filename.
4. Log each row: output path, fields filled, fields missing.
