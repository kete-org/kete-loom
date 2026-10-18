---
name: slack-app-integration
description: Builds Slack apps on the Bolt framework (JavaScript, Python or Java), from the app manifest and minimal bot scopes through Events API subscriptions, slash commands and shortcuts acknowledged within three seconds, Block Kit messages and modals with interactive actions, and v0 HMAC request signing checks, to tiered Web API rate limits with Retry-After, Socket Mode versus HTTP endpoints, and OAuth v2 installs for distributing an app to other workspaces. Use when creating or fixing a Slack bot, slash command, modal or interactive message, choosing Slack scopes, debugging dispatch_failed or invalid signature errors, or preparing a Slack app for multi-workspace distribution.
license: MIT
compatibility: Any Agent Skills host. Live calls need network access to slack.com. Examples use Bolt for JavaScript; Bolt for Python and Java use the same concepts.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# Slack app integration

Build a Slack app that asks for the fewest scopes, acknowledges every request in time, verifies that each request really came from Slack, and survives rate limits. Posting a one-off message with an incoming webhook needs none of this; use the webhook URL and stop.

## Ground rules

1. **Use Bolt** unless the project already has its own Slack stack. Bolt verifies signatures, answers `url_verification` and gives every handler an `ack()`. It does not dedupe retried events; you do.
2. **Secrets from the environment:** `SLACK_BOT_TOKEN` (`xoxb-`), `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN` (`xapp-`, Socket Mode only), `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` (distribution). Never commit or log them.
3. **Least scopes.** Every scope shows on the install screen and widens what a leaked token can do. Add scopes only when a method you call needs them.
4. **`ack()` within 3 seconds**, then do slow work. Slash commands, shortcuts, actions and view submissions fail with a timeout error for the user otherwise; Events API deliveries are retried.
5. **Keep the app definition in a manifest** (`manifest.json` or `.yml`) under version control.

## Set up

1. Create the app at api.slack.com/apps from a manifest. Declare `oauth_config.scopes.bot`, `features` (bot user, slash commands, shortcuts), `settings.event_subscriptions.bot_events` and `settings.interactivity`.
2. Pick the connection:

| Situation | Use |
|---|---|
| Local development, internal app behind a firewall | Socket Mode: `socketMode: true` and an app-level token with `connections:write`. No public URL |
| Production app, or one listed in the Slack Marketplace | HTTP: a public HTTPS request URL for events, commands and interactivity (Marketplace apps cannot use Socket Mode) |

3. Install to a development workspace and copy the bot token.

Common bot scopes: `chat:write` (post), `commands` (slash commands), `app_mentions:read`, `channels:history` / `groups:history` / `im:history` (read messages in public / private / DMs), `users:read`, `reactions:write`. Add `chat:write.public` only if the bot must post in channels it was not invited to.

## Events, commands and interactivity

```js
const { App } = require('@slack/bolt');
const app = new App({ token: process.env.SLACK_BOT_TOKEN, signingSecret: process.env.SLACK_SIGNING_SECRET });

app.command('/ticket', async ({ ack, body, client }) => {
  await ack();                                   // within 3 s
  await client.views.open({ trigger_id: body.trigger_id, view: ticketModal() }); // trigger_id expires after ~3 s
});

app.view('ticket_submit', async ({ ack, view, body }) => {
  const title = view.state.values.title_block.title_input.value;
  if (!title) return ack({ response_action: 'errors', errors: { title_block: 'Required' } });
  await ack();
  queue.push({ user: body.user.id, title });     // slow work after ack
});

app.event('app_mention', async ({ event, say }) => { await say({ text: 'On it', thread_ts: event.ts }); });
```

Rules:

