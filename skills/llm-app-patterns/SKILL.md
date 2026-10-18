---
name: llm-app-patterns
description: Engineering patterns for shipping LLM-backed product features in application code, covering schema-validated structured output, timeouts and bounded retries, streaming responses, prompt caching and token budgets, choosing a model tier, defending against prompt injection from untrusted content, and logging each call so it can be evaluated later. Use when wiring a model API call into a backend or app, hardening an existing LLM feature for production, cutting its latency or cost, or handling tool output and user documents that reach the model.
license: MIT
compatibility: Any Agent Skills host. Provider-neutral; applies to any model API or SDK in any backend language.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# LLM app patterns

Treat a model call like any other unreliable network dependency that returns untrusted text. This skill covers the code around the call. For wording the prompt itself, use `prompt-engineering`; for measuring quality, use `llm-evals`; for retrieval pipelines, use `rag-pipeline-patterns`.

## 0. Before you write code

1. Find what the project already uses: search for the provider SDK import, an existing client wrapper, env vars holding API keys, and any logging or tracing of model calls. Extend that; don't add a second client.
2. Write down the feature contract in one or two lines: input, output shape, latency budget, and what the user sees when the model fails.
3. If there is no fallback behaviour for "model unavailable" and the feature is user-facing, **stop and ask the user** what should happen (hide the feature, show an error, use a non-LLM default).

## 1. Structured output

1. Define the output as a schema in code (JSON Schema, Zod, Pydantic, a typed struct). That schema is the source of truth for the prompt, the parser and the tests.
2. Use the provider's native structured output or tool/function calling with that schema when available. Otherwise ask for JSON only and parse strictly.
3. **Always validate** the parsed result against the schema in your code, even when the provider claims to enforce it. Reject unknown enum values and out-of-range numbers.
4. On a validation failure: retry once, sending the validation error back to the model. If it fails again, return the defined fallback. Never pass unvalidated model output to a database write, a shell, a SQL query, an HTML page or another tool.
5. Keep schemas flat and small. Add an explicit "unknown" or `null` option so the model is not forced to invent a value.

## 2. Timeouts, retries and failure

- Set a client timeout on every call. Streaming calls get a time-to-first-token timeout and an overall timeout.
- Check the SDK's own retry behaviour before adding yours. The official OpenAI and Anthropic SDKs already retry connection errors, 408, 409, 429 and 5xx (2 retries by default, configurable with `max_retries`). Wrapping your own retry loop around that multiplies the attempts; either tune the SDK setting or disable it and own the loop.
- Retry only transient failures: timeouts, connection errors, 408, 429, 5xx and provider "overloaded" errors. Use exponential backoff with jitter and honour a `retry-after` header if present. Cap the total at 2 to 3 attempts.
- Don't retry other 4xx errors (bad request, auth, permission, not found, request too large): fix the request instead.
- Put a per-user and global concurrency limit in front of the API so a traffic spike cannot burn the rate limit for everyone.
- If an action has side effects (sending an email, calling a tool that writes), make the retry idempotent or don't retry the step that has the side effect.

## 3. Streaming

- Stream when a human is waiting on long free text. Don't stream when the output must be validated as a whole before use (structured output feeding code).
- Forward chunks to the client as they arrive (SSE or WebSocket), and handle the stream ending early: show partial text as incomplete, never as final.
- Read the final usage and stop reason from the end of the stream and log them. A stop because of the max-token limit means the answer is truncated; treat it as a failure for structured output.
- Cancel the upstream request when the client disconnects so you stop paying for tokens nobody reads.

## 4. Cost and latency

1. Measure first: log input tokens, output tokens, cached tokens and latency per call (section 6). Optimise the call that costs the most, not the one you suspect.
2. **Prompt caching:** put stable content first (system prompt, tool definitions, long reference documents, few-shot examples) and variable content (the user's turn) last. Some providers cache matching prefixes automatically; others need an explicit cache marker on the stable block. Check the provider's docs for the minimum cacheable length and cache lifetime, and confirm hits in the usage fields.
3. Don't put timestamps, request IDs or per-user data at the top of the prompt: they break the cached prefix.
4. Set `max_tokens` (or the provider's equivalent) to what the feature needs, not the model maximum.
5. Trim context: send only the fields the task needs, summarise long histories, and cap retrieved documents.
6. Cache whole responses in your own store only for deterministic, non-personal requests, keyed on model + prompt version + normalised input.
7. Use batch APIs for offline jobs that can wait.

## 5. Model selection

- Start with the most capable model to prove the feature works and to build the eval set, then try a smaller, cheaper or faster tier and keep it only if it passes the same evals.
- Route by task: a small model for classification, extraction and routing; a larger one for multi-step reasoning or long writing.
- Pin an exact model version in config, not a floating alias, so behaviour doesn't change under you. Upgrading the model is a change that must re-run the evals.
- Keep the model name, temperature and max tokens in config next to the prompt version, not scattered through code.

## 6. Prompt injection and untrusted content

Anything the model reads that you did not write is untrusted: user messages, uploaded files, web pages, emails, retrieved documents and tool results.

1. Keep instructions in the system prompt. Put untrusted content in clearly delimited blocks (for example XML-style tags) and say in the instructions that text inside them is data, not instructions.
2. **Assume injection will sometimes succeed** and limit the damage: give the model only the tools the task needs, scope credentials to the current user, and enforce authorisation in your code, never by asking the model to check.
3. Require human confirmation before irreversible or external actions the model proposes (payments, sending messages, deleting data).
4. Never render model output as raw HTML or Markdown that can load remote images or links without sanitising; that is a data-exfiltration path.
5. Don't put secrets in prompts. Assume the system prompt can be extracted.
6. Add injection attempts to the eval set (`llm-evals`) so a prompt change cannot quietly remove a defence.

## 7. Logging for evaluation

Log one record per model call, with the project's normal logger or tracing system:

```
{ request_id, feature, prompt_version, model, params, input_tokens, output_tokens,
  cached_tokens, latency_ms, stop_reason, validation_ok, retry_count, error, user_feedback }
```

- Log full prompts and outputs only where the project's privacy rules allow it. Redact or hash personal data and secrets before storage, and set a retention period. If unsure, **stop and ask the user**.
- Version prompts like code (a constant or file with a version string) and log the version, so a regression can be traced to a change.
- Capture explicit user feedback (thumbs, edits, retries) against the `request_id`. Those records become eval cases.

## Never

- Never trust model output as authorisation, as a safe identifier, or as already validated.
- Never send API keys to a browser or mobile client; call the model from your server.
- Never retry without a cap, or loop on tool calls without a maximum step count.
- Never ship a prompt or model change without re-running the evals.

## Report back

End with: the files changed, the schema and fallback chosen, timeout and retry settings, how caching is arranged, what is logged, and any risk left open (for example "no eval set yet").
