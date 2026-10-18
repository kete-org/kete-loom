# OpenTelemetry setup

Read this when bootstrapping an SDK or a Collector. Package names and flags move between releases: check the language's page under opentelemetry.io/docs/languages/ for the current version before pinning.

## Standard environment variables

| Variable | Example | Notes |
|---|---|---|
| `OTEL_SERVICE_NAME` | `checkout-api` | Same name in every signal |
| `OTEL_RESOURCE_ATTRIBUTES` | `service.version=4f2c1a9,deployment.environment.name=prod` | Comma-separated key=value |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4318` | 4317 gRPC, 4318 HTTP |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | or `grpc` |
| `OTEL_TRACES_SAMPLER` | `parentbased_traceidratio` | |
| `OTEL_TRACES_SAMPLER_ARG` | `0.1` | Ratio for the root sampler |
| `OTEL_PROPAGATORS` | `tracecontext,baggage` | The default |

## Auto-instrumentation by language

- **Java**: attach the agent, `java -javaagent:opentelemetry-javaagent.jar -jar app.jar`.
- **Python**: `pip install opentelemetry-distro opentelemetry-exporter-otlp`, then `opentelemetry-bootstrap -a install`, run with `opentelemetry-instrument python app.py`.
- **Node.js**: `npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node`, start with `node --require @opentelemetry/auto-instrumentations-node/register app.js` (the SDK must load before the app's own imports).
- **.NET**: the `OpenTelemetry.Extensions.Hosting` package plus `OpenTelemetry.Instrumentation.AspNetCore` and `.Http`, registered with `services.AddOpenTelemetry().WithTracing(...).WithMetrics(...)`; or the zero-code automatic instrumentation.
- **Go**: no agent; wire `otelhttp` handlers and transports and the `otel/sdk` trace and metric providers in `main`, and call `Shutdown` on exit so the last spans flush.

Flush on shutdown in every language; short-lived jobs lose their spans otherwise.

## Manual span (pattern)

```python
from opentelemetry import trace
tracer = trace.get_tracer("app.pricing")

with tracer.start_as_current_span("price_quote") as span:
    span.set_attribute("app.quote.items", len(items))
    try:
        quote = compute(items)
    except Exception as exc:
        span.record_exception(exc)
        span.set_status(trace.Status(trace.StatusCode.ERROR))
        raise
```

## Propagating through a queue

Producer: `propagate.inject(headers)` into the message headers. Consumer: `ctx = propagate.extract(headers)` and start the consumer span with that context (as a child, or as a new trace with a span link for batch consumers).

## Minimal Collector config

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
  batch: {}
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow
        type: latency
        latency: { threshold_ms: 1000 }
      - name: baseline
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }
exporters:
  debug: {}
  otlp:
    endpoint: tempo:4317
    tls: { insecure: true }   # only inside a private network
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp]
```

`tail_sampling` ships in the Collector contrib distribution, not core. With several Collector replicas, route by trace ID (the `loadbalancing` exporter) in a first tier so one instance sees the whole trace.