- On a FaaS host (AWS Lambda and similar) with the HTTP receiver, set `processBeforeResponse: true` and keep handlers fast; the function may be frozen as soon as the response is sent, so work after `ack()` is not guaranteed to run. Hand slow work to a queue.
- Events: Slack retries a delivery up to three times if you do not return `2xx` in 3 seconds, sending `X-Slack-Retry-Num` and `X-Slack-Retry-Reason`. Dedupe on `event_id`. Ignore messages from your own bot (`bot_id` set) to avoid loops.
- Slash command replies: `respond()` (via `response_url`, usable up to 5 times within 30 minutes) for ephemeral or follow-up replies; `client.chat.postMessage` for a normal message.
- Block Kit: always include top-level `text` as the notification and accessibility fallback. Give every input and action a stable `block_id` / `action_id`. Messages allow up to 50 blocks; modals and Home tabs up to 100. Build with Block Kit Builder and validate before shipping.
- Use `private_metadata` on a view to carry context (up to 3,000 characters), never hidden user-editable inputs.
- Use `views.update` with the `hash` from the previous view to avoid race conditions.

## Request signature verification

Only needed if you are not using Bolt's receiver (custom framework, serverless handler):

1. Read `X-Slack-Request-Timestamp`; reject if it differs from now by more than 5 minutes.
2. Build `v0:{timestamp}:{raw body}` from the **raw** body before any JSON or form parsing.
3. HMAC-SHA256 it with the signing secret (as UTF-8), hex-encode, prefix `v0=`.
4. Compare with `X-Slack-Signature` using a constant-time compare. Reject with 401 on mismatch.

Never use the deprecated verification token instead.

## Rate limits

- Web API methods are tiered per method, per workspace, per app: Tier 1 (1+ per minute), Tier 2 (20+), Tier 3 (50+), Tier 4 (100+), plus special limits. `chat.postMessage` allows about one message per second per channel.
- On `HTTP 429`, wait `Retry-After` seconds. The official SDK clients retry for you; do not stack your own retry loop on top.
- Events API deliveries are capped at 30,000 per workspace per app per hour; past that Slack sends `app_rate_limited`.
- Since 29 May 2025, commercially distributed apps that are not Marketplace-approved get Tier 1 limits on `conversations.history` and `conversations.replies` (1 request per minute, `limit` at most 15) for apps created from that date and for new installs of older apps. Internal (custom) apps and Marketplace apps are not affected. Check docs.slack.dev for the current rule before designing anything that reads history in bulk.
- Paginate list methods with `cursor` and `response_metadata.next_cursor`; keep `limit` at or below 200.

## Distribution

1. Turn on public distribution in the app settings; set redirect URLs.
2. Implement OAuth v2: send users to `https://slack.com/oauth/v2/authorize?client_id=...&scope=...&state=...`, exchange the code with `oauth.v2.access`, store the bot token per `team.id` (and `enterprise.id` for Enterprise Grid). Bolt's `installationStore` and `stateSecret` do this.
3. Handle `app_uninstalled` and `tokens_revoked` events by deleting the stored tokens.
4. Consider token rotation (refresh tokens, 12-hour access tokens) for distributed apps.
5. Marketplace listing needs a review by Slack; check their current guidelines and expect scope justifications.

## Reviewing an existing app

Look for: slow work before `ack()`; signature checks on a parsed body, with `==`, or missing; a handler that skips verification when headers are absent; scopes nobody uses; tokens stored in plain config; no `event_id` dedupe; bot replying to itself; `trigger_id` used after a slow call; messages with blocks but no `text`; tight loops on `chat.postMessage` with no pacing.

## Stop and ask the user

- Before adding a scope that reads messages (`*:history`) or user data (`users:read.email`); these change what the install asks for and need a reason.
- Before enabling public distribution or submitting to the Marketplace.
- Before posting to real channels from tests; use a dev workspace.

## Before you finish

Test in a development workspace: a slash command that opens a modal, a view submission with a validation error, an interactive button, an event delivered twice (handled once), a request with a stale timestamp and a forged signature (both rejected), and a burst of posts that triggers a 429 (handled). Slack's docs at docs.slack.dev are the final word on scopes, limits and payloads.
