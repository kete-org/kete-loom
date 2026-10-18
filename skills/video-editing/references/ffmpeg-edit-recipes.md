# FFmpeg recipes for editing

Pass arguments as arrays from code, never via shell strings built from user input.

## Proxies and intermediates

Constant frame rate, all-intra, easy to cut:

```bash
ffmpeg -i in.mp4 -vf "fps=25,scale=-2:1080" -c:v prores_ks -profile:v 1 -c:a pcm_s16le -ar 48000 inter.mov
# smaller review proxy
ffmpeg -i in.mp4 -vf "fps=25,scale=-2:540" -c:v libx264 -g 1 -crf 23 -c:a aac proxy.mp4
```

## Trim one event frame-accurately

Re-encode when cutting long-GOP sources; `-c copy` cuts on keyframes only.

```bash
ffmpeg -ss 75.20 -i source/A001_C003.mov -t 6.84 -c:v libx264 -crf 16 -preset slow -c:a pcm_s16le -ar 48000 seg001.mov
```

## Join events

After all segments share codec, resolution, frame rate and audio layout:

```bash
printf "file '%s'\n" seg001.mov seg002.mov > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy assembled.mov
```

For short cross-dissolves, use `xfade` (video) and `acrossfade` (audio) in a filter graph instead of the concat demuxer.

## Burned-in timecode for review copies

```bash
ffmpeg -i assembled.mov -vf "drawtext=timecode='00\:00\:00\:00':rate=25:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.5:x=20:y=h-th-20" -c:v libx264 -crf 26 -c:a aac review.mp4
```

Some builds need `fontfile=/path/to/font.ttf` in `drawtext`.

## Measure a reference

Shot boundaries (scene score above 0.3 is a common starting threshold; tune per footage):

```bash
ffmpeg -i reference.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -o "pts_time:[0-9.]*"
```

Cuts per minute = number of boundaries / duration in minutes. Average shot length = duration / (boundaries + 1). Measure loudness of the reference the same way as your mix (below).

## Loudness (two-pass loudnorm)

```bash
# pass 1: measure
ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null -
# pass 2: apply with the measured values
ffmpeg -i mix.wav -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=<i>:measured_TP=<tp>:measured_LRA=<lra>:measured_thresh=<thr>:offset=<off>:linear=true" -ar 48000 mix_norm.wav
# verify on the final file
ffmpeg -i final.mp4 -af ebur128=peak=true -f null -
```

Change `I` to the delivery target (for example -23 for EBU R128).

## Ducking music under dialogue

```bash
ffmpeg -i dialogue.wav -i music.wav -filter_complex "[1:a][0:a]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[duck];[0:a][duck]amix=inputs=2:duration=first:normalize=0[out]" -map "[out]" mix.wav
```

## Subtitles

```bash
# soft subtitles in MP4 (mov_text) or MKV (srt)
ffmpeg -i final.mp4 -i captions.srt -map 0 -map 1 -c copy -c:s mov_text -metadata:s:s:0 language=eng final_subs.mp4
# burn in
ffmpeg -i final.mp4 -vf "subtitles=captions.srt:force_style='FontSize=24,Outline=2'" -c:a copy final_burned.mp4
```

## QC detectors

```bash
ffmpeg -i final.mp4 -vf "blackdetect=d=0.1:pix_th=0.10" -an -f null - 2>&1 | grep blackdetect
ffmpeg -i final.mp4 -vf "freezedetect=n=0.003:d=0.5" -an -f null - 2>&1 | grep freeze
```

## Basic colour correction

```bash
ffmpeg -i in.mov -vf "eq=contrast=1.05:brightness=0.02:saturation=1.1,colortemperature=temperature=5600" out.mov
ffmpeg -i log.mov -vf "lut3d=camera_log_to_rec709.cube" graded.mov
```
