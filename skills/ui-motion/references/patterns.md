# Motion patterns

Motion for React (`npm i motion`, imports from `"motion/react"`). Check the project's installed version; the API below matches current Motion docs.

## Enter and exit

```tsx
import { AnimatePresence, motion } from "motion/react";

<AnimatePresence>
  {open && (
    <motion.div
      key="panel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
      transition={spring.gentle}
    />
  )}
</AnimatePresence>
```

The conditional must be inside `AnimatePresence`; if the whole `AnimatePresence` unmounts, there is no exit animation.

## Replace one element with another

```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.span key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    {label}
  </motion.span>
</AnimatePresence>
```

Changing `key` is what triggers exit then enter.

## Reorderable list

```tsx
<ul>
  <AnimatePresence initial={false}>
    {items.map((item) => (
      <motion.li key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {item.name}
      </motion.li>
    ))}
  </AnimatePresence>
</ul>
```

Use `item.id` keys, never the array index, or the wrong items animate. For drag-to-reorder, Motion has `Reorder.Group` / `Reorder.Item`.

## Shared element

```tsx
// In the grid
<motion.img layoutId={`photo-${id}`} src={thumb} />
// In the detail view
<motion.img layoutId={`photo-${id}`} src={full} />
```

If text inside a `layout` element distorts, add `layout` to the child as well, or use `layout="position"`.

## Swipe to dismiss

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.6}
  onDragEnd={(_, info) => {
    if (Math.abs(info.offset.x) > 120 || Math.abs(info.velocity.x) > 500) onDismiss();
  }}
/>
```

Also render a visible dismiss button: drag is not available to keyboard or switch users.

## Scroll-linked progress bar

```tsx
const { scrollYProgress } = useScroll();
return <motion.div style={{ scaleX: scrollYProgress, transformOrigin: "0 50%" }} className="progress" />;
```

CSS-only alternative where supported:

```css
.progress { transform-origin: 0 50%; animation: grow linear both; animation-timeline: scroll(); }
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

## Reduced motion

```tsx
import { MotionConfig, useReducedMotion } from "motion/react";

<MotionConfig reducedMotion="user">{app}</MotionConfig>   // "user" | "always" | "never"

function Card() {
  const reduce = useReducedMotion();
  return <motion.div initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} />;
}
```

## View Transitions API (no library)

Same-document (SPA):

```js
if (!document.startViewTransition) updateDom();
else document.startViewTransition(() => updateDom());
```

```css
.hero-image { view-transition-name: hero; }          /* unique per page */
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 200ms; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none; }
}
```

Cross-document (multi-page sites): add `@view-transition { navigation: auto; }` to both pages' CSS. Check current browser support on MDN or caniuse before relying on it; it degrades to a normal navigation where unsupported.

In frameworks, use their wrapper when one exists (for example Astro's `<ClientRouter />` or the router's view-transition option) rather than calling the API by hand around router internals.

## Bundle-size mode

```tsx
import { LazyMotion, domAnimation } from "motion/react";
import * as m from "motion/react-m";

<LazyMotion features={domAnimation} strict>
  <m.div animate={{ opacity: 1 }} />
</LazyMotion>
```

`domAnimation` covers animations, variants, exit and tap/hover/focus gestures; `domMax` adds drag, pan and layout animations. `strict` throws if a full `motion` component sneaks in.
