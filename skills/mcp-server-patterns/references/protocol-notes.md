# MCP protocol notes

Read this when a wire-level detail matters: version negotiation, HTTP headers, auth flow, or interop with older clients. The source of truth is modelcontextprotocol.io/specification; these notes follow revision `2026-07-28`.

## Revisions and eras

- `2024-11-05`: original revision. HTTP+SSE transport (separate SSE and POST endpoints). Now deprecated.
- `2025-03-26` to `2025-11-25`: Streamable HTTP with optional sessions (`Mcp-Session-Id`), standalone GET stream for server messages, resumable streams, `initialize` handshake.
- `2026-07-28`: no `initialize` handshake and no protocol-level sessions. Every request carries its protocol version and client capabilities in `params._meta` (`io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities`, `io.modelcontextprotocol/clientInfo`). Servers no longer send JSON-RPC requests to clients; sampling, elicitation and roots come back as an `InputRequiredResult` the client answers by retrying the call. Change notifications arrive on a `subscriptions/listen` stream.

Your SDK handles most of this. What matters to a server author:

- Do not keep per-connection state; the protocol has none. Use explicit handles (see SKILL.md section 5).
- If you must support older clients, check your SDK's backward-compatibility support rather than implementing both eras yourself.

## Streamable HTTP (2026-07-28)

- Single endpoint, POST only. GET or DELETE from old clients: `405 Method Not Allowed`. Ignore any `Mcp-Session-Id` and `Last-Event-ID` headers.
- Request headers the client must send: `MCP-Protocol-Version`, `Mcp-Method`, and `Mcp-Name` for `tools/call`, `resources/read`, `prompts/get`. The server must reject a mismatch between header and body with `400` and JSON-RPC error `-32020` (HeaderMismatch).
- Unsupported protocol version: `400` with an `UnsupportedProtocolVersionError` listing supported versions.
- Unknown method: `404` with JSON-RPC `-32601`.
- Notifications POSTed by the client: `202 Accepted`, no body.
- Responses: `application/json` or `text/event-stream`. Set `X-Accel-Buffering: no` on SSE responses behind nginx-style proxies.
- Cancellation on HTTP is the client closing the response stream; stop work when that happens.
- `x-mcp-header` in a property's schema mirrors that argument into an `Mcp-Param-<Name>` header for routing. Only primitive string, integer or boolean properties reachable through `properties` keys. Never on secrets or PII.

## stdio

- Newline-delimited JSON-RPC, no embedded newlines, UTF-8.
- stdout carries only MCP messages; stderr is free for logs.
- Cancellation is a `notifications/cancelled` notification from the client.
- Exit when stdin reaches end-of-file.

## Authorization flow (HTTP servers)

1. Client calls the MCP endpoint without a token.
2. Server returns `401` with `WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource", scope="files:read"`.
3. Client fetches the Protected Resource Metadata (RFC 9728), which lists `authorization_servers` and `scopes_supported`.
4. Client discovers the authorization server (RFC 8414 or OpenID Connect Discovery), registers (Client ID Metadata Documents preferred; Dynamic Client Registration is deprecated but allowed), and runs authorization code + PKCE with a `resource` parameter (RFC 8707) naming the MCP server's canonical URI.
5. Client sends `Authorization: Bearer <token>` on every request. Never in the query string.
6. Server validates the token per OAuth 2.1 and checks its audience is this server. Invalid or expired: `401`. Insufficient scope: `403` with `WWW-Authenticate: Bearer error="insufficient_scope", scope="...", resource_metadata="..."`, listing all scopes the operation needs in one challenge.
7. Server must not accept or forward tokens issued for anything else.

Keep `offline_access` out of the scopes the server advertises; refresh tokens are a client concern.

## Error codes

| Code | Meaning |
|---|---|
| -32700 | Parse error |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params (also: unknown tool) |
| -32603 | Internal error |
| -32020 | Header mismatch (HTTP) |
| -32021 | Missing required client capability |
| -32022 | Unsupported protocol version |

Tool execution failures are not JSON-RPC errors: return a result with `isError: true`.

## Tool annotation defaults

| Hint | Default | Meaning when true |
|---|---|---|
| `readOnlyHint` | false | Does not modify its environment |
| `destructiveHint` | true | May delete or overwrite (only meaningful if not read-only) |
| `idempotentHint` | false | Repeating with same args has no extra effect (only meaningful if not read-only) |
| `openWorldHint` | true | Talks to external systems (web, third-party APIs) |
