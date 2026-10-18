---
name: blender-automation
description: Scripts Blender through its bpy Python API and command line - inspecting armatures, bone hierarchies, rest and pose transforms, constraints and vertex groups, diagnosing broken rigs and retargeted animation (wrong bone roll, scale on the armature, mismatched rest poses, missing action slots), editing actions and F-Curves through layers, strips and channelbags, batch-editing objects, materials and modifiers across many .blend files, and rendering headless with blender -b. Use when a rig or imported FBX animation looks wrong in Blender, when the same change must be applied to dozens of scenes or assets, or when renders must run from a script or on a farm without the UI.
license: MIT
compatibility: Any Agent Skills host. Needs a local Blender install on PATH (examples target Blender 4.4 and later, where actions use slots; 5.0 removed Action.fcurves). GPU rendering needs a supported GPU and driver.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "blender"
  kete-loom/owner: "Kete-org"
---

# Blender automation

Drive Blender from scripts so every change is repeatable, reviewable and can run without the UI. Inspect first, change on a copy, verify by reading the data back and rendering a check frame.

## 0. Before you run anything

1. Find the Blender version: `blender --version`. The Python API changes between releases; open the API docs for that exact version (`https://docs.blender.org/api/<major.minor>/`).
2. Ask the user which `.blend` files are in scope and where outputs should go. **Work on copies**: never save over the user's originals unless they say so.
3. Run scripts headless with an exit code on failure:

   ```bash
   blender -b --factory-startup scene.blend --python-exit-code 1 -P script.py -- --out /abs/out
   ```

   Arguments run in order: load the `.blend` first, then `-o` / `-F`, then `-f` or `-a`. Everything after `--` reaches the script via `sys.argv`. `--factory-startup` skips the user's startup file and add-ons, so enable add-ons the script needs explicitly.

## 1. Inspect before changing

Dump the facts into a text or JSON report rather than guessing from screenshots. Snippets in `references/bpy-inspection.md`:

- Scene: objects, types, parents, collections, frame range, fps, render engine, output settings.
- Armature: bones with parent, head, tail, roll, `use_deform`, `use_connect`, inherit scale mode; pose bones with rotation mode and constraints.
- Mesh binding: Armature modifier target, vertex groups that have no matching deform bone, and deform bones with no vertex group.
- Animation: each object's `animation_data.action`, `action_slot`, NLA tracks, and per-bone F-Curve key counts and frame range.
- Object transforms: any non-applied scale or rotation on the armature or mesh object.

## 2. Diagnose rigs and animation

Work through `references/rig-and-retarget-checks.md`. The most common causes, in order:

1. **Object scale or rotation not applied** on the armature (typical with FBX at 0.01 scale or a 90 degree X rotation). Animation then moves in the wrong units or axis.
2. **Rest pose mismatch** between source and target (A-pose versus T-pose), so retargeted rotations are offset everywhere.
3. **Bone roll differs** between rigs, so local rotation axes do not match and limbs twist.
4. **Name mismatch**: F-Curve data paths like `pose.bones["mixamorig:LeftArm"].rotation_quaternion` do not match the target bone names, so channels silently do nothing.
5. **Rotation mode mismatch**: curves on `rotation_euler` while the bone uses quaternions, or the reverse.
6. **Action not assigned to a slot** (Blender 4.4+): the action is set but `animation_data.action_slot` is empty or targets a different ID, so nothing plays.
7. **Constraints or IK** overriding the keyed pose, or bones with `inherit_scale` causing creeping scale.

For each issue found, record: symptom, evidence (values read from the file), cause, fix. **Stop and show the user the diagnosis before changing a rig** that other files link to or that is shared by a team.

## 3. Fix

- Apply transforms with `bpy.ops.object.transform_apply` only on a copy, in Object mode with the object active and selected, and check the effect on its children and animation (applying scale to an animated armature changes what the location keys mean).
- Rename bones or remap F-Curve data paths with a mapping table the user confirms; never guess a mapping for ambiguous bones (fingers, twist bones).
- To retarget, prefer constraints (Copy Rotation in local space, or a dedicated retargeting add-on the user already uses) and bake to a new action (`bpy.ops.nla.bake` with `visual_keying=True`, `clear_constraints=True`), keeping the original action.
- Edit keys through the layered action API (`references/bpy-inspection.md`, "Actions and F-Curves"). In Blender 5.0 and later, `Action.fcurves` no longer exists.

## 4. Batch edits

Pattern in `references/batch-and-render.md`:

1. List the target files and print the plan (file, what will change) before changing anything.
2. Open each file in a fresh Blender process (one `blender -b file.blend -P edit.py` per file) so state does not leak between files.
3. Make the change through data (`bpy.data`), not operators, wherever possible; operators depend on context and selection.
4. Save to an output folder with `bpy.ops.wm.save_as_mainfile(filepath=..., copy=True)`.
5. Re-open each output and assert the change took effect; write a per-file result line (ok, skipped, failed with reason).

## 5. Headless rendering

```bash
# one frame
blender -b shot.blend -E CYCLES -o /abs/renders/shot_#### -F PNG -f 1
# a range
blender -b shot.blend -o /abs/renders/shot_#### -F OPEN_EXR -s 1 -e 240 -a
```

- `#` characters become the zero-padded frame number; `//` means relative to the `.blend`.
- Pick the device and samples in a pre-render script (Cycles GPU setup in `references/batch-and-render.md`); without it Cycles uses whatever compute device that machine's saved preferences enable, and with `--factory-startup` that is the CPU.
- List engine names with `blender -b -E help`; names differ across versions.
- Render a single check frame and show it to the user before a long range or farm job.
- Render image sequences, not a movie file, for anything long: a crash only loses one frame, and the sequence can be encoded afterwards with FFmpeg.

## Never

- Never overwrite the user's `.blend`, linked libraries or textures in place.
- Never run scripts embedded in a `.blend` from an untrusted source (auto-run scripts stay off; never pass `-y` / `--enable-autoexec` for such files; pass `-Y` / `--disable-autoexec` to be explicit).
- Never delete actions, bones or vertex groups without a backup and the user's approval.

## Report back

```
Blender <version>   Files: n processed (ok / skipped / failed)
Findings: <symptom> -> <cause> (evidence) -> <fix applied or proposed>
Changed files: <output paths>      Renders: <path pattern, frames>
Verification: values read back, check frame <path>
Needs the user: mapping decisions, art direction, ...
```
