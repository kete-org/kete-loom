---
name: transactional-email
description: Application code that sends one-to-one system email (sign-up confirmation, password reset, receipts, alerts) through a provider HTTP API such as Postmark, Amazon SES, Resend, Mailtrap or SendGrid, with versioned templates rendered from a typed model, sends queued and made idempotent by a stored message key, test inboxes and simulator addresses instead of real recipients, verified bounce, complaint and delivery webhooks, and a suppression check before every send. Use when wiring a provider SDK into a backend, building the email-sending service or queue worker, testing email flows without mailing real users, or handling a provider's bounce and complaint events in code.
license: MIT
compatibility: Any Agent Skills host. Live sends need network access to the chosen provider and a verified sending domain. Examples are TypeScript; the rules apply to any language and SDK.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Transactional email

Build the code path from "user did something" to "provider accepted one email", so each email goes out once, never to a suppressed address, never to a real person from a test, and every bounce or complaint comes back into the database. DNS records (SPF, DKIM, DMARC), warm-up and inbox placement belong to `email-deliverability`; this skill starts once a domain is verified.

## Ground rules

1. **API keys on the server, per environment.** Separate keys (or Postmark servers, SES accounts or Regions, SendGrid subusers) for development, staging and production. A dev key must be unable to reach real inboxes.
2. **Transactional only on this path.** Marketing and bulk mail go on a separate stream, subdomain or provider account (Postmark `broadcast` stream, a separate SES configuration set, a SendGrid subuser) so a newsletter complaint spike can't block password resets.
3. **Never send inside the request.** The web request writes an `outbound_email` row in the same database transaction as the business change, then a worker sends it (outbox pattern). The user's request never waits on the provider.
4. **One logical email, one key.** Each row has a stable idempotency key (for example `password-reset:<user_id>:<token_id>`) with a unique index, so a retry or double-click creates no second row. Pass it to providers that support it (Resend `Idempotency-Key`, kept 24 hours); for the others, the unique row plus a `sent` status update is the guard.
5. **Check suppression before every send.** Keep your own `email_suppressions` table fed by webhooks, check it in the worker, and do not rely on the provider silently dropping the message.
6. **Verify every webhook** the way the provider supports (signature, SNS message signature, basic auth plus IP allow-list), on the raw body, and make processing idempotent by event ID.
7. **Tests never hit real people.** Use a sandbox (Mailtrap sandbox inbox, SendGrid sandbox mode, Postmark test token) or simulator addresses (SES `@simulator.amazonses.com`, Resend `@resend.dev`). Details per provider in `references/providers.md`.

## Choose the provider

| Need | Good fit |
|---|---|
| Fast setup, strict transactional focus, message streams, built-in templates | Postmark |
| Lowest unit cost at volume, already on AWS, own the event pipeline | Amazon SES v2 with configuration sets and SNS or EventBridge |
| Developer-first API, React Email templates, native idempotency keys | Resend |
| One vendor for a test sandbox and sending | Mailtrap |
| Existing Twilio account, dynamic templates, suppression groups | SendGrid |

If the project already uses one, keep it; the rules above are the same everywhere.

## Implementation steps

1. **Email module behind one interface**: `send({ template, to, model, idempotencyKey, tags })`. One adapter per provider; application code never imports a provider SDK directly. This is what lets tests swap in a sandbox.
2. **Templates**: keep them in the repo (React Email, MJML, Handlebars) or in the provider (Postmark `TemplateAlias`, SendGrid dynamic template `d-...`). Either way: a typed model per template, an HTML and a plain-text part, a version in the template name or tag, and a snapshot test that renders each template with fixture data. Escape every user-supplied value; never put raw user input in a subject without trimming control characters and newlines.
3. **Outbox row**: `id, idempotency_key UNIQUE, template, version, to_address, model_json, status (queued|sending|sent|failed|suppressed), provider_message_id, attempts, last_error, created_at, sent_at`.
4. **Worker**: claim rows with `UPDATE ... SET status='sending' WHERE status='queued' ... RETURNING` (or `SELECT ... FOR UPDATE SKIP LOCKED`), check suppression (mark `suppressed` and stop), render, call the provider with the key, store `provider_message_id`, mark `sent`. Retry 429 and 5xx with backoff and jitter; mark `failed` without retry on 4xx validation errors (bad address, unverified sender).
5. **Ambiguous timeouts**: if the provider call times out after sending the request, the email may have gone. With a provider idempotency key, retry with the same key. Without one, look the message up first (provider message search or activity API, by the tag or metadata holding your key) and retry only if it is not there. If the lookup is not possible, decide per template whether a duplicate or a missing email is worse; ask the user.
6. **Webhook endpoint**: verify, store the raw event with its ID (unique), return 2xx quickly, process asynchronously. Map events to actions: hard bounce and spam complaint add to `email_suppressions` (reason, source event, date); soft bounce or deferral only logs; delivery updates the outbox row. Shapes in `references/providers.md`.
7. **Suppression sync**: also import the provider's own suppression list periodically, and when a user changes their address, clear nothing automatically; a support-approved removal only.
8. **Observability**: count sent, bounced, complained and suppressed per template per day, and alert if bounce or complaint rates jump after a deploy.

## Reviewing an existing integration

- Provider call inside the HTTP handler or a database transaction, so a slow provider stalls requests or a rollback still sends.
- No idempotency: a retried job or double-submitted form sends the email twice; or the key is regenerated per attempt.
- Webhook route without verification, or verification over re-serialised JSON.
- Bounces and complaints received but never written to a suppression table, or soft bounces suppressed permanently.
- Production API key in `.env.example`, tests or CI that send to real addresses; staging using the production key.
- Password reset or magic-link tokens logged, put in tags or metadata, or left valid after use.
- Marketing mail sharing the transactional stream or key.

## Stop and ask the user

- Before switching any environment to a production key or a live stream, or before sending to real recipients from a test.
- Whether duplicate or missing email is worse for each template when a send outcome is unknown.
- Before removing addresses from any suppression list, or before sending to a list of more than a handful of users through this path (that is bulk mail).

## Before you finish

Provider docs are the final word on field names and limits. Test, in the sandbox: one email per idempotency key under a forced retry; a simulator bounce lands in `email_suppressions` and blocks the next send; a simulator complaint does the same; a webhook with a bad signature or credentials is rejected; templates render in HTML and text with fixture data.
