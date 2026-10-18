# Rig and retarget checks

Work top to bottom. For each, read the values with the inspection snippets; do not judge from a viewport screenshot alone.

| # | Symptom | Check | Typical fix |
|---|---|---|---|
| 1 | Character tiny, huge, lying down, or root motion in wrong units | Armature and mesh object `scale` not 1, or `rotation_euler.x` near 1.5708 (FBX import) | On a copy, apply rotation and scale (`transform_apply(location=False, rotation=True, scale=True)`), or re-import FBX with Apply Transform or a unit scale the user confirms; re-check location keys after |
| 2 | Every limb offset by the same amount after retarget | Rest poses differ (A-pose vs T-pose): compare `bone.matrix_local` of matching bones | Retarget with constraints in local or pose space and bake, or adjust the source rest pose to match before baking |
| 3 | Limbs twist or rotate around the wrong axis | Edit-bone `roll` differs for matching bones | Match roll on the target only if it is not yet skinned or the user accepts re-weighting; otherwise retarget in world or pose space |
| 4 | Some bones do not move | F-Curve data paths name bones that are not in the target | Rename bones or remap data paths with a confirmed mapping |
| 5 | Bones move but rotate wrongly or jitter | Curves on `rotation_euler` but `rotation_mode` is `QUATERNION`, or the reverse; quaternion sign flips between keys | Set `rotation_mode` to match the curves, or convert and bake; fix sign flips by negating the quaternion on flipped keys |
| 6 | Action assigned but nothing plays (4.4+) | `animation_data.action_slot` is None or its `target_id_type` does not match | Assign the right slot |
| 7 | NLA or another action overrides the keys | NLA tracks not muted, action influence, or tweak mode | Mute or remove tracks on a copy; push the action to an NLA strip deliberately |
| 8 | Pose ignores keys | Constraints (IK, Child Of, Copy Transforms) with influence 1 | Check each constraint's influence and target; bake visual transforms if the constraints are only for retargeting |
| 9 | Mesh tears or parts stay behind | Vertex groups with no matching deform bone, `use_deform` off, Armature modifier missing or on the wrong object, or modifier order (Armature after a Subdivision) | Fix names and flags; move the Armature modifier to the top of the stack |
| 10 | Creeping scale down a chain | `inherit_scale` and scale keys on parent bones | Remove scale keys that should not exist; set inherit scale as the rig design requires |
| 11 | Foot sliding after retarget | Different leg lengths between rigs | Scale root motion by the leg-length ratio, or use IK for feet and bake |

Verification after any fix:

1. Read the changed values back from the saved copy.
2. Render or capture three frames (first, middle, last of the action) from a fixed camera and compare with the source.
3. Report key counts per bone before and after a bake; a bake should not drop channels unexpectedly.
