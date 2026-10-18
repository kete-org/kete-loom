---
name: ffmpeg-media-processing
description: FFmpeg and ffprobe command lines for audio and video work - transcoding with libx264, libx265, libvpx-vp9, AAC and Opus, choosing containers, stream copy versus re-encode, frame-accurate trimming, concat demuxer joins, scale and pad filters, burned-in or soft subtitles, thumbnails and contact sheets, HLS VOD ladders, NVENC, VideoToolbox, QSV and VAAPI hardware encoding, and calling ffmpeg safely from code with argument arrays. Use when writing or debugging an ffmpeg command, converting or compressing media files, cutting or joining clips, producing HLS segments, or running ffmpeg on user uploads in a backend.
license: MIT
compatibility: Any Agent Skills host. Needs ffmpeg and ffprobe on PATH; hardware encoders need a matching GPU, driver and an ffmpeg build that includes them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "ffmpeg, ffprobe"
  kete-loom/owner: "Kete-org"
---

# FFmpeg media processing

Probe first, decide copy or re-encode, write the smallest command that does it, then probe the output. Ready-made recipes are in `references/recipes.md`.

## 0. Probe the input

```bash
ffprobe -v error -show_entries format=duration,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,pix_fmt,channels,sample_rate -of json input.mp4
```

Record: container, video codec, resolution, frame rate (variable?), pixel format (10-bit `yuv420p10le`?), audio codec and channels, subtitle streams, duration. Check `ffmpeg -hide_banner -encoders | grep -E "264|265|vp9|av1|nvenc|videotoolbox|qsv|vaapi"` to see what this build can encode.

## 1. Copy or re-encode

| Situation | Do |
|---|---|
| Only changing the container (MKV to MP4) and codecs are allowed in the target | `-c copy` (seconds, no quality loss) |
| Cutting on keyframes is fine | `-ss` before `-i` with `-c copy` |
| Cutting must be frame-accurate, scaling, filters, burning subtitles | re-encode the video; audio can often still be `-c:a copy` |
| Target must play everywhere (web, phones) | H.264 `-c:v libx264 -pix_fmt yuv420p` + AAC in MP4 with `-movflags +faststart` |
| Smaller files, modern players | H.265 (`libx265`, add `-tag:v hvc1` for Apple players), VP9/Opus in WebM, or AV1 (`libsvtav1`) |

Filters (`-vf`, `-af`, `-filter_complex`) never work with `-c copy` for that stream.

## 2. Quality settings

- x264/x265: control quality with `-crf` (x264: 18 visually near-lossless, 23 default, 28 small; x265 defaults to 28) and speed with `-preset` (`veryfast` ... `slow`). Use CRF for files, not a fixed bitrate, unless a target bitrate is required (streaming, size cap).
- For a size cap use two-pass with `-b:v` (`-pass 1 -an -f null /dev/null`, then `-pass 2`).
- VP9: `-c:v libvpx-vp9 -crf 31 -b:v 0` (the `-b:v 0` is what makes it constant quality).
- Audio: `-c:a aac -b:a 128k`, or `-c:a libopus -b:a 96k` in WebM/MKV. Normalise loudness with `-af loudnorm=I=-16:TP=-1.5:LRA=11`.
- Always `-pix_fmt yuv420p` for H.264 meant for browsers; 4:4:4 or 10-bit H.264 won't play in many of them.

## 3. Common jobs

- **Trim**: `ffmpeg -ss 00:01:00 -i in.mp4 -t 30 -c:v libx264 -crf 20 -c:a aac out.mp4`. `-ss` before `-i` seeks fast and is accurate when re-encoding; with `-c copy` the cut snaps to the previous keyframe. `-t` is a duration, `-to` an end time.
- **Concatenate** files with identical codecs and settings: concat demuxer (`-f concat -safe 0 -i list.txt -c copy`). Different codecs or sizes: the `concat` filter in `-filter_complex` and re-encode. Recipe in `references/recipes.md`.
- **Scale**: `-vf "scale=1280:-2"` (`-2` keeps aspect ratio with an even height). Fit into a box with letterboxing: `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`.
- **Frame rate**: `-vf fps=30` (or `-r 30` on output). Variable frame rate phone video: re-encode with `fps=` to stop audio drift in editors.
- **Audio only**: `-vn -c:a libmp3lame -q:a 2 out.mp3` or `-vn -c:a copy out.m4a` when the source is AAC.
- **Subtitles**: burn in with `-vf "subtitles=subs.srt"` (needs libass, re-encodes); soft subs in MP4 with `-c:s mov_text`, in MKV with `-c:s srt` or `ass`. Map streams explicitly with `-map 0:v -map 0:a -map 1:s`.
- **Thumbnail**: `ffmpeg -ss 10 -i in.mp4 -frames:v 1 -q:v 2 thumb.jpg`. One per 10 s: `-vf fps=1/10 thumb_%03d.jpg` (several frames need a numbered output pattern). Contact sheet of the first 16 samples: `-vf "fps=1/10,scale=320:-2,tile=4x4" -frames:v 1 sheet.jpg`.
- **HLS**: see `references/recipes.md` for a single rendition and a multi-bitrate ladder with `-master_pl_name` and `-var_stream_map`.

