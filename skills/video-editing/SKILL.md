---
name: video-editing
description: Editorial workflow for turning raw footage into a finished cut - logging clips and pulling selects, building a paper edit, rough cut then fine cut, pacing and J/L cuts, matching the rhythm of a reference edit, subtitles and captions in SRT or WebVTT, loudness to a delivery target, basic colour correction, and conforming from an edit decision list with FFmpeg or DaVinci Resolve's Python scripting API. Use when someone hands you interviews, B-roll or screen footage and wants a finished video, asks to tighten a rough cut, wants subtitles and levels fixed before delivery, or needs a timeline assembled or rendered from a script.
license: MIT
compatibility: Any Agent Skills host. Needs ffmpeg and ffprobe; Resolve scripting needs DaVinci Resolve running with scripting enabled and its API on PYTHONPATH. Transcription needs a speech-to-text tool the user approves.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "ffmpeg, ffprobe"
  kete-loom/owner: "Kete-org"
---

# Video editing

Edit like an editor, not like a transcoder: decide what the piece says, choose the moments that say it, then make the cuts invisible. Keep every decision in an edit decision list (EDL) so the cut can be re-rendered, reviewed and changed. Single FFmpeg command recipes live in the `ffmpeg-media-processing` skill; this skill is about the edit.

## 0. Brief first

Before touching footage, get answers (ask the user for any that are missing):

1. **Purpose and audience**: what should a viewer know or feel at the end?
2. **Target length** and **delivery**: platform, aspect ratio (16:9, 9:16, 1:1), resolution, frame rate, captions burned in or as a sidecar file.
3. **Reference**: a link or file whose pacing or look the user wants matched.
4. **Must-haves and no-gos**: quotes that must stay, people or logos that must not appear, music licence.

Never use music, footage or fonts the user has not confirmed they have rights to.

## 1. Ingest and log

1. Copy the camera originals to a read-only `source/` folder. Never edit or re-encode originals in place.
2. Probe every clip: `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate,channels -show_entries format=duration -of json <clip>`. Flag mixed frame rates (for example 23.976 and 29.97) and variable frame rate phone footage now; they cause drift later.
3. For VFR or long-GOP clips that will be cut a lot, make constant-frame-rate intermediates (`references/ffmpeg-edit-recipes.md`, "Proxies and intermediates").
4. Transcribe speech (with the user's approval of the tool) to timestamped text. Spoken footage is edited from the transcript.
5. Write a log, one row per clip: file, duration, content, usable ranges, quality notes (focus, noise, wind), best moments. Format in `references/edl-and-logging.md`.

## 2. Selects and paper edit

1. Mark selects: in and out timecodes of every moment worth keeping, with a one-line reason.
2. Build a **paper edit**: the story order as a list of selects, before any rendering. Structure: hook (first 3 to 5 seconds), context, body in clear beats, payoff, call to action if any.
3. Estimate running time from the list. If it is more than about 20% over target, cut whole beats now rather than trimming everything.
4. **Stop and show the user the paper edit** for anything longer than a minute or with interview content. Changing a list is cheap; re-cutting is not.

## 3. Rough cut

Assemble the selects in order from the EDL with straight cuts and no polish. Render a low-resolution review copy with burned-in timecode (recipe in `references/ffmpeg-edit-recipes.md`) so feedback can cite exact times.

Check: does it make sense with no music, titles or effects? If not, fix structure before moving on.

## 4. Fine cut

Work through these in order:

1. **Trim**: remove ums, false starts, repeated points and dead air at clip heads and tails. Cut on the breath, not mid-word; leave 2 to 6 frames of room after the last syllable.
2. **Pacing**: vary shot length; hold on what matters, move fast through what does not. Cut on action or a look; avoid jump cuts in an interview unless the style calls for them, otherwise cover them with B-roll.
3. **J and L cuts**: let audio lead (J) or trail (L) the picture across a cut so speech flows.
4. **B-roll**: cover edits and illustrate what is being said; never let B-roll contradict the words.
5. **Match a reference**: measure the reference before imitating it (`references/ffmpeg-edit-recipes.md`, "Measure a reference"): average shot length, cuts per minute, text style, music level. Report the numbers next to yours.

## 5. Sound

1. Dialogue is king. Clean it first (noise reduction, high-pass around 80 Hz for voice), then set music under it.
2. Duck music under speech by roughly 10 to 20 dB.
3. Normalise the final mix to the delivery spec with a two-pass loudness measurement (`references/ffmpeg-edit-recipes.md`, "Loudness"). Common targets: EBU R128 broadcast -23 LUFS integrated; many streaming and social platforms normalise near -14 LUFS; keep true peak at or below -1 dBTP. Confirm the user's platform spec rather than assuming.
4. Listen to every cut for pops; add short audio crossfades (a few frames) at each edit.

## 6. Colour

1. Correct before you grade: white balance, exposure, contrast, so shots of the same scene match.
2. Then apply one look consistently. A LUT designed for a camera log profile goes on log footage only.
3. Check skin tones and that nothing is clipped. Do not grade on an uncalibrated laptop screen and call it final; tell the user.

## 7. Captions and subtitles

1. Start from the transcript, corrected by hand against the final cut, not the raw footage.
2. Write SRT or WebVTT timed to the final timeline. Rules of thumb (check the platform's style guide): at most 2 lines, about 42 characters per line, reading speed around 17 to 20 characters per second, minimum about 1 second on screen, break lines at phrase boundaries.
3. Sidecar files keep captions accessible and editable; burn in only when the platform needs it (many social feeds autoplay muted). See `references/ffmpeg-edit-recipes.md`, "Subtitles".
4. Re-time captions after every picture change.

## 8. Conform and render

- **FFmpeg path**: generate the render from the EDL (trim and concat, then the audio chain, then subtitles). Recipes in `references/ffmpeg-edit-recipes.md`.
- **DaVinci Resolve path**: build the timeline, import an EDL, FCPXML or AAF, set render settings and queue the job from Python. API calls in `references/resolve-scripting.md`.
- Render a master (high bitrate or mezzanine codec) and derive delivery files from it; never re-encode a delivery file to make another.

## 9. QC before delivery

Watch the whole render once, start to finish, then check:

- [ ] Duration, resolution, frame rate and aspect ratio match the brief (probe the file).
- [ ] No black frames, flash frames or frozen frames at cut points (`blackdetect`, `freezedetect` in the recipes).
- [ ] Audio in sync at the start, middle and end; loudness measured on the final file.
- [ ] Captions match the words and timing; names spelled correctly.
- [ ] Nothing from the no-go list appears.

## Never

- Never alter source files or delete footage the user has not approved deleting.
- Never invent quotes or re-order an interviewee's words so the meaning changes. Flag any edit that compresses what someone said.
- Never deliver without watching the final render.

## Report back

```
Cut: <title> v<n>   Length: mm:ss (target mm:ss)   Format: WxH @ fps, codec
EDL: <path>   Master: <path>   Deliverables: <paths>
Structure: hook / beats / payoff (one line each)
Audio: integrated LUFS, true peak     Captions: <file or burned in>
Changes since last version: ...
Open questions / needs a human: grading on a calibrated display, legal clearance, ...
```
