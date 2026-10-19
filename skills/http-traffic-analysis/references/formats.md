# Capture formats and where secrets hide

## HAR (HTTP Archive) — `.har`

JSON. Top level `{ "log": { "version", "creator", "entries": [...] } }`. Each entry:

```
startedDateTime  ISO 8601
time             total ms
request  { method, url, httpVersion, headers:[{name,value}], queryString:[{name,value}],
           cookies:[{name,value}], postData:{ mimeType, text | params:[{name,value}] } }
response { status, statusText, headers:[...], cookies:[...], content:{ size, mimeType, text } }
timings  { blocked, dns, connect, send, wait, receive, ssl }
```

Secrets live in: `request.headers` (`Authorization`, `Cookie`, `X-Api-Key`), `request.cookies`, `request.queryString` (`token`, `code`, `access_token`), `request.postData.text/params` (`password`, `client_secret`), `response.headers` (`Set-Cookie`), and any JWT in a body. Latency = `time` or the sum of `timings`.

Export: Chrome/Edge/Firefox DevTools → Network → right-click → "Save all as HAR". DevTools can be set to redact on export, but do not rely on it.

## Charles — `.chlsj`

JSON session export (`Export Session` → JSON). An array of transaction objects:

```
{ host, port, path, scheme, method, status,
  request:  { header:{ headers:[{name,value}] }, body:{ text | encoded } },
  response: { header:{ headers:[...] }, body:{ text } },
  times: { requestBegin, responseEnd }, durations:{ total, connect, ... } }
```

Same secret fields as HAR, under `request.header.headers` and `response.header.headers`. `.chls` (non-JSON) must be exported to `.chlsj` first.

## mitmproxy flows

Binary, length-prefixed serialised flows (not JSON). Read with:
- `mitmdump -nr flowfile` to print, or `-w` to re-save.
- HAR export (built in since mitmproxy 10.1): `mitmdump -nr flowfile --set hardump=out.har` writes HAR.
- Python: `from mitmproxy.io import FlowReader; FlowReader(open(path,'rb'))` yields flows with `.request` / `.response` (`.headers`, `.content`, `.get_text()`).

Secrets live in `flow.request.headers` / `flow.response.headers` and the contents. If no mitmproxy tooling is installed, ask the user to re-export as HAR.

## Redaction placeholder convention

Keep a map so the same secret gets the same placeholder across the whole capture, which preserves "this token is reused here":

```
Authorization: Bearer <BEARER_1>
Cookie: session=<COOKIE_session>; csrf=<COOKIE_csrf>
?access_token=<QP_access_token>
{ "client_secret": "<BODY_client_secret>" }
```

Never emit the real value, in chat or in any written file.
