# Editing raw OOXML (.docx)

A `.docx` is a ZIP of XML parts. Edit the XML directly only when the library cannot express the change: tracked changes, comments, content controls, field codes, or a precise fix that must not disturb anything else.

## Unpack, edit, repack

```bash
mkdir work && cd work && unzip -q ../in.docx
# edit word/document.xml (and other parts as needed)
zip -q -X -r ../out.docx '[Content_Types].xml' _rels docProps word customXml 2>/dev/null
```

- `[Content_Types].xml` should be the first entry. Include every folder that was in the original (`ls` before zipping).
- Pretty-printing the XML for reading is fine, but write edits back without adding whitespace inside `w:t` elements: whitespace there is visible text.
- After repacking, open the file with python-docx and convert it to PDF with LibreOffice. A file Word cannot open usually has a broken part; compare with the original using `unzip -l`.

## Where things live

| Part | Holds |
|---|---|
| `word/document.xml` | Body: paragraphs `w:p`, runs `w:r`, text `w:t`, tables `w:tbl` |
| `word/styles.xml` | Paragraph and character styles |
| `word/numbering.xml` | List numbering definitions |
| `word/header*.xml`, `word/footer*.xml` | Headers and footers |
| `word/footnotes.xml`, `word/comments.xml` | Footnotes, comments |
| `word/_rels/document.xml.rels` | Links from the body to images, headers, hyperlinks |
| `word/media/` | Images |

## Runs split text

Word stores `Total amount` as several `w:r` elements whenever formatting, proofing marks (`w:proofErr`) or revision IDs (`w:rsidR`) change mid-phrase. A search for the whole phrase in one `w:t` fails.

1. For each paragraph, join the text of its runs and find the match by character offset.
2. Map the start and end offsets back to runs.
3. Put the replacement text into the first affected run (keeping its `w:rPr`), trim the text of the partial runs at each end, and remove the runs fully inside the match.
4. If a `w:t` begins or ends with a space, set `xml:space="preserve"` on it.

Optional clean-up before editing a messy document: remove `w:proofErr` elements and merge adjacent runs whose `w:rPr` is identical. Do it on a copy and diff the rendered PDFs.

## Tracked changes

Wrap inserted runs in `w:ins` and deleted runs in `w:del`, and use `w:delText` instead of `w:t` inside deletions:

```xml
<w:p>
  <w:r><w:t xml:space="preserve">Payment is due within </w:t></w:r>
  <w:del w:id="101" w:author="Reviewer" w:date="2026-10-19T09:00:00Z">
    <w:r><w:delText>30</w:delText></w:r>
  </w:del>
  <w:ins w:id="102" w:author="Reviewer" w:date="2026-10-19T09:00:00Z">
    <w:r><w:t>14</w:t></w:r>
  </w:ins>
  <w:r><w:t xml:space="preserve"> days.</w:t></w:r>
</w:p>
```

- Each `w:id` must be unique among revision and comment IDs in the document; pick numbers above the highest one already used.
- Copy the original run's `w:rPr` into the inserted and deleted runs so formatting stays the same.
- Use the author name the user gives you; never pretend to be a named person.
- Accepting all changes: unwrap `w:ins` (keep its runs) and delete `w:del` with its content. Rejecting: the opposite. Only do either when asked, and say how many revisions were affected.

## Comments

A comment needs three things kept in step: the text in `word/comments.xml` (`w:comment w:id="5"`), the range markers in the body (`w:commentRangeStart w:id="5"` ... `w:commentRangeEnd w:id="5"` followed by a run holding `w:commentReference w:id="5"`), and, if `comments.xml` is new, a relationship in `document.xml.rels` and an override in `[Content_Types].xml`. Copy the pattern from a document that already has a comment rather than writing it from memory.
