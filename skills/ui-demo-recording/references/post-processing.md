# Post-processing a Playwright take

Playwright writes VP8 WebM. Probe it first: `ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of json take.webm`.

## Trim and convert to web MP4

```bash
ffmpeg -ss 0.6 -i take.webm -t 40.4 -vf "fps=30,format=yuv420p" -c:v libx264 -crf 18 -preset slow -movflags +faststart -an demo.mp4
```

`-ss` before `-i` with re-encode is frame-accurate; give the output length with `-t` (seconds kept after the start point), since `-to` combined with input seeking is easy to misread. Drop `-an` if you add audio below.

## Find dead frames to trim

```bash
ffmpeg -i take.webm -vf "freezedetect=n=0.001:d=2" -an -f null - 2>&1 | grep freeze_
```

## Speed up a dull stretch (10 s to 18 s at 2x)

```bash
ffmpeg -i demo.mp4 -filter_complex "[0:v]trim=start=0:end=10,setpts=PTS-STARTPTS[a];[0:v]trim=start=10:end=18,setpts=(PTS-STARTPTS)/2[b];[0:v]trim=start=18,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0[v]" -map "[v]" -c:v libx264 -crf 18 -pix_fmt yuv420p demo_fast.mp4
```

## Fade in and out

```bash
ffmpeg -i demo.mp4 -vf "fade=t=in:st=0:d=0.4,fade=t=out:st=40.4:d=0.6" -c:v libx264 -crf 18 -pix_fmt yuv420p demo_fade.mp4
```

## Captions

```bash
# soft captions (keeps them accessible and editable)
ffmpeg -i demo.mp4 -i demo.srt -map 0 -map 1 -c copy -c:s mov_text -metadata:s:s:0 language=eng demo_cc.mp4
# burned in
ffmpeg -i demo.mp4 -vf "subtitles=demo.srt:force_style='FontSize=22,Outline=1'" -c:v libx264 -crf 18 demo_burned.mp4
```

## Music bed (licensed track supplied by the user)

```bash
ffmpeg -i demo.mp4 -i bed.mp3 -filter_complex "[1:a]volume=0.25,afade=t=out:st=38:d=3[m]" -map 0:v -map "[m]" -shortest -c:v copy -c:a aac -b:a 160k demo_music.mp4
```

## GIF (two-pass palette)

```bash
ffmpeg -i demo.mp4 -vf "fps=12,scale=800:-1:flags=lanczos,palettegen=stats_mode=diff" palette.png
ffmpeg -i demo.mp4 -i palette.png -lavfi "fps=12,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" demo.gif
```

## Final check

```bash
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,pix_fmt -of compact demo.mp4
```
