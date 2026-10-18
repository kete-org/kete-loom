# Redaction that holds up

A redaction has failed if any redacted value can be recovered by selecting, copying, searching, extracting text, reading metadata, opening an earlier revision or lifting an overlay. Check every one.

## 1. Find targets

```python
import fitz, re   # PyMuPDF (AGPL; confirm the licence suits the user)
patterns = [r"\b\d{3}-\d{2}-\d{4}\b", r"[\w.+-]+@[\w-]+\.[\w.]+"]
terms = ["Ama Mensah", "Account 0012345678"]   # from the user
doc = fitz.open("work/in/case.pdf")
hits = []
for page in doc:
    text = page.get_text()
    found = set(terms) | {m.group(0) for p in patterns for m in re.finditer(p, text)}
    for t in found:
        for rect in page.search_for(t):
            hits.append((page.number + 1, t, rect))
print(len(hits), "hits")
```

Scanned pages have no text to search: OCR them first, then search the OCR layer, and redact the image region as well as the hidden text.

Show the user the hit list (page, term, count) before applying.

## 2. Apply

```python
for page_no, _term, rect in hits:                    # the approved hit list from step 1
    doc[page_no - 1].add_redact_annot(rect, fill=(0, 0, 0))
for page in doc:
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)   # removes text and the image pixels under each box; be explicit, defaults changed across versions
doc.set_metadata({})
doc.del_xml_metadata()
for name in doc.embfile_names():
    doc.embfile_del(name)
doc.save("work/out/case.redacted.pdf", garbage=4, deflate=True, clean=True)   # full rewrite, no incremental update
```

Also remove, where present: form field values, annotations and comments, bookmarks that quote redacted text, and document-level JavaScript.

Stronger alternative when the layout does not need to stay searchable: rasterise each page to an image at 200 to 300 dpi after drawing the boxes, build a new PDF from the images, then OCR it if search is needed. This leaves no original text objects at all.

## 3. Verify (all must pass)

```bash
pdftotext work/out/case.redacted.pdf - | grep -i -E "Ama Mensah|0012345678|[0-9]{3}-[0-9]{2}-[0-9]{4}" && echo "FAIL: text still present"
pdfinfo work/out/case.redacted.pdf            # author, title, subject, keywords cleared
exiftool work/out/case.redacted.pdf           # if installed: XMP and other metadata
grep -c "%%EOF" work/out/case.redacted.pdf    # more than 1 suggests incremental updates remain (a linearized file also has 2)
qpdf --check work/out/case.redacted.pdf
```

pdftotext does not read annotation or form-field text: also list fields with pypdf `get_fields()` and annotations with PyMuPDF `page.annots()` and confirm none hold a redacted value.

Then open the output, select all text on a redacted page, and paste it into a text file; search again. Check a few redacted areas zoomed in for half-covered characters.

## 4. Hand-off

- Report: terms and patterns used, hits found, hits after verification (must be zero), what metadata was removed.
- A person must review every redacted page before release. What must legally be withheld, and how redactions must be labelled (for example exemption codes), is decided by the user's legal or records team, not by this process.
