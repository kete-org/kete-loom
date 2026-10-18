# Queries and matchers

## Variants

| Prefix | 0 matches | 1 match | >1 match | Async |
|---|---|---|---|---|
| `getBy` | throws | returns | throws | no |
| `queryBy` | `null` | returns | throws | no |
| `findBy` | rejects | resolves | rejects | yes (default 1000 ms) |
| `getAllBy` / `queryAllBy` / `findAllBy` | throw / `[]` / reject | array | array | as above |

## Role queries that trip people up

| Element | Role |
|---|---|
| `<a href>` | `link` (no `href` means no role) |
| `<input type="text">`, `<textarea>` | `textbox` |
| `<input type="search">` | `searchbox` |
| `<input type="checkbox">` | `checkbox` |
| `<input type="number">` | `spinbutton` |
| `<select>` | `combobox` (single) or `listbox` (multiple / size > 1) |
| `<h1>`-`<h6>` | `heading`, filter with `{ level: 2 }` |
| `<ul>`, `<li>` | `list`, `listitem` |
| `<table>` rows | `row`, `cell`, `columnheader` |
| `<dialog open>` or `role="dialog"` | `dialog` |
| `<img alt="">` | `presentation` (not `img`) |

Useful options: `name` (accessible name, string or regex), `hidden: true` (include `aria-hidden`), `selected`, `checked`, `pressed`, `expanded`, `level`.

`screen.logTestingPlaygroundURL()` and `screen.debug()` help find the right query; delete them before committing.

## jest-dom matchers worth using

`toBeInTheDocument`, `toBeVisible`, `toBeDisabled` / `toBeEnabled`, `toHaveValue`, `toBeChecked`, `toHaveAccessibleName`, `toHaveAccessibleDescription`, `toHaveAttribute`, `toHaveTextContent`, `toHaveFocus`, `toHaveAccessibleErrorMessage` (check the installed jest-dom version supports it).

## Common mistakes

- `expect(screen.getByText('x')).toBeInTheDocument()` is fine; `expect(screen.queryByText('x')).toBeInTheDocument()` hides the better error message `getBy` gives.
- `await waitFor(() => screen.getByText('x'))` should be `await screen.findByText('x')`.
- Text split across elements (`<b>3</b> items`) does not match `getByText('3 items')`; query the container by role or use a function matcher.
- `userEvent.type` into a field that already has a value appends; call `user.clear(field)` first.
