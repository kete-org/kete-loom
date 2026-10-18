# PowerPoint decks

## pandoc: Markdown to .pptx

```markdown
---
title: Checkout reliability
author: Payments team
---

# Checkout failures cost us 4% of orders

- 1,240 failed orders in Q3
- Mostly at the payment step

::: notes
Open with the cost, then say we found one main cause.
:::

# 70% come from one provider timeout

![Failures by cause](failures.png)
```

```bash
pandoc slides.md -o slides.pptx --slide-level=1 --reference-doc=template.pptx
```

- `--slide-level` picks which heading level starts a slide (here `#`).
- `--reference-doc` takes a template whose layouts are named Title Slide, Title and Content, Section Header, Two Content, Comparison, Content with Caption and Blank; missing layouts fall back to pandoc's default with a warning.
- Get pandoc's default template to edit: `pandoc -o custom-reference.pptx --print-default-data-file reference.pptx`.
- Two columns: `:::::: {.columns}` with two `::: {.column}` blocks.
- Speaker notes: `::: notes` blocks.

## python-pptx: generate or fill a template

`pip install python-pptx`.

```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation("template.pptx")          # or Presentation() for a blank 4:3 default
# Blank default is 4:3; for 16:9:
# prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)

for i, layout in enumerate(prs.slide_layouts):          # find layout names first
    print(i, layout.name, [p.placeholder_format.idx for p in layout.placeholders])

slide = prs.slides.add_slide(prs.slide_layouts[1])      # Title and Content in most templates
slide.shapes.title.text = "70% of failures come from one provider timeout"
body = slide.placeholders[1].text_frame
body.text = "Timeouts after 10 seconds"
p = body.add_paragraph(); p.text = "No retry on our side"; p.level = 0
slide.notes_slide.notes_text_frame.text = "Explain the timeout, then move to the fix."

pic = slide.shapes.add_picture("chart.png", Inches(1), Inches(2), width=Inches(8))
# alt text: python-pptx has no direct API; set the descr attribute on the cNvPr element
pic._element.nvPicPr.cNvPr.set("descr", "Bar chart: provider timeouts are 70% of failures")

prs.save("deck.pptx")
```

Rules:

- Fill **placeholders** from the template's layouts; do not add free text boxes over them, or the template's styling and accessibility reading order break.
- Print the layouts and placeholder indexes first (loop above); indexes differ between templates.
- Native charts: `slide.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, x, y, cx, cy, chart_data)` with `CategoryChartData` keeps them editable; use an image only if the user does not need to edit.
- Fonts render with whatever is installed on the viewer's machine; stick to the template's fonts.
- Deleting slides and reordering need XML manipulation in python-pptx; for heavy edits of an existing deck, consider asking the user to do structural changes in PowerPoint and automate only the content.

## Reading an existing .pptx

```python
for n, slide in enumerate(prs.slides, 1):
    texts = [s.text_frame.text for s in slide.shapes if s.has_text_frame]
    notes = slide.notes_slide.notes_text_frame.text if slide.has_notes_slide else ""
    print(n, slide.slide_layout.name, texts, notes)
```

## PDF from .pptx

```bash
soffice --headless --convert-to pdf --outdir out deck.pptx
```

LibreOffice substitutes missing fonts; check the PDF. For pixel-exact output, export from PowerPoint or Keynote itself.
