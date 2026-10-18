---
name: observability
description: OpenTelemetry-first service instrumentation that adds structured JSON logs carrying trace IDs, RED metrics with bounded-cardinality labels and distributed traces (SDK and exporter setup, semantic conventions, W3C traceparent propagation, head and tail sampling), then turns them into SLIs, SLOs, multi-window burn-rate alerts and on-call dashboards in Grafana, Prometheus or a vendor backend. Use when instrumenting a service with OpenTelemetry, traces break across service hops, logs cannot be joined to a request, defining an SLO or error budget, replacing noisy threshold alerts with burn-rate alerts, or building the operational board on-call opens first.
license: MIT
compatibility: Any Agent Skills host. Works with any OpenTelemetry SDK (Java, Python, Go, Node, .NET and others) and any OTLP backend; examples use Prometheus query syntax and Grafana.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: devops
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Observability

Make every request answerable: which one failed, where it spent its time, and whether users are hurting enough to wake someone. Logs, metrics and traces share one resource identity and one trace ID, and alerts fire on user-facing SLO burn, not on CPU.

This skill is for operational telemetry. Business KPI boards belong to `metrics-dashboards`; what the on-call person does once paged belongs to `runbook-writing`.

## 0. Before you start

1. Find what is already there: search for `opentelemetry`, `prometheus`, `statsd`, `datadog`, `newrelic`, `logging.basicConfig`, `winston`, `zap`, `slog`, `logback`. Keep one telemetry stack; do not add a second SDK beside an existing one.
2. Find the backend: an OpenTelemetry Collector, Grafana stack (Tempo, Loki, Mimir or Prometheus), or a vendor. If none exists and the user has not picked one, **stop and ask**; the backend decides exporters and query syntax.
3. List the service's entry points (HTTP routes, queue consumers, cron jobs) and its outbound calls (databases, HTTP clients, queues). These are where spans and metrics go.

## 1. Resource identity

Set these once, through environment variables so every signal shares them:

- `OTEL_SERVICE_NAME` (required; the same name in logs, metrics and traces)
- `OTEL_RESOURCE_ATTRIBUTES=service.version=<git sha or release>,deployment.environment.name=<env>`
- `OTEL_EXPORTER_OTLP_ENDPOINT` pointing at the Collector, not straight at a vendor, so sampling and routing can change without a redeploy.

Per-language SDK bootstrap and Collector config are in `references/otel-setup.md`.

## 2. Traces

1. Prefer the language's auto-instrumentation (HTTP server and client, database drivers, messaging) before writing manual spans.
2. Add manual spans only around meaningful units of work the auto layer cannot see (a pricing calculation, a batch step). Name spans by operation, low cardinality: `GET /orders/{id}`, never `GET /orders/8812`.
3. Use the semantic conventions for attributes (`http.request.method`, `http.route`, `http.response.status_code`, `db.system.name`, `server.address`); custom attributes get your own namespace (`app.order.tier`).
4. Record errors: set span status to error and record the exception on the span that failed.
5. Propagation: W3C `traceparent`/`tracestate` is the default. Check every hop: async queues need the context injected into message headers and extracted in the consumer; thread pools and background tasks need the context carried explicitly.
6. Sampling:
   - Start with `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG` (for example `0.1`) so children follow the root's decision.
   - To keep all errors and slow requests, do tail sampling in the Collector (`tail_sampling` processor), and make sure all spans of a trace reach the same Collector instance.
   - Never sample metrics. Rates come from metrics, not from sampled traces.

## 3. Metrics

1. Per entry point, emit RED: request rate, errors, duration as a histogram (`http.server.request.duration` in seconds from auto-instrumentation, or your own). Per dependency, the same on the client side. Per queue: depth and age of oldest message.
2. Labels must be bounded. Never put user IDs, emails, raw URLs, order IDs or error messages in a label. Use the route template and the status code class.
3. A latency SLI counts requests under the threshold, so the histogram needs a bucket boundary exactly at it. The default OpenTelemetry HTTP buckets are 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10 s: pick an SLO threshold on one of them, or add the boundary with a metrics view (or use exponential histograms if the backend supports them).
4. Add saturation for whatever runs out first: connection pool in use, worker queue, memory against limit.

