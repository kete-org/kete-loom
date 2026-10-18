# Provider notes for transactional email

Read the section for the provider in use. Confirm field names against the provider's current API reference before shipping.

## Postmark

- Send: `POST https://api.postmarkapp.com/email` (`From`, `To`, `Subject`, `HtmlBody`, `TextBody`, `MessageStream`, `Tag`, `Metadata`). Templates: `POST /email/withTemplate` with `TemplateAlias` or `TemplateId` and `TemplateModel`; batch with templates: `POST /email/batchWithTemplates`, up to 500 messages, returns 200 even if some fail, so check each result's `ErrorCode`.
- Auth header: `X-Postmark-Server-Token`. Test token: send `POSTMARK_API_TEST` as the server token to validate requests without delivering.
- Streams: `outbound` is the default transactional stream; create a broadcast stream for bulk mail. Omitting `MessageStream` uses `outbound`.
- Idempotency: no idempotency key in the API. Rely on your outbox unique key.
- Webhooks: Delivery, Bounce, Spam complaint, Open, Click, Subscription change. Postmark does **not** sign webhooks: protect the URL with HTTP basic auth credentials in the URL, HTTPS, and an allow-list of Postmark's published webhook IPs. Retries 5xx, 408, 429 and network failures (1, 5, 10, 10, 10, 15 minutes); other 4xx are dropped, so return 2xx once stored.
- Suppressions are per stream; hard bounces and spam complaints suppress automatically; a `SubscriptionChange` webhook tells you when one is added or removed.

## Amazon SES (API v2)

- Send: `SendEmail` (SDK `SESv2Client` + `SendEmailCommand`) with `Content.Simple`, `Content.Template` (stored template) or `Content.Raw`, `ConfigurationSetName`, and `EmailTags` for your own message key.
- Sandbox (per Region): send only to verified addresses or the mailbox simulator, at most 200 messages per 24 hours and 1 per second. Request production access per Region.
- Mailbox simulator (works in the sandbox, does not hurt reputation, still billed): `success@simulator.amazonses.com`, `bounce@`, `complaint@`, `ooto@`, `suppressionlist@`. Add labels (`bounce+order123@simulator.amazonses.com`) to match events to messages.
- Events: configuration set event destinations to SNS, EventBridge, Firehose or CloudWatch. For SNS over HTTPS, confirm the `SubscriptionConfirmation` and verify every message's SNS signature (the AWS SDK message validator) before trusting it; also check the topic ARN.
- Account-level suppression list (on by default for bounces and complaints in accounts created after 25 Nov 2019; enable older ones with `aws sesv2 put-account-suppression-attributes --suppressed-reasons BOUNCE COMPLAINT`); manage with `PutSuppressedDestination`, `DeleteSuppressedDestination`, `ListSuppressedDestinations`. Only hard bounces (not soft) are added. Sending treats address case as equal, but the suppression management API needs the exact case stored, so keep the original address alongside your normalised one. Configuration sets can override it. Messages to suppressed addresses are accepted, not delivered, and still count toward the daily sending quota.
- Gmail does not send complaint feedback to SES, so a Gmail "Report spam" will not reach your suppression list.
- Idempotency: none in the API. Rely on your outbox key.

## Resend

- Send: `POST https://api.resend.com/emails` with `from`, `to`, `subject`, `html`/`text` or `react` (Node SDK), `tags`. Header `Authorization: Bearer re_...`.
- Idempotency: `Idempotency-Key` header (SMTP: `Resend-Idempotency-Key`), 1-256 chars, kept 24 hours. Same key with a different payload returns `409 invalid_idempotent_request`; a request still in flight returns `409 concurrent_idempotent_requests` (safe to retry later).
- Test addresses: `delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev` (these three accept `+label`, e.g. `bounced+signup1@resend.dev`) and `suppressed@resend.dev` (no labels). Test sends count against the account's sending quota.
- Webhooks are signed via Svix: headers `svix-id`, `svix-timestamp`, `svix-signature`; verify the raw body string with `resend.webhooks.verify` or the `svix` library `Webhook` class. Email events: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed`, `email.opened`, `email.clicked`, `email.scheduled`, `email.received`. Suppress on `email.bounced` and `email.complained`; mark the outbox row on `email.failed` and `email.suppressed`.

## Mailtrap

- Testing: a sandbox inbox catches everything; nothing reaches real recipients. API: `POST https://sandbox.api.mailtrap.io/api/send/{inbox_id}` with the `Api-Token` header (or bearer token); SMTP credentials come from the inbox's Integration tab. Use it for development and staging, including automated tests that read the inbox through the API.
- Sending: transactional sending API for production with a separate token from the testing token. Check the current host and stream (transactional versus bulk) in the Mailtrap docs.

## SendGrid (Twilio)

- Send: `POST https://api.sendgrid.com/v3/mail/send` with `personalizations[]`, `from`, `template_id` (`d-...` dynamic template) and `personalizations[].dynamic_template_data`, `custom_args` for your message key, `asm.group_id` for an unsubscribe group. `202 Accepted` on success.
- Sandbox mode: `"mail_settings": { "sandbox_mode": { "enable": true } }` validates and returns `200 OK` without delivering. The boolean must not be quoted.
- Signed Event Webhook: ECDSA signature in `X-Twilio-Email-Event-Webhook-Signature`, timestamp in `X-Twilio-Email-Event-Webhook-Timestamp`; verify over timestamp + raw body with the public key from the webhook settings, using the helper library. OAuth 2.0 client credentials can be enabled as well.
- Events arrive batched as a JSON array: `processed`, `dropped`, `delivered`, `deferred`, `bounce`, `open`, `click`, `spamreport`, `unsubscribe`, `group_unsubscribe`. Each has `sg_event_id`; dedupe on it.
- Suppressions: bounces, blocks, spam reports and invalid emails each have a `/v3/suppression/{bounces|blocks|spam_reports|invalid_emails}` endpoint; global unsubscribes are managed at `/v3/asm/suppressions/global` and unsubscribe-group suppressions at `/v3/asm/groups/{group_id}/suppressions`.
- Idempotency: none in the API. Rely on your outbox key.

## Webhook handler shape (any provider)

```ts
app.post("/webhooks/email", express.raw({ type: "*/*" }), async (req, res) => {
  let events;
  try {
    events = verifyAndParse(req.headers, req.body); // provider-specific; returns an array (SendGrid batches events)
  } catch {
    return res.sendStatus(401); // bad signature or credentials: reject, never process
  }
  for (const event of events) {
    const inserted = await db.emailEvents.insertIfAbsent({ id: event.id, provider, raw: JSON.stringify(event) });
    if (inserted) await queue.add("email-event", { id: event.id });
  }
  res.sendStatus(200); // only after every event is stored, so a crash mid-batch gets a retry
});
```

Map in the job: hard bounce or complaint → upsert `email_suppressions(address_normalised, reason, event_id, created_at)`; soft bounce → log and count; delivered → mark the outbox row.
