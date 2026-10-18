# Motion tokens

Starting values; tune to the product's tone. Keep CSS and JS in sync by defining them once.

```css
:root {
  --duration-instant: 75ms;
  --duration-fast: 150ms;
  --duration-base: 220ms;
  --duration-slow: 350ms;

  --ease-out: cubic-bezier(0.2, 0, 0, 1);       /* enter */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);        /* exit */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);  /* move on screen */
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 1ms;
    --duration-base: 1ms;
    --duration-slow: 1ms;
  }
}
```

Setting durations to `1ms` rather than `0` keeps `transitionend` / `animationend` events firing for code that waits on them. Only do this blanket reduction if every animation is decorative; otherwise keep opacity fades and remove movement per component.

```ts
// motion-tokens.ts
import type { Transition } from "motion/react";

export const spring = {
  snappy: { type: "spring", visualDuration: 0.2, bounce: 0 },
  gentle: { type: "spring", visualDuration: 0.35, bounce: 0.1 },
  bouncy: { type: "spring", visualDuration: 0.45, bounce: 0.3 },
} satisfies Record<string, Transition>;

export const fade = { duration: 0.15, ease: [0.2, 0, 0, 1] } satisfies Transition;
```

## What to use where

| Element | Enter | Exit | Notes |
|---|---|---|---|
| Button press | scale 0.97, `instant` | back, `fast` | `whileTap` |
| Tooltip | opacity + 4px y, `fast` | opacity, `instant` | delay show 300-500ms, hide immediately |
| Dropdown / popover | opacity + scale 0.96 from trigger origin, `fast` | opacity, `instant` | `transform-origin` at the trigger |
| Toast | slide + fade, `gentle` spring | fade, `fast` | |
| Modal | backdrop fade `base`; panel scale 0.96 + fade | faster than enter | return focus to the trigger |
| Drawer / sheet | translate from edge, `snappy` spring | translate out | drag to dismiss with velocity threshold |
| List add/remove | height via `layout`, fade | fade, then siblings close gap | `AnimatePresence` + `layout` |
| Route change | crossfade `base` or shared element | | keep under 300ms |
