---
name: ai-media-generation
description: Product features built on hosted generative image, video, speech and music models, including prompt templates with fixed parameters and seeds, long-running jobs submitted then polled or confirmed by signed webhooks, per-user quotas and cost estimates before submission, input and output moderation, C2PA content credentials and AI-generated labels, and copying results to your own storage before provider URLs expire. Use when adding text-to-image, image editing, text-to-video or text-to-speech generation to an app, wiring up a generation provider's async job API, or controlling the cost, safety and storage of generated media.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access and an API key for the chosen provider. Examples are provider-neutral; check the provider's current API reference for model names and parameters.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# AI media generation

Generation APIs are slow, priced per output, change model names often, and can produce content you are responsible for. Build the feature as a job pipeline with limits, moderation and your own storage, not as a single request in a page handler.

## 0. Before you start

1. Ask the user, or find in the repo: which provider and model, which media (image, edit, video, speech, music), expected volume, and who the end users are (internal staff, logged-in customers, anonymous public).
2. Read the provider's current API reference and pricing page for that model. Model IDs, sizes, durations and prices change; never copy them from memory or old code. Note: max resolution/duration, whether the call is synchronous or a job, output format (base64 in the response vs a URL), how long output URLs live, rate limits, and whether the provider adds C2PA or a watermark.
3. **Stop and ask** before building a public, anonymous generation endpoint, any feature that edits images of real people, voice cloning, or anything aimed at children. These need explicit policy decisions.

## 1. Prompt and parameter design

- Keep a server-side **prompt template** per feature: fixed style instructions plus the user's text in a clearly delimited slot. Users choose from options (style, aspect ratio, length) that map to allowed parameter values; never pass raw user JSON as provider parameters.
- Pin the **model ID and version** in config, not scattered in code, so an upgrade is a reviewed change. Record it with every output.
- Store the **full request** (template version, final prompt, parameters, seed if supported) with each job, so results can be reproduced and audited.
- Validate inputs at the boundary: prompt length, uploaded image type/size/dimensions, audio length. Strip metadata (EXIF GPS) from user uploads before sending them.
- For edits with masks or reference images, check the provider's format rules (same size, alpha channel, size limit) before submitting, not after a failed job.

## 2. Job flow

Treat every generation as a job, even if the provider responds synchronously today.

1. `POST /generations` in your API: authenticate, check quota (section 3), moderate the input (section 4), insert a `generation_jobs` row (`id`, `user_id`, `status=queued`, `provider`, `model`, `request`, `estimated_cost`), and return `202` with the job ID.
2. A worker submits to the provider with an idempotency key if the API supports one (otherwise store the provider job ID immediately so a retry doesn't submit twice). Save `provider_job_id`, set `status=running`.
3. Learn the result by **webhook** when offered: verify the signature on the raw body with the provider's secret and timestamp tolerance, look up the job by provider ID, and treat duplicate or out-of-order deliveries as normal. Back it with a **poll** fallback: exponential backoff (for example 2 s doubling to 30 s), a hard deadline per media type, then mark `timed_out` and cancel at the provider if it supports cancel.
4. On success: download the output, check type and size, run output moderation, add provenance (section 5), store it (section 6), set `status=succeeded`, record actual cost.
5. On failure: map provider errors to `failed_safety` (prompt or output refused), `failed_invalid` (bad parameters), `failed_provider` (5xx, timeouts). Retry only `failed_provider`, a bounded number of times. Never retry a safety refusal by rewording the prompt automatically.
6. The client polls `GET /generations/:id` or subscribes to updates; it never talks to the provider or sees the provider key.

See `references/job-pipeline.md` for a table schema, a poll loop and a webhook handler outline.

## 3. Cost and latency

- Estimate cost **before** submitting (resolution x count, seconds of video, characters of speech, using the provider's price table) and check it against a per-user and a global daily budget. Reject or queue when over.
- Cap `n` (outputs per request), resolution and duration server-side. Default to the cheapest setting that meets the feature's need; offer "high quality" as an explicit, metered choice.
- Rate-limit per user and per IP; generation endpoints attract abuse.
- Cache identical requests (same template, prompt, parameters and seed) when outputs are deterministic enough for the feature.
- Show realistic progress: images take seconds, video can take minutes. Never hold an HTTP request open for a video job.
- Log latency and cost per job and alert on spend spikes.

## 4. Content safety

- Moderate the **input** (prompt text, uploaded images) before paying for a generation, and the **output** before showing it, with the provider's moderation API or your own classifier. Provider-side filters are a floor, not your whole policy.
- Write down the policy with the user: disallowed content, real-person likeness, logos and trademarks, minors. Block and log; let users report outputs.
- Keep a reviewable record (prompt, output reference, moderation result, user) for abuse investigations, with a retention period the user agrees to.
- Don't present generated people, voices or events as real. For voice, require consent records for any cloned voice.

## 5. Provenance and labelling

- Keep any **C2PA content credentials** or watermark the provider embeds; re-encoding, resizing or stripping metadata can remove the C2PA manifest. If you transform outputs, re-sign with your own C2PA manifest (for example with the open-source `c2patool` or a C2PA SDK) or keep the original alongside.
- Label generated media as AI-generated in the UI and in alt text or metadata where the media is published.
- Transparency rules such as Article 50 of the EU AI Act, and platform rules, can require machine-readable marking and visible disclosure. **Ask the user's legal or compliance owner** which apply; this skill does not give legal advice.

## 6. Storing outputs

- Provider output URLs are often temporary (some expire within an hour). Copy every output to your own object storage as soon as the job succeeds; never store the provider URL as the permanent link.
- Write with a generated key (`generations/<job_id>/<n>.<ext>`), the right `Content-Type`, private by default, served through signed URLs or a CDN with access checks.
- Keep metadata in your database: job ID, user, model and version, prompt, parameters, seed, cost, moderation result, checksum, dimensions/duration.
- Set lifecycle rules for drafts and failed jobs, and delete outputs when the user deletes their account.
- Post-process with the right tool: resize/convert images with the project's image library; trim, transcode or package video and audio with the ffmpeg-media-processing skill.

## Never

- Never call a generation API from the browser or mobile app with your provider key.
- Never submit without a quota and cost check, or let a client choose unbounded `n`, resolution or duration.
- Never show an output that skipped output moderation, or auto-retry a safety refusal.
- Never rely on provider URLs for storage.

## Stop and ask the user

- Provider and model choice when not given, and the monthly budget.
- Content policy, likeness and voice-cloning rules, and labelling obligations.
- Data handling: whether prompts and uploads may be used by the provider for training (check the provider's data terms), and retention periods.

## Report back

Provider and pinned model, the job states and where each transition happens, cost limits set, moderation points, provenance handling, storage location and retention, and anything taken from docs you could not confirm.
