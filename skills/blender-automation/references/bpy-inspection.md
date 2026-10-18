# bpy inspection snippets

Run with `blender -b file.blend --python-exit-code 1 -P inspect.py -- out.json`.

## Scene and objects

```python
import bpy, json, sys
out = sys.argv[sys.argv.index("--") + 1]
scn = bpy.context.scene
report = {
    "blender": bpy.app.version_string,
    "frame_range": [scn.frame_start, scn.frame_end], "fps": scn.render.fps / scn.render.fps_base,
    "engine": scn.render.engine, "output": scn.render.filepath,
    "objects": [{
        "name": o.name, "type": o.type, "parent": o.parent.name if o.parent else None,
        "location": list(o.location), "rotation": list(o.rotation_euler), "scale": list(o.scale),
        "collections": [c.name for c in o.users_collection],
    } for o in bpy.data.objects],
}
json.dump(report, open(out, "w"), indent=2)
```

## Armature, bones and pose

```python
arm = bpy.data.objects["Armature"]
for b in arm.data.bones:            # rest data (edit-bone values, read-only here)
    print(b.name, b.parent.name if b.parent else None, tuple(b.head_local), tuple(b.tail_local),
          b.use_deform, b.use_connect, b.inherit_scale)
for pb in arm.pose.bones:           # pose data
    print(pb.name, pb.rotation_mode, [c.type for c in pb.constraints], tuple(pb.matrix_basis.to_euler()))
```

Bone roll is only exposed on edit bones: switch to Edit mode on the armature (`bpy.ops.object.mode_set(mode='EDIT')` with it active) and read `arm.data.edit_bones[name].roll`, then return to Object mode.

## Vertex groups versus deform bones

```python
mesh = bpy.data.objects["Body"]
deform = {b.name for b in arm.data.bones if b.use_deform}
groups = {g.name for g in mesh.vertex_groups}
print("groups without bone:", sorted(groups - deform))
print("deform bones without group:", sorted(deform - groups))
print("armature modifiers:", [(m.name, m.object.name if m.object else None) for m in mesh.modifiers if m.type == 'ARMATURE'])
```

## Actions and F-Curves (Blender 4.4+ layered actions)

Actions hold layers, layers hold strips, and a keyframe strip holds one channelbag per slot. `Action.fcurves` was removed in 5.0.

```python
ad = arm.animation_data
act, slot = ad.action, ad.action_slot
print(act.name if act else None, slot.identifier if slot else None, [s.identifier for s in act.slots])

from bpy_extras import anim_utils
bag = anim_utils.action_get_channelbag_for_slot(act, slot)   # None if the slot has no keys
for fc in bag.fcurves:
    keys = fc.keyframe_points
    print(fc.data_path, fc.array_index, len(keys), keys[0].co.x if keys else None, keys[-1].co.x if keys else None)
```

If `action_get_channelbag_for_slot` is missing in the installed version, walk it directly: `act.layers[0].strips[0].channelbag(slot)`.

Remap bone names in data paths (after the user confirms the mapping):

```python
mapping = {"mixamorig:LeftArm": "upper_arm.L"}
for fc in bag.fcurves:
    for src, dst in mapping.items():
        token = f'pose.bones["{src}"]'
        if fc.data_path.startswith(token):
            fc.data_path = fc.data_path.replace(token, f'pose.bones["{dst}"]', 1)
```

Assign an action and its slot:

```python
ad = arm.animation_data or arm.animation_data_create()
ad.action = act
if ad.action_slot is None and act.slots:
    ad.action_slot = act.slots[0]
```

## NLA

```python
for t in ad.nla_tracks:
    print(t.name, t.mute, [(s.name, s.action.name, s.frame_start, s.frame_end) for s in t.strips])
```