## 4. Hardware acceleration

Use it when throughput matters more than size-for-quality; hardware encoders need a higher bitrate for the same quality as x264/x265.

| Platform | Encode | Decode/filters |
|---|---|---|
| NVIDIA | `-c:v h264_nvenc` / `hevc_nvenc` with `-preset p1`..`p7` and `-cq` | `-hwaccel cuda -hwaccel_output_format cuda`, `scale_cuda` |
| macOS | `-c:v h264_videotoolbox` / `hevc_videotoolbox` with `-b:v` or `-q:v` | `-hwaccel videotoolbox` |
| Intel | `-c:v h264_qsv` / `hevc_qsv` with `-global_quality` | `-hwaccel qsv` |
| Linux VAAPI | `-vaapi_device /dev/dri/renderD128 -vf 'format=nv12,hwupload' -c:v h264_vaapi` | `-hwaccel vaapi` |

If a hardware encoder errors, check `ffmpeg -encoders` and the driver, then fall back to the software encoder rather than shipping a broken path. Mixing a hardware-decoded frame with a software filter needs `hwdownload,format=nv12`.

## 5. Running ffmpeg from code

1. **Pass an argument array, never a shell string.** `spawn('ffmpeg', ['-i', inputPath, ...])` in Node, `subprocess.run(['ffmpeg', ...], check=True)` in Python. No `shell=True`, no string interpolation of file names, titles or user text into a command line.
2. **Generate the file names yourself** (UUIDs in a temp dir) and keep user names only as metadata. A user file name starting with `-` would otherwise be read as an option.
3. **Treat uploads as hostile.** FFmpeg picks the demuxer from the file's content, not its extension, so an "mp4" upload can really be an HLS playlist or concat list that makes ffmpeg fetch URLs or read other local files. Probe with ffprobe first (in the same sandbox) and reject anything whose `format_name` isn't on your allowlist (for example `mov,mp4,m4a,3gp,3g2,mj2`, `matroska,webm`); never accept `hls`, `concat` or similar playlist formats. Then enforce limits (duration, resolution, stream count, allowed codecs). `-protocol_whitelist file` (an input option, placed before `-i`) blocks network protocols, but it still allows reading any local file, so it does not replace the format allowlist or the sandbox.
4. **Bound the run**: a wall-clock timeout, `-threads` if sharing a host, `-nostdin` so it never waits for input, `-y` or `-n` decided explicitly (overwrite or fail), and run it in a sandbox or container without network for user uploads.
5. **Check the exit code and stderr**, then ffprobe the output (duration within tolerance, expected streams). A zero exit code with a 0-second output is still a failure.
6. Report progress with `-progress pipe:1 -nostats` and parse `out_time_us=`.

## Never

- Never put `-ss` and `-c copy` together when the user needs an exact cut, without telling them it will snap to a keyframe.
- Never re-encode when `-c copy` does the job, and never stream-copy when the target needs a different codec.
- Never build ffmpeg commands by concatenating strings from user input.
- Never overwrite the source file; write to a new path and swap after verifying.

## Stop and ask the user

- Quality versus size trade-off when no target is given (CRF, resolution, bitrate cap).
- Before deleting or replacing original media files.
- When the source is DRM-protected or the user may not have rights to transcode it.

## Report back

The exact command(s), why copy or re-encode, the input and output ffprobe summary (codec, resolution, fps, duration, size), and any limit (keyframe snapping, hardware fallback) the user should know about.
