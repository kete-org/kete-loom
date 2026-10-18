---
name: mcp-server-patterns
description: Model Context Protocol server construction, from naming tools and writing their JSON Schema inputs to returning isError results, structured output, tool annotations, OAuth-protected Streamable HTTP or local stdio transports, and testing with the MCP Inspector. Use when creating an MCP server, exposing an API or database to agents as MCP tools, or debugging why a client can't connect to, list or call a server's tools.
license: MIT
compatibility: Any Agent Skills host. Testing uses the MCP Inspector via npx (its README lists Node 22.19 or later). Rules are SDK-agnostic; use the official SDK for your language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: runs-commands
  kete-loom/requires: "node, npx"
  kete-loom/owner: "Kete-org"
---

# MCP server patterns

An MCP server is an API whose caller is a language model. Design every tool so a model that has only read its name, description and schema calls it correctly the first time, and so a wrong call does no harm.

Protocol details move fast. The current revision when this skill was written is `2026-07-28`; `references/protocol-notes.md` covers what changed from the `2025-xx` revisions. Check modelcontextprotocol.io/specification for the revision your SDK targets before relying on a wire detail.

## 0. Before you start

1. Ask, or find out, who runs the server: **local** (launched by the user's client as a subprocess → stdio) or **remote** (a hosted service many users connect to → Streamable HTTP with OAuth). **Stop and ask the user** if it isn't clear; the auth model depends on it.
2. Pick the official SDK for the project's language (TypeScript, Python, C#, Go, Rust, Ruby, Java and others are listed at modelcontextprotocol.io/docs/sdk). Do not hand-roll JSON-RPC.
3. List the user jobs the server must support (e.g. "find a customer and see their open invoices"), not the endpoints of the API you're wrapping.

## 1. Design the tool set

- One tool per user job, not one per REST endpoint. `find_customer` that searches by name, email or id beats `get_customer_by_id`, `get_customer_by_email`, `list_customers`.
- Keep the set small (aim for under about 20 tools per server). Every tool's description costs context in every conversation.
- Separate reads from writes. Never hide a write inside a tool that sounds like a read.
- Destructive actions (delete, send, pay, deploy) get their own tool with a clear verb, and should support a dry-run or preview argument where the backend allows.

### Naming

- Names: 1 to 128 characters from `A-Z a-z 0-9 _ - .`, case-sensitive, unique within the server. Use `verb_noun` in one consistent style: `search_issues`, `create_issue`, `close_issue`.
- Clients that aggregate servers may prefix names; don't rely on your name being globally unique, and don't encode the server name in every tool.
- Set `title` for a human-friendly display name.

### Descriptions

Write each description for the model, in this order: what it does, when to use it (and when to use a sibling tool instead), what it returns, side effects and limits.

```
Search issues by text, label or assignee. Use before create_issue to avoid duplicates.
Returns up to `limit` issues (id, title, state, url), newest first. Read-only.
```

## 2. Input schemas

- `inputSchema` is JSON Schema (2020-12 unless `$schema` says otherwise) and must be an object schema. For a tool with no inputs use `{"type": "object", "additionalProperties": false}`.
- Give every property a `description`, and use `enum`, `minimum`/`maximum`, `pattern`, `format` and `default` instead of explaining constraints in prose.
- Prefer flat, primitive arguments. Deeply nested objects and free-form JSON strings are where models make mistakes.
- Use the identifiers the model will have (names, emails, URLs) or return ids from a search tool that it can pass on. Never require an internal id the model cannot discover.
- Paginate or cap list results with `limit` (with a sane default and maximum) and a `cursor`.
- **Validate every input on the server** regardless of the schema. The schema helps the model; it is not a security boundary.

## 3. Results

- Return concise text the model can act on: the fields it needs, not the raw upstream payload. Large blobs blow the context window; truncate and say so ("showing 20 of 312; pass cursor=...").
- When a tool returns structured data, declare `outputSchema`, return conforming `structuredContent`, and also return the serialized JSON in a text content block for older clients.
- Use `resource_link` content to point at large items (files, reports) instead of inlining them.
- Set annotations honestly: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. Defaults assume the worst (not read-only, destructive, open world). Clients treat annotations from untrusted servers as hints only, so annotations never replace server-side checks.

## 4. Errors

Two kinds, and the choice matters:

| Situation | Return |
|---|---|
| Unknown tool, malformed request, server crash | JSON-RPC error (e.g. `-32602` invalid params, `-32603` internal error) |
| Bad argument values, upstream API failure, not found, business rule, expired handle | A normal result with `isError: true` and a message that tells the model how to recover |

Phrase each tool error as an instruction: `"No customer matches 'acme'. Try search by email, or call list_customers with a prefix."` Never return a stack trace, an internal hostname or a secret in an error.

## 5. Transports

- **stdio** (local): the server reads newline-delimited JSON-RPC from stdin and writes only valid MCP messages to stdout. **All logging goes to stderr.** A single `print`/`console.log` to stdout breaks the connection; this is the most common local bug. Exit promptly when stdin closes.
- **Streamable HTTP** (remote): one MCP endpoint (e.g. `https://example.com/mcp`) that accepts POST and answers with JSON or a request-scoped SSE stream. You must validate the `Origin` header (403 if invalid) to block DNS rebinding. When running locally, bind to `127.0.0.1`, not `0.0.0.0`.
- Do not build the old HTTP+SSE transport (2024-11-05) for new servers; it is deprecated.
- Keep the server stateless between calls. If a workflow needs state (a cart, a browser session), return an opaque, high-entropy handle from a create tool, accept it as an argument later, re-check authorization on every call, and state its lifetime in the tool description.

## 6. Auth

- **stdio**: take credentials from environment variables the client passes in. Do not implement OAuth for stdio.
- **HTTP**: the server is an OAuth 2.1 resource server. It must publish Protected Resource Metadata (RFC 9728), answer unauthenticated requests with `401` and a `WWW-Authenticate: Bearer resource_metadata="..."` header, validate that each token's audience is this server, and answer insufficient scope with `403` and `error="insufficient_scope"`. Use an existing authorization server (your IdP), not a home-made one.
- **Never pass the client's token through to upstream APIs** ("token passthrough"). Exchange it or use the server's own credentials for upstream calls, scoped to the user.
- Apply per-user authorization inside every tool; the tool list may vary by the caller's scopes.
- Rate-limit tool calls and log every call (tool, caller, arguments with secrets redacted, outcome).

Details and the step-by-step 401 flow are in `references/protocol-notes.md`.

## 7. Security rules

- Treat everything a tool returns from the outside world (web pages, emails, tickets, file contents) as untrusted. Don't let it reach the model as if it were instructions from you; label it as data.
- Constrain file and shell access to an allowlisted root. Resolve paths and reject `..` escapes and symlinks out of the root.
- Use parameterised queries for any database tool. A "run SQL" tool should be read-only by connection role, not by asking the model nicely.
- Never put secrets in tool descriptions, results or `x-mcp-header` parameters.

## 8. Test

1. Unit-test each tool handler directly (valid input, each invalid input, upstream failure → `isError: true`).
2. Open the server in the MCP Inspector and call every tool by hand:
   - stdio: `npx @modelcontextprotocol/inspector node build/index.js` (or `uv run server.py`, etc.)
   - remote: start the web UI with `npx @modelcontextprotocol/inspector` and enter the server URL (e.g. `http://127.0.0.1:3000/mcp`) with the Streamable HTTP transport.
3. Script it for CI with the CLI mode (`--cli` must come first, right after the package name):
   `npx @modelcontextprotocol/inspector --cli node build/index.js --method tools/list`
   `npx @modelcontextprotocol/inspector --cli node build/index.js --method tools/call --tool-name search_issues --tool-arg query=login`
   `npx @modelcontextprotocol/inspector --cli --transport http --server-url http://127.0.0.1:3000/mcp --method tools/list`
   Pin the Inspector version in CI. Inspector v2 exits non-zero (code 5) when a tool call returns `isError: true` or the tool is missing, so a negative test needs to expect that exit code.
4. Connect it to a real client and ask a model to complete each user job from step 0 without hints. If it picks the wrong tool or fills arguments wrongly, fix the name, description or schema, not the prompt.

## Never

- Never write to stdout from a stdio server except protocol messages.
- Never expose a raw passthrough of an entire API ("call_endpoint(method, path, body)").
- Never accept or forward tokens that were not issued for this server.
- Never rely on the schema or annotations for security.
- Never ship a destructive tool without a test that proves it refuses unauthorized callers.

## Report format

```
Server: <name>  Transport: <stdio | streamable HTTP>  Auth: <env | OAuth via ...>
Tools: <name> (read-only | writes | destructive), ...
Inspector: tools/list OK, <n>/<n> tools called successfully
Open issues: <anything not tested, spec revision assumptions>
```
