# Detail checklist

Run per changed screen. Tick what passes, fix or list what does not.

## Layout and spacing
- [ ] Every gap, margin and padding is on the spacing scale.
- [ ] Proximity groups related items; space between groups is larger than within.
- [ ] Left edges align across header, content and footer.
- [ ] Content width is capped for reading (about 65ch); wide tables scroll inside their container, not the page.
- [ ] Nothing touches the viewport edge at 320px width; no horizontal page scroll.

## Typography
- [ ] No more than the scale's sizes; no stray 13px or 15px.
- [ ] Hierarchy is readable with colour removed (size and weight carry it).
- [ ] Line length and line height suit the text size.
- [ ] Headings use `text-wrap: balance`; paragraphs may use `text-wrap: pretty`.
- [ ] Numbers in tables, prices and counters use `tabular-nums`; right-aligned in numeric columns.
- [ ] Truncation has a full-text fallback (tooltip, title or expand) and does not cut mid-character.

## Colour
- [ ] Only semantic tokens in components.
- [ ] Accent is used for the primary action and focus, not decoration.
- [ ] Text contrast meets 4.5:1 (body) and 3:1 (large text, control borders, icons that carry meaning).
- [ ] Status is never shown by colour alone.

## Alignment details
- [ ] Icons are optically centred with their label (adjust by 1px when the glyph box misleads).
- [ ] Icon size matches text size (16px icon with 14-16px text, 20px with 18-20px).
- [ ] Inputs, buttons and selects in the same row share a height.
- [ ] Nested radii are concentric (inner = outer - padding).
- [ ] Borders are 1px and the same colour token; no double borders where cards meet.

## States
- [ ] Hover, focus-visible, active, disabled, loading, selected and invalid exist for each control.
- [ ] Loading skeleton matches the final layout; no layout shift when data arrives.
- [ ] Empty state explains and offers the next action.
- [ ] Error state says what happened and how to recover, with retry.
- [ ] Long, short, zero, one and many items all render well.

## Polish
- [ ] Images have fixed aspect ratios (`aspect-ratio`) and a placeholder background.
- [ ] Cursor is `pointer` only on clickable elements.
- [ ] Scrollbars and overflow do not shift the layout (`scrollbar-gutter: stable` where needed).
- [ ] Selection colour and caret colour suit the theme (`::selection`, `caret-color`), when the direction calls for it.
- [ ] Favicon, page title and social preview exist for public pages.
