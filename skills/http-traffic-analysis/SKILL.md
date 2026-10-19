---
name: http-traffic-analysis
description: Reconstructs and tests an API from captured HTTP traffic - browser HAR exports, Charles .chlsj session files and mitmproxy flow dumps - by mapping the request sequence and auth flow, surfacing failing and slow calls, diffing two captures to spot what changed, and emitting replayable tests or a typed client, always stripping tokens, cookies, auth headers and other secrets before any excerpt is shown. Use when you have a traffic capture and need to understand, compare, debug or codify the HTTP calls an app or page actually makes.
license: MIT
compatibility: Any Agent Skills host. Reads HAR/JSON captures locally; mitmproxy flow dumps need mitmproxy's tools or a parser.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# HTTP traffic analysis

Take a capture of what an app sent over HTTP and turn it into understanding, a bug report, a diff, or runnable tests — without ever echoing the secrets inside it.

## 0. Redact first — before reading anything aloud

A capture is full of live credentials. **Before** you quote, summarise, or write any request to a file or the chat:

1. Strip these from every request and response you surface: `Authorization`, `Cookie`, `Set-Cookie`, `Proxy-Authorization`, `X-Api-Key` and any `*-token`, `*-secret`, `*-key` header; query parameters and body fields named `token`, `access_token`, `refresh_token`, `password`, `code`, `signature`, `client_secret`, `api_key`, session IDs; and bearer/JWT values anywhere.
2. Replace each with a stable placeholder (`<BEARER_1>`, `<COOKIE_SESSION>`) so you can still reason about *which* credential flows where, without printing it.
3. Never paste a full raw request containing a real credential, even when the user asks — show the redacted form and say what you removed.

`references/formats.md` lists the exact fields each format stores secrets in.

## 1. Load the capture

Identify the format by extension/shape:
- **`.har`** — JSON, `log.entries[]`; each entry has `request`, `response`, `time`, `startedDateTime`. Browser DevTools → Network → Save all as HAR.
- **`.chlsj`** — Charles JSON session export, an array of transactions with `host`, `path`, `request`, `response`, `durations`.
- **mitmproxy flows** — binary dump; read with `mitmdump -nr flows -s` or the mitmproxy Python `io.FlowReader`. Ask the user to re-export as HAR if no mitmproxy tooling is available.

Parse to a normalised list of `{method, url, status, duration_ms, request_headers, request_body, response_headers, response_body}`. Read large bodies lazily; summarise, don't dump.

## 2. Reconstruct the API

- Group entries by host and by path template (collapse IDs: `/users/42/orders` → `/users/{id}/orders`).
- For each distinct endpoint record: method, path template, which parameters vary, the request content type and body shape, the status(es) seen, and the response shape.
- Trace the **auth flow**: which call mints a token/cookie, which header carries it afterwards, when it refreshes. Describe it with placeholders.
- Trace **sequence and dependencies**: an ID returned by call A used in call B's path or body. This is what a replay must preserve.

## 3. Answer the actual question

Pick the task the user asked for:

**Understand** — produce an endpoint inventory (table: method, path, purpose, auth) and the call sequence for the flow.

**Debug failures** — list every `4xx`/`5xx` and every request that got an error body; for each, show the redacted request and the response status/message, and name the likely cause (missing param, expired auth, wrong content type, server error).

**Find slow calls** — rank by `duration_ms`; flag calls on the critical path, N+1 patterns (the same endpoint hit many times in a row), and payloads larger than needed.

**Diff two captures** — align requests by method+path template, then report: endpoints only in one capture, status changes, request/response field additions/removals/type changes, and latency deltas. Useful for "what changed between the working and broken session".

**Codify** — emit either:
- *Replayable tests*: one test per meaningful call, parameterised so credentials and IDs come from variables/env, asserting status and key response fields. Preserve the dependency order from step 2; never hard-code a captured token.
- *A typed client*: functions per endpoint with request/response types inferred from the observed bodies, secrets taken as parameters.

## Rules

- A capture shows *what happened once*, not the contract. Mark inferred types and optionality as "observed", and say what a single capture can't tell you (which fields are truly optional, error cases not exercised).
- Generated tests and clients must read credentials from the environment, never embed a captured one.
- Don't replay captured write requests (POST/PUT/PATCH/DELETE) against a live system without the user's go-ahead and a safe target.
- If the capture is truncated or bodies were not recorded, say so rather than inventing shapes.

## Report back

End with: the capture format and entry count, the endpoint inventory, what you found for the requested task, exactly which secret fields you redacted, and anything a single capture left uncertain.
