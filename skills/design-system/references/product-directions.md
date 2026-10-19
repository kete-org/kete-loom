# Product directions

Starting points by product category. Read the row for the product (two rows for a hybrid), then adjust for the brief. These are defaults to argue with, not rules: a brand, a design file or the existing app wins. Tag anything you take from here as `[table]` in the direction.

Every accent below passes 4.5:1 with white text on it and as text on white (checked with `scripts/contrast.js`; the repo's tests re-check them). Dark themes need a lighter step of the same hue: check it again.

Dials are density / expressiveness / motion, 1-10.

| Category | Layout pattern | Visual direction | Colour mood, accent | Type | Dials | Avoid |
|---|---|---|---|---|---|---|
| B2B SaaS app | sidebar nav + content; list, detail, settings | quiet utility, borders over shadows | trustworthy neutral + blue, `#2563eb` | Inter or system UI | 6 / 3 / 3 | gradient heroes inside the app, colour on every element |
| Analytics dashboard | KPI row, then charts by question, then tables | data-first, low chrome, tabular numbers | neutral greys + indigo, `#4f46e5`; status hues reserved for status | Inter / IBM Plex Sans + mono for figures | 8 / 2 / 2 | 3D and pie charts for comparison, decorative colour in charts |
| Admin / internal tool | dense tables, filters, bulk actions, audit trail | plain, predictable, keyboard-first | slate, `#475569`, one accent for primary action | system UI | 8 / 1 / 1 | marketing styling, hidden destructive actions |
| Developer tool | docs-style nav, code blocks, command palette | technical, monospace accents, dark theme first-class | near-black + green, `#15803d` | Inter + JetBrains Mono | 7 / 4 / 2 | low-contrast syntax themes, gimmicky terminals |
| AI assistant / chat | conversation column, composer, sources panel | calm, content-first, clear provenance of answers | soft neutral + indigo, `#4338ca` | Inter / Geist | 5 / 4 / 4 | typing animations that delay text, no way to see sources |
| Fintech / banking | balance summary, transactions list, clear money movement steps | conservative, high trust, explicit confirmations | deep teal, `#0f766e`; red and green never alone | Inter / Source Sans 3, tabular numbers | 6 / 2 / 2 | playful motion around money, ambiguous totals |
| Healthcare / patient | task-first flows, large targets, plain language | calm and legible, generous spacing | clinical blue, `#0369a1` | Atkinson Hyperlegible / Source Sans 3 | 3 / 2 / 2 | small text, colour-only alerts, jargon |
| Government / public service | single-column, one question per page, clear headings | plain, accessible, no decoration | strong blue, `#1d70b8`, high-contrast focus | system UI / Atkinson Hyperlegible | 4 / 1 / 1 | carousels, hidden help, time limits |
| E-commerce retail | product grid, filters, PDP with gallery, sticky cart | product photography leads, UI recedes | warm neutral + orange CTA, `#c2410c` | DM Sans / Inter | 6 / 5 / 4 | fake urgency, low-contrast prices, layout shift from images |
| Luxury / fashion | editorial grid, large imagery, sparse copy | restrained, high whitespace, serif display | black and ivory, `#1c1917`; gold only as decoration | Playfair Display or Cormorant + Inter | 2 / 7 / 4 | discount-store badges, crowded grids |
| Marketplace (two-sided) | search-first, cards with trust signals, messaging | friendly and clear, trust badges consistent | violet, `#6d28d9` | Inter / Manrope | 6 / 4 / 3 | inconsistent card layouts between sellers |
| Food / restaurant / delivery | menu sections, item sheets, cart, order tracking | appetising photography, warm tones | warm red, `#b91c1c` | Poppins / DM Sans | 5 / 6 / 4 | tiny tap targets on menus, hidden fees |
| Travel / hospitality | search panel, results with map, booking steps | aspirational imagery, clear prices | ocean cyan, `#0e7490` | DM Sans / Lora for editorial | 5 / 5 / 4 | price surprises at the last step |
| Real estate / property | search with map, listing cards, gallery, enquiry form | clean, photography-led, spacious | trustworthy blue, `#1d4ed8` | Inter / Libre Baskerville headings | 5 / 4 / 3 | auto-playing galleries, unclear fees |
| Education / learning | course outline, lesson view, progress, quizzes | encouraging, clear progress, readable long text | violet, `#7c3aed` | Nunito or Lexend + Inter | 4 / 5 / 5 | walls of text, gamification that hides content |
| Kids / family | big targets, few choices per screen, icons with labels | playful shapes, bright but controlled colour | purple, `#9333ea` | Nunito / Baloo 2 | 3 / 8 / 6 | small text, ads styled as content |
| Productivity / notes | three panes or list + editor, keyboard shortcuts | quiet, focused, typography carries hierarchy | warm amber, `#b45309` | Inter / iA Writer-style mono option | 6 / 2 / 2 | modal-heavy flows, noisy toolbars |
| Social / community | feed, profile, composer, notifications | lively but legible, avatars and media first | pink, `#be185d` | Inter / Plus Jakarta Sans | 6 / 6 / 5 | infinite scroll with no landmarks, engagement dark patterns |
| Media / streaming / entertainment | dark-first rows of artwork, detail page, player | immersive, imagery over chrome | dark + rose, `#be123c` | Inter / Bebas Neue display only | 5 / 7 / 6 | autoplay with sound, text over busy art without scrims |
| News / editorial | headline hierarchy, article column 60-75ch, related | typographic, serif body or headings | ink + red, `#b91c1c` | Source Serif 4 / Newsreader + Inter | 5 / 4 / 2 | ads breaking the reading column, tiny body text |
| Wellness / beauty / spa | calm hero, services, booking | soft, natural, generous whitespace | sage olive, `#3f6212` | Cormorant / Lora + Inter | 3 / 5 / 3 | low-contrast pastel text |
| Nonprofit / charity | mission hero, impact numbers, donate flow | warm, human, photography of people | emerald, `#047857` | Merriweather / Source Sans 3 | 4 / 5 / 3 | guilt patterns, pre-ticked recurring donations |
| Portfolio / agency | case-study grid, project pages, contact | expressive, one signature idea | near-black + one accent, `#9f1239` | a distinctive display face + neutral body | 3 / 9 / 7 | template hero with gradient blob, motion that hides content |
| Landing page / marketing site | hero with one promise, proof, features, pricing, FAQ, CTA | brand-led, one primary CTA repeated | brand accent; default `#2563eb` | brand fonts; else Inter + a display face | 4 / 6 / 5 | five competing CTAs, fake testimonials, carousels for key content |

## Notes by category

- **Dashboards**: put the decision first (what will someone do differently after reading it?). Chart choice and metric definitions belong to `metrics-dashboards`.
- **Mobile apps** (any category): follow the platform first. Tab bar of 3-5 destinations, 44x44pt (iOS) or 48x48dp (Android) targets, safe areas respected, system text styles so Dynamic Type and font scaling work. See `mobile-accessibility`.
- **Healthcare, government, fintech**: accessibility and clarity outrank expressiveness; keep expressiveness at 3 or below unless the brand insists, and record the trade-off.
- **Landing pages**: section order and conversion detail belong to `conversion-optimization`; this table only sets the visual system.
- **Hybrid products** (an AI feature inside a B2B app): take the layout from the host product and add the second row's specific parts (sources panel, composer). Don't mix two visual directions.

## When nothing fits

Say so. Use the B2B SaaS row as the general default, label every choice `[default]`, and ask the user one question that would let you choose better (usually: who uses it, and what's the one thing they come to do).
