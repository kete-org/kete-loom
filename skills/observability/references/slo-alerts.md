# SLO queries, burn-rate alerts and dashboard panels

Read this when writing recording rules, alert rules or dashboard queries. Metric names below assume OpenTelemetry HTTP server metrics exported to Prometheus (`http_server_request_duration_seconds_*`); rename to what the service actually exposes. When OTLP metrics reach Prometheus, `service.name` becomes the `job` label (`<service.namespace>/<service.name>` if a namespace is set) and `service.instance.id` becomes `instance`; resource attributes are not copied to labels unless the exporter is configured to (for example `resource_to_telemetry_conversion` or `target_info` joins). Check the real label names in the backend before writing rules.

## Recording rules (availability SLI)

```yaml
groups:
  - name: slo-checkout
    rules:
      - record: slo:errors:ratio_rate5m
        expr: |
          sum(rate(http_server_request_duration_seconds_count{job="checkout-api",http_response_status_code=~"5.."}[5m]))
          /
          sum(rate(http_server_request_duration_seconds_count{job="checkout-api"}[5m]))
      # repeat with [30m], [1h], [6h], [3d] and [30d] as slo:errors:ratio_rate30m, ... (the 30d one feeds the budget panel)
```

Latency SLI (good = faster than 0.25 s; the `le` value must be an existing bucket boundary, an approximate one silently measures a different threshold):

```
1 - (
  sum(rate(http_server_request_duration_seconds_bucket{job="checkout-api",le="0.25"}[5m]))
  /
  sum(rate(http_server_request_duration_seconds_count{job="checkout-api"}[5m]))
)
```

## Multi-window burn-rate alerts (SLO 99.9%, budget 0.001)

```yaml
      - alert: CheckoutErrorBudgetBurnFast
        expr: |
          slo:errors:ratio_rate1h > (14.4 * 0.001)
          and
          slo:errors:ratio_rate5m > (14.4 * 0.001)
        labels: { severity: page }
        annotations:
          summary: "checkout-api burning error budget 14x"
          runbook_url: "https://<runbooks>/checkout-api/error-budget"
          dashboard: "https://<grafana>/d/checkout-api"
      - alert: CheckoutErrorBudgetBurnMedium
        expr: |
          slo:errors:ratio_rate6h > (6 * 0.001)
          and
          slo:errors:ratio_rate30m > (6 * 0.001)
        labels: { severity: page }
      - alert: CheckoutErrorBudgetBurnSlow
        expr: |
          slo:errors:ratio_rate3d > (1 * 0.001)
          and
          slo:errors:ratio_rate6h > (1 * 0.001)
        labels: { severity: ticket }
```

Burn rate = observed error ratio / error budget. A burn rate of 1 spends exactly the budget over the SLO window. Tools such as Sloth or Pyrra generate these rules from a short SLO spec; use one if the team already does.

## Dashboard panels (Grafana)

| Panel | Query sketch | Visual |
|---|---|---|
| Error budget remaining | `1 - (slo:errors:ratio_rate30d / 0.001)` | Stat, red under 25% |
| Burn rate 1h | `slo:errors:ratio_rate1h / 0.001` | Stat with thresholds 1, 6, 14.4 |
| Request rate | `sum by (http_route) (rate(..._count[5m]))` | Time series |
| Error ratio | `sum by (http_route) (rate(..._count{http_response_status_code=~"5.."}[5m])) / sum by (http_route) (rate(..._count[5m]))` | Time series |
| Latency p95/p99 | `histogram_quantile(0.99, sum by (le) (rate(..._bucket[5m])))` | Time series |
| Dependency latency | same on `http_client_request_duration_seconds` by `server_address` | Time series |
| Saturation | pool in use / pool max, queue depth | Time series with limit line |

Add annotations from the deploy pipeline (Grafana annotations API or a `deployments` metric), and data links from latency panels to the trace backend filtered by service and time range. Keep dashboards as JSON in the repo, provisioned from files, so changes are reviewed.
