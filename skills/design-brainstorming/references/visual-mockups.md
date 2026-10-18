# Visual mockups during design

Use these when the user has to choose between layouts, flows or visual treatments, and words would leave them guessing. A mockup is there to help them decide, not to be the product: throw it away once the design doc records the choice.

## When to offer one

- The question is about a screen, a flow across screens, a chart or dashboard, or the density and hierarchy of a page.
- Two approaches differ mainly in how they look or feel.
- The user says "show me", or keeps asking what something would look like.

Don't offer one for back-end, data or API decisions; a short table or sequence of steps is clearer there. Ask before making mockups: "Want me to sketch A and B as HTML pages you can open side by side?"

## How to make them

1. Put them outside the source tree, in a folder that's git-ignored, such as `.design/mockups/<topic>/`. Check with `git check-ignore -q .design/` first. If it isn't ignored, ask before adding it to `.gitignore`, or use the system temp folder.
2. Write **one self-contained HTML file per option**: inline CSS, no build step, no framework, no external scripts, fonts or images. Name the files `a-<short-name>.html`, `b-<short-name>.html`.
3. Use realistic but obviously fake content: plausible names and numbers that are not real people or data. Show the awkward cases too: a long name, an empty list, an error state.
4. Match only what the decision needs. Use grey boxes for anything that isn't being decided, and the project's real colours and type only if the choice depends on them.
5. Add a short header on each page: the option letter, a one-line summary, and what to look at ("compare how the filters sit relative to the table").
6. When there are more than two options, or one flow across several screens, add an `index.html` that links them, or shows them side by side in iframes.
7. Tell the user the paths and how to open them (`open` on macOS, `xdg-open` on Linux, `start` on Windows, or "open this file in your browser"). Opening a browser yourself is fine when the user asked for it.

## Taking feedback

- Ask one question per round: "Which layout, A or B?" then "What would you change about B?"
- Edit the mockup the user picked, and keep the earlier versions (`b-v2.html`) so you can go back.
- Once a section of the design is agreed, record the decision in words, with a screenshot if the user wants one. Never put the mockup HTML into the design doc or the source tree.
- When the design doc is written, offer to delete the mockup folder.

## Never

- Wire mockups to real APIs, real customer data or production credentials.
- Turn a mockup into production code by copying it into the app. Build the real thing from the design doc, test-first.
- Run a local server for mockups unless the user asks. Static files are enough, and leave nothing running.
