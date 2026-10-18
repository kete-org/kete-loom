# Logs, selects and EDLs

## Clip log (CSV)

```
file,duration,content,usable_in,usable_out,quality,best_moment,notes
A001_C003.mov,00:04:12,Interview Ana wide,00:00:08,00:04:02,good,"00:01:15 'we almost quit'",slight wind at 3:40
```

## Working EDL (JSON, the source of truth for the FFmpeg path)

Keep times as seconds with three decimals, or as frames at the project rate. One entry per event, in timeline order.

```json
{
  "fps": 25,
  "width": 1920, "height": 1080,
  "events": [
    { "id": 1, "src": "source/A001_C003.mov", "in": 75.20, "out": 82.04, "track": "V1+A1", "note": "hook quote" },
    { "id": 2, "src": "source/B012.mov", "in": 3.00, "out": 6.50, "track": "V1", "audio_from": 1, "note": "B-roll over quote" }
  ],
  "music": [{ "src": "music/bed.wav", "start": 0.0, "gain_db": -18 }],
  "captions": "captions/final.srt"
}
```

Rules:
- `in`/`out` refer to the source clip; the timeline position is the running sum of durations.
- Snap cut points to frame boundaries at the project frame rate (`round(t * fps) / fps`).
- Bump a version number on every change and keep old EDLs.

## CMX 3600 EDL (for handing to an NLE)

```
TITLE: MY_CUT_V3
FCM: NON-DROP FRAME

001  A001C003 V     C        00:01:15:05 00:01:22:01 01:00:00:00 01:00:06:21
002  A001C003 A     C        00:01:15:05 00:01:22:01 01:00:00:00 01:00:06:21
```

Fields: event number, reel name (max 8 characters in strict CMX 3600), track (V, A, A2, B for both), transition (C = cut, D = dissolve with duration), source in, source out, record in, record out. CMX 3600 carries one video track; use FCPXML or AAF for multitrack timelines, titles and effects.

Timecode: `HH:MM:SS:FF`. Use drop-frame (`;` before frames, `FCM: DROP FRAME`) only for 29.97 or 59.94 material that is delivered drop-frame.
