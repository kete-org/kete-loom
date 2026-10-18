---
name: ui-motion
description: Interface animation for the web with the Motion library (motion/react, formerly Framer Motion) and plain CSS transitions, keyframes and the View Transitions API - motion duration and easing tokens, spring physics, hover, tap and drag gestures, AnimatePresence exit animations, layout and shared-element transitions, route changes, prefers-reduced-motion fallbacks, and keeping animation on transform and opacity within the frame budget. Use when adding or fixing a micro-interaction, modal or list animation, page transition or draggable element, an animation stutters or causes layout shift, or motion must respect reduced-motion settings.
license: MIT
compatibility: Any Agent Skills host. Motion examples need React 18+ and the motion npm package; CSS and View Transitions sections apply to any framework.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# UI motion

Animation in a product UI has a job: show where something came from, confirm an action, or keep the user oriented during a change. If it does none of these, leave it out. Good UI motion is short, consistent, interruptible and optional.

Neighbours: `remotion-video` and `manim-animations` render video; `ui-design-polish` sets the visual direction; `react-performance` covers render cost. This skill is live interface animation.

## 0. Before you start

1. Check what the project has: `motion` or `framer-motion` in `package.json`, a CSS animation convention, or existing duration/easing variables. Use what is there. Do not add Motion for something a CSS transition does.
2. Note the import path in use. Current Motion: `import { motion, AnimatePresence } from "motion/react"`. Older code imports the same names from `"framer-motion"`; both work, do not mix them in one codebase. Migrating is a separate change; **ask first**.
3. Ask what the motion is for if it is not obvious. "Make it feel alive" needs a concrete target: which element, which change, what it should communicate.

## 1. Decide: CSS or Motion

| Need | Use |
|---|---|
| Hover, focus, colour or simple show/hide state | CSS `transition` |
| Looping or decorative keyframes (spinner, shimmer) | CSS `@keyframes` |
| Exit animation when React unmounts an element | Motion `AnimatePresence` |
| Element changes size/position because layout changed (reorder, expand) | Motion `layout` |
| Same thing moves between two components (thumbnail to detail) | Motion `layoutId`, or View Transitions |
| Drag, swipe, pan with momentum | Motion `drag` |
| Interruptible, velocity-aware motion | Motion springs |
| Page or route change in a multi-page or SPA app | View Transitions API where supported, else Motion `AnimatePresence` around the route |

## 2. Motion tokens

Define once and reuse (values to start from in `references/tokens.md`):

- Durations: `--duration-fast` 100-150ms (hover, press), `--duration-base` 200-250ms (small enter/exit), `--duration-slow` 300-400ms (modals, page-level). UI animation over 500ms feels slow.
- Easing: ease-out for entering (`cubic-bezier(0.2, 0, 0, 1)` style curves), ease-in for leaving, ease-in-out for moving on screen. Never linear except for progress and spinners.
- Springs: two or three named presets (`snappy`, `gentle`, `bouncy`) as Motion transition objects.
- Exits are faster than entrances (about 75% of the enter duration).

## 3. Build it

Core patterns with code in `references/patterns.md`:

- **Enter/exit**: wrap conditionally rendered elements in `<AnimatePresence>`, give each child a stable `key`, set `initial`, `animate` and `exit`. Use `mode="wait"` when one element replaces another; `initial={false}` on `AnimatePresence` to skip the animation on first page load.
- **Gestures**: `whileHover`, `whileTap`, `whileFocus` for feedback. Tap feedback is a small scale (0.97-0.98), not a bounce.
- **Drag**: `drag` (`true`, `"x"` or `"y"`), `dragConstraints` (pixel object or a ref to a container), `dragElastic` (0-1), `dragMomentum={false}` to stop on release, `onDragEnd={(e, info) => ...}` using `info.offset` and `info.velocity` to decide a swipe. Always provide a keyboard or button alternative to a drag action.
- **Layout**: `layout` on elements whose position or size changes; `layout="position"` when only position should animate (stops text squashing); `layoutId` for shared elements. Wrap siblings that affect each other in `<LayoutGroup>`.
- **Lists**: stagger with `transition={{ delay: index * 0.03 }}` or variants with `staggerChildren`; cap total stagger at about 300ms so long lists do not take seconds.
- **Springs**: `transition={{ type: "spring", visualDuration: 0.3, bounce: 0.2 }}` is easiest to reason about; or `stiffness`/`damping`/`mass` (these override `bounce` and `duration`). Bounce 0 for UI chrome, 0.1-0.3 for playful elements.
- **Bundle size**: in bundle-sensitive apps use `LazyMotion` with `domAnimation` (no drag or layout) or `domMax` and the `m` component from `"motion/react-m"`.

## 4. Reduced motion

Required, not optional (WCAG 2.2 SC 2.3.3 Animation from Interactions is AAA, but vestibular disorders are common and the OS setting is the user's explicit request).

- App-wide in Motion: `<MotionConfig reducedMotion="user">` at the root. It disables transform and layout animations when the OS setting is on and keeps opacity and colour changes.
- Per component: `const reduce = useReducedMotion();` then swap movement for a fade.
- CSS: `@media (prefers-reduced-motion: reduce) { ... }` removing translation, parallax, auto-play and large scale changes. Keep short opacity fades so state changes are still visible.
- Auto-playing or looping motion longer than 5 seconds needs a pause control (WCAG 2.2.2).
- Nothing should flash more than three times per second (WCAG 2.3.1).

## 5. Performance

- Animate `transform` (`x`, `y`, `scale`, `rotate`) and `opacity`. These can run on the compositor. Animating `width`, `height`, `top`, `left`, `margin` or `box-shadow` triggers layout or paint every frame; use `layout` animations or `transform: scale` instead.
- Frame budget: 16.7ms at 60Hz, 8.3ms at 120Hz. Check with the browser's Performance panel (look for long tasks and layout/paint during the animation) and the Rendering panel's paint flashing.
- `will-change: transform` only on elements about to animate, removed after; not on everything.
- Do not drive animation from React state set every frame; use Motion values (`useMotionValue`, `useTransform`, `useScroll`) which update without re-rendering.
- Scroll-linked effects: prefer CSS scroll-driven animations (`animation-timeline: scroll()` / `view()`) where browser support fits, or Motion `useScroll`; never a `scroll` event listener that sets state.
- Test on a throttled CPU (4x slowdown) and a real low-end phone if the audience uses them.

## 6. Verify

1. Trigger each animation, then interrupt it (click again mid-animation, navigate away). It must not jump, stack or leave an element half-visible.
2. Turn on the OS reduced-motion setting (or emulate `prefers-reduced-motion` in browser devtools) and repeat.
3. Record a performance profile of the heaviest animation; no dropped frames on the target device class.
4. Check keyboard: focus lands correctly after a modal opens or a route changes, and is not lost to an exiting element.
5. Check no layout shift is introduced (elements entering should not push content after load).

## Never

- Never block input until an animation finishes, or make users wait for motion to reach content.
- Never animate on page load just because you can; entrance animations on every scroll section get tiring.
- Never use motion as the only signal of a state change.
- Never mix `framer-motion` and `motion/react` imports, or two animation libraries on one element.

## Report back

```
## Motion: <scope>
Added/changed: <element: trigger -> animation, duration/spring, file>
Tokens: <defined or reused>
Reduced motion: <how each animation degrades>
Performance: <properties animated; profile result or "not profiled">
Interruptions tested: <yes/no, what>
Not done: <items and why>
```
