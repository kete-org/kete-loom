# Video prompt templates

Read this when writing the server-side prompt template for a text-to-video or image-to-video feature. Parameter names differ by provider (duration may be `seconds`, `duration` or `durationSeconds`; aspect ratio may be a ratio or a `size` like `1280x720`), so map the fields below to the current API reference for your model.

## Split prompt from parameters

```json
{
  "model": "<pinned model id from config>",
  "duration": 8,
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "seed": 1234,
  "prompt": "A ceramicist's hands shape a bowl on a spinning wheel. Slow push-in from medium shot to close-up. Warm window light from the left, dust visible in the beam."
}
```

The prompt says nothing about length, frame or quality settings. Those are in parameters, validated against the model's allowed values and recorded with the job.

## Beats per clip

| Clip length | Beats | Example |
|---|---|---|
| Up to ~5 s | 1 action, at most 1 camera move | "She looks up from the book; camera holds." |
| ~5 to 10 s | 2 to 3 beats in order | "He sets the cup down, turns to the window, smiles. Slow dolly left." |
| Longer | 3 to 5 beats, or split into shots | Generate shots separately and edit them together |

Write beats in time order with plain connectors ("then", "as"). Name one camera move per beat at most (static, pan, tilt, dolly, push-in, orbit, handheld).

## Image-to-video

Describe the change, not the picture:

- Weak: "A red bicycle leaning on a blue door in a sunny street, photorealistic."
- Better: "The front wheel turns slightly as a breeze moves the door's curtain; camera slowly pulls back to reveal the street."

Keep style words out unless you want the model to restyle the image.

## Character consistency

1. Generate a reference sheet: the character on a plain background, front and three-quarter views, neutral and one key expression, full outfit visible.
2. Have the user approve it; store it with the job records like any output.
3. For each clip, pass the sheet (or an approved frame) as the reference image and reuse one fixed character description, word for word, in every prompt.
4. Change one thing per regeneration (action or camera), so drift is easy to spot.

## Template shape

```
<subject and setting, one sentence; omit for image-to-video>
<beat 1>. <beat 2>. <beat 3, if the clip is long enough>
<camera: one move per beat>
<lighting and mood, one short phrase>
<user text slot, delimited and length-limited>
```
