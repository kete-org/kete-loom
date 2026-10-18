---
name: remotion-video
description: Remotion video projects written in React, covering Composition and Sequence timing, frame-driven animation with interpolate and spring, staticFile assets, font loading held by delayRender, deterministic rendering with the remotion CLI or renderMedia, and serverless rendering on AWS Lambda with concurrency and S3 privacy settings. Use when building or fixing a Remotion composition, timing scenes in frames, animating with useCurrentFrame, rendering an MP4 from React code, or setting up Remotion Lambda.
license: MIT
compatibility: Any Agent Skills host. Needs Node 18+ and a Remotion 4 project; Lambda rendering needs an AWS account and network access.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "node, npx"
  kete-loom/owner: "Kete-org"
---

# Remotion video

Remotion renders a React tree once per frame in a headless browser and encodes the frames. Everything visible must be a pure function of the current frame. That one rule explains most Remotion bugs.

## Ground rules

1. **Time is frames, not seconds.** Read `useCurrentFrame()` and `useVideoConfig()` (`fps`, `durationInFrames`, `width`, `height`). Convert seconds with `seconds * fps`. Never use `Date.now()`, `setTimeout`, `setInterval` or CSS transitions/animations for motion: they don't follow the frame and render as jumps or flicker.
2. **Deterministic.** No `Math.random()`; use `random(seed)` from `remotion`. Data fetched at render time must be the same on every frame and every machine.
3. **Anything async holds the frame.** Fetching data, loading fonts, waiting for a canvas or a third-party chart: wrap it with `useDelayRender()` (or `delayRender()` / `continueRender(handle)`), and call `cancelRender(err)` on failure. The default timeout is 30 seconds; raise it per call with `timeoutInMilliseconds`, not globally by habit.
4. **Use Remotion's media tags.** `<Img>`, `<Audio>`, and `<Video>` from `@remotion/media` (or `<OffthreadVideo>` for older code) wait for media to load before a frame is captured. A plain `<img>` or `<video>` can be captured half-loaded.
5. **Assets come from `public/` through `staticFile('name.png')`**, or from a full URL. Don't import big videos into the bundle.

## Project shape

- `src/index.ts` calls `registerRoot(RemotionRoot)`.
- `src/Root.tsx` lists `<Composition id="Intro" component={Intro} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={...} />`. The `id` is what you render.
- Typed props: give the composition a Zod `schema` so props can be edited in the Studio and validated before render. Use `calculateMetadata` when duration or size depends on props or data (for example, length of a voice-over).
- Preview with `npx remotion studio`. Start a new project with `npx create-video@latest`.

## Timing scenes

1. Put each scene in `<Sequence from={f} durationInFrames={d}>`. Inside, `useCurrentFrame()` restarts at 0, so a scene's animation code doesn't need to know where it sits.
2. Lay out back-to-back scenes with `<Series>` and `<Series.Sequence durationInFrames={d}>` instead of adding offsets by hand.
3. For crossfades and slides between scenes use `@remotion/transitions` (`TransitionSeries` with `fade()`, `slide()` and a timing such as `linearTiming` or `springTiming`). A transition overlaps two scenes, so the total gets shorter by the transition length.
4. Wrap layers in `<AbsoluteFill>` to stack them full-frame.
5. Keep timing numbers in one place (a `timings` object or computed from props) so a script change doesn't mean editing ten files.

## Animation

- `interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`. Without `clamp` the value keeps going past the range: opacity above 1, elements flying off-screen. Input ranges must be strictly increasing.
- Easing: pass `easing: Easing.bezier(...)` or `Easing.out(Easing.cubic)` to `interpolate`.
- `spring({ frame, fps, config: { damping: 200 }, delay: 10, durationInFrames: 30 })` returns 0 to about 1 with physics; defaults are `mass: 1`, `damping: 10`, `stiffness: 100`. Higher `damping` means less bounce. Feed the result into `interpolate` to map it to pixels or degrees.
- Colours: `interpolateColors(frame, [0, 60], ['#000', '#fff'])`.
- Animate `transform` and `opacity`. Animating `width`, `top` or heavy `filter: blur()` per frame is slow to render.

## Text, fonts and audio

- Load fonts before frames are captured: `loadFont()` from `@remotion/google-fonts/<Family>`, or `@remotion/fonts` `loadFont({ family, url: staticFile('x.woff2') })`. Both hold the render until the font is ready. A system font that isn't installed on the render machine or Lambda will silently fall back.
- Measure text with `@remotion/layout-utils` (`measureText`, `fitText`) when it must fit a box.
- Audio: `<Audio src={staticFile('music.mp3')} volume={(f) => interpolate(f, [0, 30], [0, 1], {extrapolateRight: 'clamp'})} />`. Skip the start with `trimBefore` (in frames; code before 4.0.319 uses `startFrom`) and cap the length by wrapping it in a `<Sequence durationInFrames>`.
- Captions: `@remotion/captions` for the caption data type and TikTok-style pages.

## Rendering locally

1. `npx remotion render <entry> <composition-id> out/video.mp4` (the entry defaults to the configured entry point). Common flags: `--props=./props.json`, `--codec=h264|h265|vp8|vp9|prores`, `--crf`, `--concurrency`, `--frames=0-59` for a quick check, and `npx remotion still <id> out/frame.png --frame=120` for one frame.
2. From Node: `bundle()` from `@remotion/bundler`, then `selectComposition()` and `renderMedia()` from `@remotion/renderer`. Bundle once and reuse it for many renders.
3. Check the output with a quick look in a player and `ffprobe out/video.mp4` (duration, fps, resolution, audio stream present).

## Rendering on Lambda

Follow `references/lambda.md`. In short: create the IAM role and user from `npx remotion lambda policies role|user`, `npx remotion lambda functions deploy`, `npx remotion lambda sites create src/index.ts --site-name=<name>`, then `npx remotion lambda render <serve-url> <composition-id>` or `renderMediaOnLambda()` with `getRenderProgress()`.

## Performance checklist

When renders are slow or time out, check in order:

1. Run `npx remotion benchmark` or render with `--log=verbose` to see slow frames.
2. Heavy work per frame (parsing JSON, building big arrays): move it into `useMemo` or `calculateMetadata`.
3. Big images: resize to the output size; prefer JPEG/WebP over huge PNGs.
4. Too many simultaneous videos, or `<Video>` sources with sparse keyframes: re-encode sources with FFmpeg (see the ffmpeg-media-processing skill).
5. GPU-only CSS (`backdrop-filter`, large blurs, WebGL) on a machine without a GPU: check what's available with `npx remotion gpu`, try `--gl=angle` or `--gl=swangle` (the Lambda default), or simplify the effect.
6. Tune `--concurrency`; more is not always faster on a small machine.

## Never

- Never drive motion with timers, CSS animations, or state updated in `useEffect` per frame.
- Never leave a `delayRender()` without a matching `continueRender()` or `cancelRender()` on every code path.
- Never commit AWS keys; `REMOTION_AWS_ACCESS_KEY_ID` and `REMOTION_AWS_SECRET_ACCESS_KEY` live in `.env` that is gitignored.

## Stop and ask the user

- Before the first Lambda deploy or a large Lambda render: it creates AWS resources and costs money.
- Whether rendered files should be public or private in S3 (`--privacy`); the default is public.
- Licensing: Remotion is free for individuals and companies of up to 3 people; bigger for-profit companies need a company license. Point it out once when the project is for a company; don't decide for them.

## Report back

Composition IDs touched, the render command you ran, output path with duration/fps/resolution from `ffprobe`, and any frame you checked by eye.
