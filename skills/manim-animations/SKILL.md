---
name: manim-animations
description: Manim Community Edition (the manim Python package, not 3b1b manimgl) for math and explainer animations, covering Scene construct methods, Mobjects and VGroups, play with the .animate syntax, Transform versus ReplacementTransform, ValueTracker updaters and always_redraw, MathTex and Tex with a LaTeX install, and render quality flags from -ql drafts to -qk 4K. Use when writing or debugging a Manim scene, animating equations, graphs or geometry in Python, or fixing Manim LaTeX, updater or render-output problems.
license: MIT
compatibility: Any Agent Skills host. Needs Python 3 with the manim package; MathTex and Tex also need a LaTeX distribution with dvisvgm.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "python3, manim"
  kete-loom/owner: "Kete-org"
---

# Manim animations

Manim Community (`pip install manim`, `from manim import *`) builds a video from Python: a `Scene` subclass whose `construct()` adds objects and plays animations. Iterate at low quality, check single frames, and only render high quality at the end.

## 0. Before you start

1. Confirm which Manim: `import manim` and `manim --version` mean Community Edition. Code with `from manimlib import *` or `manimgl` is 3Blue1Brown's version; its API differs (for example `ShowCreation` vs `Create`, `TexText` vs `Tex`). **Don't mix them**; ask the user which one if the repo doesn't say.
2. Run `manim checkhealth` once. If equations are planned, check `latex --version` and `dvisvgm --version`. Missing LaTeX is the most common setup failure.
3. Write the storyboard as a list of beats (what appears, what changes, how long) before code. Ask the user for the target length and resolution if unknown.

## 1. Scene structure

```python
from manim import *

class PythagorasProof(Scene):
    def construct(self):
        title = Text("a² + b² = c²").to_edge(UP)
        tri = Polygon(ORIGIN, 3 * RIGHT, 3 * RIGHT + 2 * UP, color=BLUE)
        self.play(Write(title))
        self.play(Create(tri), run_time=2)
        self.wait()
```

- One scene class per beat or section; render sections separately and join them later. Long single scenes are slow to iterate on.
- Use `MovingCameraScene` to pan or zoom (`self.camera.frame.animate.scale(0.5)`), `ThreeDScene` for 3D (`self.set_camera_orientation(phi=..., theta=...)`).
- Group with `VGroup(a, b, c)` and lay out with `.arrange(DOWN, buff=0.4)`, `.next_to(obj, RIGHT)`, `.to_edge(UP)`, `.move_to(ORIGIN)`. The frame is about 14.2 by 8 units; keep content inside it.

## 2. Animations

- `self.play(Create(x))`, `Write(text)`, `FadeIn(x, shift=UP)`, `FadeOut(x)`, `GrowFromCenter(x)`, `Indicate(x)`, `Circumscribe(x)`.
- `.animate`: `self.play(square.animate.shift(RIGHT).set_color(RED))` animates the start-to-end difference of the chained calls. It interpolates positions, not paths, so a rotation by `.animate.rotate(PI)` can look like a squash; use `Rotate(square, angle=PI)` instead.
- Run several animations together by passing them to one `self.play(...)`; stagger with `LaggedStart(*anims, lag_ratio=0.2)` or `AnimationGroup`.
- Control timing with `run_time=` and `rate_func=` (`smooth` is the default, also `linear`, `there_and_back`, `rush_into`).

### Transform pitfalls

- `Transform(a, b)` morphs `a` into `b`'s shape but **`a` stays on screen as the object**; `b` is never added. Later code that animates `b` does nothing visible.
- `ReplacementTransform(a, b)` removes `a` and adds `b`; use it when the code later refers to `b`.
- `TransformMatchingTex(eq1, eq2)` (or `TransformMatchingShapes`) for equation steps where terms move to new places.

## 3. Updaters and changing values

- A `ValueTracker` holds a number you animate: `t = ValueTracker(0)`, `self.play(t.animate.set_value(5), run_time=3)`.
- Rebuild an object every frame from the tracker: `dot = always_redraw(lambda: Dot(axes.c2p(t.get_value(), f(t.get_value()))))`.
- Or attach an updater: `label.add_updater(lambda m: m.next_to(dot, UP))`. Use the `(m, dt)` signature for motion based on elapsed time.
- Remove updaters (`clear_updaters()`) when done, or they keep running in later animations and slow rendering.
- Updaters only run while the scene is playing or waiting; a `self.wait()` keeps them going.

## 4. Text and LaTeX

- `Text("...")` uses Pango, no LaTeX needed, supports non-Latin scripts and `font=`.
- `MathTex(r"\int_0^1 x^2\,dx")` is math mode; `Tex(r"Area is $\pi r^2$")` is text mode. Always use raw strings (`r"..."`), or backslashes break.
- Split an equation into parts to colour or transform them: `MathTex("a^2", "+", "b^2", "=", "c^2")`, then `eq[0].set_color(BLUE)` or `eq.set_color_by_tex("c^2", RED)`.
- Extra packages: a `TexTemplate` with `add_to_preamble(r"\usepackage{...}")`, passed as `tex_template=`.
- A LaTeX error prints the `.tex` file path under `media/Tex/`; read its `.log` for the real error.

## 5. Graphs and geometry

- `axes = Axes(x_range=[-3, 3, 1], y_range=[-1, 9, 1], axis_config={"include_numbers": True})`, `graph = axes.plot(lambda x: x**2, color=YELLOW)`, `axes.get_area(graph, x_range=[0, 2])`, `axes.c2p(x, y)` to convert coordinates.
- `NumberPlane()` for grids, `ParametricFunction` for curves, `Arrow`, `Brace(obj, DOWN)` with `.get_text("...")`.

## 6. Rendering

`manim [flags] file.py SceneName` (same as `manim render ...`).

| Flag | Output |
|---|---|
| `-ql` | 854x480, 15 fps: drafts |
| `-qm` | 1280x720, 30 fps |
| `-qh` | 1920x1080, 60 fps |
| `-qp` | 2560x1440, 60 fps |
| `-qk` | 3840x2160, 60 fps |

- `-p` opens the result; `-s` saves only the last frame as PNG (fast layout check); `-n 3,5` renders only a range of `play`/`wait` calls by index; `-a` renders all scenes in the file; `--format=png|gif|mp4|webm|mov` (`png` writes an image sequence); `-t` for a transparent background (`.mov`).
- Output goes to `media/videos/<file>/<resolution><fps>/SceneName.mp4`, for example `media/videos/proof/480p15/`.
- Partial-movie caching makes re-renders fast; if output looks stale after changing something outside `construct` (a template, an asset), add `--disable_caching` or delete the `media/` folder.
- Set defaults per project in `manim.cfg` (`[CLI]` section, for example `quality = low_quality`, `background_color = WHITE`).

## Never

- Never render the whole video at `-qh` or `-qk` while still changing it; draft at `-ql` and check frames with `-s`.
- Never mix ManimGL and Manim Community imports or examples from the other's docs.
- Never leave updaters attached to objects that are later faded out and re-added; they stack up.

## Stop and ask the user

- If LaTeX isn't installed and equations are needed: installing a TeX distribution is large; ask before doing it, and offer `Text` as a fallback for simple formulas.
- When the maths shown must be correct for teaching (proofs, statistics): show the user the formulas and steps for review before the final render.

## Report back

Scenes written, the exact render commands, output file paths and resolution, and a list of beats with their approximate durations.