## 4. Logs

1. Structured JSON, one event per line, to stdout. Fields: `timestamp`, `severity`, `message`, `service.name`, `trace_id`, `span_id`, plus event fields.
2. Inject `trace_id`/`span_id` with the SDK's log bridge or logging instrumentation, so a log line links to its trace.
3. Log events, not narration: one line per failed operation with its cause and inputs that are safe to log. Never log secrets, tokens, passwords, full card numbers or request bodies containing personal data; redact at the logger, not at query time.
4. Default level INFO in production; DEBUG behind a runtime switch.

## 5. SLIs and SLOs

1. Pick 1 to 3 SLIs per user journey, each a ratio of good events to valid events:
   - Availability: non-5xx responses / all responses (decide whether 429 and 4xx count; write it down).
   - Latency: requests faster than the threshold / all requests, measured at the edge closest to the user you can instrument.
2. Set the SLO target with the owner (for example 99.9% over 28 or 30 days). **Stop and ask** if no one owns the number; never invent a target.
3. Error budget = 1 − target. Write the SLO as a file in the repo (definition, query, window, owner, what happens when the budget is spent).

## 6. Burn-rate alerts

Page on how fast the budget burns, using a long and a short window together so alerts fire fast and reset fast. The standard pairs for a 30-day SLO (from the Google SRE Workbook):

| Severity | Long window | Short window | Burn rate | Budget spent at trigger |
|---|---|---|---|---|
| Page | 1h | 5m | 14.4 | 2% |
| Page | 6h | 30m | 6 | 5% |
| Ticket | 3d | 6h | 1 | 10% |

Query templates (Prometheus recording rules and alert rules) are in `references/slo-alerts.md`.

Alert rules:

- Every paging alert links to a runbook and a dashboard.
- Remove or demote cause-based alerts (CPU, memory, single pod restart) to tickets unless they predict an SLO breach no other alert catches.
- Low-traffic services: burn-rate alerts flap on few requests; add a minimum request count or use synthetic probes.

## 7. On-call dashboard

One board per service, top to bottom:

1. SLO status and remaining error budget, with the burn rate.
2. RED for the entry points: rate, error ratio, p50/p95/p99 latency.
3. Dependencies: the same RED, client side, per dependency.
4. Saturation: pools, queues, memory and CPU against limits.
5. Deploy and feature-flag annotations on every time series.
6. Links: logs filtered to the service, trace search, runbook.

Use template variables for environment and instance; keep it under about 20 panels. Panel and query guidance is in `references/slo-alerts.md`.

## 8. Verify

1. Run the service locally or in a test environment with the Collector's `debug` exporter (or the backend) and send a request.
2. Confirm: one trace spans every hop, including through a queue; the log line for that request carries the same `trace_id`; the RED metrics appear with only bounded labels.
3. Evaluate each alert expression against recent data and check it would not have fired continuously.

## Never

- Never put unbounded values in metric labels or span names.
- Never log secrets or personal data, or ship telemetry to a third party the user has not approved.
- Never page on a symptom with no user impact and no runbook.
- Never set an SLO target without an owner agreeing to it.

## Report back

```
## Observability: <service>
Instrumented: <entry points, dependencies, signals>
Resource: service.name=<>, version source, environment
Sampling: <head ratio, tail policy>
SLOs: <SLI, target, window> per journey
Alerts: <name, windows, burn rate, runbook link>
Dashboard: <file or URL>
Verified: <trace across hops yes/no, logs joined yes/no, alert dry run>
Open questions: <owner, targets, backend>
```
