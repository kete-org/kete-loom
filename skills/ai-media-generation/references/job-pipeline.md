# Generation job pipeline

Provider-neutral shapes. Map field names to your provider's API reference.

## Table

```sql
CREATE TABLE generation_jobs (
  id               uuid PRIMARY KEY,
  user_id          uuid NOT NULL,
  status           text NOT NULL CHECK (status IN
                     ('queued','running','succeeded','failed_safety','failed_invalid','failed_provider','timed_out','canceled')),
  provider         text NOT NULL,
  model            text NOT NULL,          -- pinned model ID and version
  template_version text NOT NULL,
  request          jsonb NOT NULL,         -- final prompt, parameters, seed
  provider_job_id  text UNIQUE,
  estimated_cost   numeric(12,6) NOT NULL,
  actual_cost      numeric(12,6),
  attempts         int NOT NULL DEFAULT 0,
  error            text,
  outputs          jsonb,                  -- [{ key, content_type, bytes, sha256, width, height, duration_s }]
  moderation       jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  deadline_at      timestamptz NOT NULL,
  finished_at      timestamptz
);
```

Guard state changes so a webhook and a poller can't both finish a job:

```sql
UPDATE generation_jobs SET status = 'succeeded', finished_at = now()
WHERE id = $1 AND status = 'running';   -- 0 rows updated means someone else finished it
```

## Poll loop (worker)

```ts
async function pollUntilDone(job: Job) {
  let delay = 2_000;
  while (Date.now() < job.deadlineAt.getTime()) {
    const p = await provider.getJob(job.providerJobId);           // GET the provider's job/prediction
    if (p.status === 'succeeded') return finish(job, p.output);
    if (['failed', 'canceled', 'aborted'].includes(p.status)) return fail(job, classify(p.error));
    await sleep(delay + Math.random() * 500);                     // jitter
    delay = Math.min(delay * 2, 30_000);
  }
  await provider.cancel?.(job.providerJobId);
  return markTimedOut(job);
}
```

Run polling in a queue worker, not in the request handler. On worker restart, resume every job in `running` from its `provider_job_id`.

## Webhook handler

1. Read the raw body (before any JSON parser).
2. Verify the provider's signature headers with its signing secret using a constant-time compare, and reject timestamps outside a few minutes.
3. Parse, find the job by `provider_job_id`; unknown ID -> `200` and log (don't make the provider retry forever).
4. Enqueue `finish` / `fail` and return `2xx` quickly; downloading and moderation happen in the worker.

Example of one provider's scheme (Replicate, checked against its docs): headers `webhook-id`, `webhook-timestamp`, `webhook-signature`; signed content `${id}.${timestamp}.${rawBody}`; HMAC-SHA256 keyed with the base64-decoded bytes of the part after the `whsec_` prefix (the official JS client's `validateWebhook` helper does this), signature compared as base64, secret fetched from `GET /v1/webhooks/default/secret`; the header can carry several space-separated `v1,<sig>` values. Its prediction statuses are `starting`, `processing`, `succeeded`, `failed`, `canceled` and `aborted`, and API prediction outputs are deleted after one hour by default, so copy them at once.

## finish(job, output)

1. Download each output with a size limit and timeout; check the content type by magic bytes, not the extension.
2. Output moderation; on block set `failed_safety`, keep the evidence privately, don't show it.
3. Keep or add provenance (C2PA manifest, label metadata).
4. Upload to `generations/<job_id>/<n>.<ext>`, private, with `Content-Type` and checksum.
5. Guarded `UPDATE` to `succeeded`, record `actual_cost`, notify the client.

## Testing

- Stub the provider client with recorded responses for success, safety refusal, invalid parameters, 5xx and a job that never finishes.
- Test duplicate webhooks, a webhook arriving before the submit call returns, a bad signature (rejected), quota exceeded (rejected before any provider call), and a timed-out job (canceled at the provider).
