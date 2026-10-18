# FFmpeg recipes

Each recipe assumes the input was probed first. Adjust CRF, bitrates and sizes to the user's target. Check flags against `ffmpeg -h full` or ffmpeg.org/ffmpeg-all.html for the installed version.

## Web-ready MP4 (H.264 + AAC)

```bash
ffmpeg -nostdin -i in.mov -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart out.mp4
```

`+faststart` moves the index to the front so playback starts before the whole file downloads.

## WebM (VP9 + Opus)

```bash
ffmpeg -nostdin -i in.mp4 -c:v libvpx-vp9 -crf 31 -b:v 0 -row-mt 1 -c:a libopus -b:a 96k out.webm
```

## Concatenate identical files (no re-encode)

`list.txt` (paths relative to the list file, single-quoted):

```text
file 'part1.mp4'
file 'part2.mp4'
```

```bash
ffmpeg -nostdin -f concat -safe 0 -i list.txt -c copy joined.mp4
```

Only write `list.txt` from paths your code generated. `-safe 0` allows any path, so never use it with a list built from user input.

## Concatenate different files (re-encode)

```bash
ffmpeg -nostdin -i a.mp4 -i b.mp4 -filter_complex \
 "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v0]; \
  [1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v1]; \
  [v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac out.mp4
```

Every input needs an audio stream for `a=1`; for a clip that has none, add a silent input of the same length, `-f lavfi -t <clip-seconds> -i anullsrc=r=48000:cl=stereo`, and use that input's audio in its place. The `-t` matters: `anullsrc` never ends on its own, and `-shortest` does not stop it inside `concat`.

## Burn in subtitles with styling

```bash
ffmpeg -nostdin -i in.mp4 -vf "subtitles=subs.srt:force_style='FontName=Inter,FontSize=24,Outline=2'" \
  -c:v libx264 -crf 20 -c:a copy out.mp4
```

Filter paths with `:` or `'` need escaping; copy the subtitle file to a simple generated name instead.

## Add a soft subtitle track to MP4

```bash
ffmpeg -nostdin -i in.mp4 -i subs.srt -map 0 -map 1 -c copy -c:s mov_text -metadata:s:s:0 language=eng out.mp4
```

## Watermark / overlay

```bash
ffmpeg -nostdin -i in.mp4 -i logo.png -filter_complex "overlay=W-w-24:H-h-24" -c:v libx264 -crf 20 -c:a copy out.mp4
```

## GIF with a good palette

```bash
ffmpeg -nostdin -i in.mp4 -vf "fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" out.gif
```

## HLS, single rendition (VOD)

```bash
ffmpeg -nostdin -i in.mp4 -c:v libx264 -crf 21 -g 48 -keyint_min 48 -sc_threshold 0 -c:a aac -b:a 128k \
  -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename "out/seg_%03d.ts" out/index.m3u8
```

A fixed GOP (`-g` = fps x 2 here for 24 fps and 2 s keyframes, `-sc_threshold 0`) keeps segment boundaries even. Use `-hls_segment_type fmp4` for fMP4 segments (needed for HEVC in HLS).

## HLS ladder (three renditions, master playlist)

```bash
ffmpeg -nostdin -i in.mp4 -filter_complex \
 "[0:v]split=3[v1][v2][v3];[v1]scale=w=1920:h=-2[v1o];[v2]scale=w=1280:h=-2[v2o];[v3]scale=w=854:h=-2[v3o]" \
 -map "[v1o]" -c:v:0 libx264 -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k \
 -map "[v2o]" -c:v:1 libx264 -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k \
 -map "[v3o]" -c:v:2 libx264 -b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k \
 -map 0:a:0 -map 0:a:0 -map 0:a:0 -c:a aac -b:a 128k -ac 2 \
 -g 48 -keyint_min 48 -sc_threshold 0 -pix_fmt yuv420p \
 -f hls -hls_time 6 -hls_playlist_type vod \
 -hls_segment_filename "out/v%v/seg_%03d.ts" -master_pl_name master.m3u8 \
 -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" out/v%v/index.m3u8
```

`-map` always needs the input index (`0:a:0`, not `a:0`). `-g 48` assumes 24 fps (2 s GOP); set it to fps x 2 from the probe. The scale filters upscale small sources, so drop renditions taller than the input.

Serve `.m3u8` as `application/vnd.apple.mpegurl` and `.ts` as `video/mp2t`, with CORS if the player is on another origin.

## Extract audio and normalise loudness

```bash
ffmpeg -nostdin -i in.mp4 -vn -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 160k voice.m4a
```

For best results run `loudnorm` twice: first with `print_format=json` to measure, then pass the measured values back.

## Progress from code

Add `-progress pipe:1 -nostats` and parse lines such as `out_time_us=12345678` and `progress=end` from stdout; divide by the probed duration for a percentage.
