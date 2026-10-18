# Batch edits and rendering

## Driver script (one Blender process per file)

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p out
for f in assets/*.blend; do
  blender -b --factory-startup "$f" --python-exit-code 1 -P edit.py -- "$PWD/out/$(basename "$f")" \
    && echo "ok $f" || echo "FAILED $f"
done
```

## edit.py pattern

```python
import bpy, sys
out = sys.argv[sys.argv.index("--") + 1]

changed = 0
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        bsdf.inputs["Roughness"].default_value = 0.6
        changed += 1

for ob in bpy.data.objects:
    if ob.type == 'MESH' and not any(m.type == 'WEIGHTED_NORMAL' for m in ob.modifiers):
        ob.modifiers.new("WeightedNormal", 'WEIGHTED_NORMAL')

print(f"RESULT changed_materials={changed}")
bpy.ops.wm.save_as_mainfile(filepath=out, copy=True)
```

Rules:
- Socket names (such as "Roughness") and node types can change between versions; check the API docs for the installed version and fail loudly if a name is missing.
- Prefer `bpy.data` edits over `bpy.ops`; when an operator is unavoidable, use `with bpy.context.temp_override(...)` to give it the context it needs.
- Use `bpy.ops.wm.save_as_mainfile(..., copy=True)` so the open file name is not changed and originals are not touched.
- Linked library data is read-only in the file that links it; edit the library file itself.

## Cycles GPU pre-render script

```python
import bpy
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"   # or CUDA, HIP, METAL, ONEAPI, depending on hardware
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type != "CPU"
scn = bpy.context.scene
scn.render.engine = "CYCLES"
scn.cycles.device = "GPU"
scn.cycles.samples = 256
scn.cycles.use_denoising = True
```

Use it with `blender -b shot.blend -P gpu.py -o /abs/renders/shot_#### -F PNG -a`. If no GPU device appears in `prefs.devices`, say so; do not silently fall back to a CPU render that will take hours.

## Render settings from Python

```python
r = bpy.context.scene.render
r.resolution_x, r.resolution_y, r.resolution_percentage = 1920, 1080, 100
r.image_settings.file_format = "PNG"
r.filepath = "//renders/shot_####"
bpy.context.scene.frame_start, bpy.context.scene.frame_end = 1, 240
bpy.ops.render.render(animation=True)
```

## Encode the sequence afterwards

```bash
ffmpeg -framerate 24 -i renders/shot_%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p shot.mp4
```
