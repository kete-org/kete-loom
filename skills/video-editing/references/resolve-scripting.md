# DaVinci Resolve scripting (Python)

The authoritative reference is the README shipped with Resolve (Help > Documentation > Developer, `Scripting/README.txt`). Method names and supported export formats change between versions; check that file for the installed version before relying on a call below.

## Setup

- Resolve must be running. Scripting access (local or network) is set in Preferences > System > General > External scripting using.
- External scripts need the environment the README describes, typically `RESOLVE_SCRIPT_API`, `RESOLVE_SCRIPT_LIB` and `PYTHONPATH` pointing at the bundled `Modules` folder.
- Which features need the paid Studio edition varies by version; check the README and tell the user if a call fails for that reason.

## Common calls

```python
import time
import DaVinciResolveScript as dvr

resolve = dvr.scriptapp("Resolve")
pm = resolve.GetProjectManager()
project = pm.GetCurrentProject() or pm.CreateProject("my_cut")
media_pool = project.GetMediaPool()

clips = media_pool.ImportMedia(["/abs/source/A001_C003.mov", "/abs/source/B012.mov"])
timeline = media_pool.CreateEmptyTimeline("my_cut_v1")
project.SetCurrentTimeline(timeline)

# Append sub-clips by source frame range
media_pool.AppendToTimeline([
    {"mediaPoolItem": clips[0], "startFrame": 1880, "endFrame": 2051},
    {"mediaPoolItem": clips[1], "startFrame": 75, "endFrame": 162},
])

# Or import a whole timeline from an EDL / FCPXML / AAF
media_pool.ImportTimelineFromFile("/abs/edl/my_cut_v3.fcpxml")

# Export the timeline for review or hand-off
timeline.Export("/abs/out/my_cut_v3.edl", resolve.EXPORT_EDL, resolve.EXPORT_NONE)

# Render
resolve.OpenPage("deliver")
project.LoadRenderPreset("H.264 Master")  # a preset that exists on this machine
project.SetRenderSettings({"TargetDir": "/abs/out", "CustomName": "my_cut_v3"})
job_id = project.AddRenderJob()
project.StartRendering(job_id)
while project.IsRenderingInProgress():
    time.sleep(2)
```

## Rules

- Check every return value: most calls return `None` or `False` on failure without raising.
- Use absolute paths.
- Never delete media pool items, timelines or projects the script did not create.
- Save the project (`pm.SaveProject()`) before and after a scripted change.
