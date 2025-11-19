# Monitoring & Alerting Setup

This directory adds local observability components for the Sneaker Tracker stack.

## Components
- **Prometheus**: Scrapes API metrics (`/api/metrics`) and runs alert rules.
- **Blackbox Exporter**: Probes readiness & health endpoints via HTTP.
- **VictoriaMetrics (optional)**: Long-term TSDB storage (can replace Prometheus TSDB for scale).
- **Grafana (optional)**: Dashboards and visualization.

## Endpoints (Local)
- Prometheus UI: http://localhost:9090
- Blackbox Exporter: http://localhost:9115
- VictoriaMetrics UI / API: http://localhost:8428
- Grafana: http://localhost:3001 (login admin / admin)

## API Targets (Remote)
Currently scraping deployed API at:
```
https://sneaker-tracker-api.vercel.app/api/metrics
https://sneaker-tracker-api.vercel.app/api/health/ready
https://sneaker-tracker-api.vercel.app/api/health/details
```

## Run
```powershell
cd sneaker-tracker/infra
docker compose up -d prometheus blackbox-exporter grafana victoria-metrics
```
(You can omit `victoria-metrics` or `grafana` if not needed.)

## Alert Rules
Located in `prometheus/alerts.yml`:
- `ApiHighErrorRate`: >5% 5xx errors for 10m
- `ApiLatencyP95High`: P95 latency >1.5s for 5m
- `ApiReadinessFailing`: Readiness endpoint failing for 5m

## Adding More Targets
Edit `prometheus/prometheus.yml`:
- Append additional domains under `static_configs` for `api-metrics` or `blackbox-api` jobs.

## Adding Dashboards (Grafana)
1. Open Grafana -> Connections -> Add Prometheus at `http://prometheus:9090`.
2. Import community dashboard IDs (e.g., 3662 for Prometheus Stats).

## Remote Storage (VictoriaMetrics)
Configure Prometheus remote_write:
```yaml
remote_write:
  - url: http://victoria-metrics:8428/api/v1/write
```
Add that block under `global:` in `prometheus.yml` as needed.

## Production Considerations
- Use managed Prometheus/VictoriaMetrics or Axiom/Datadog in production.
- Secure endpoints behind auth / private network or add IP allow-list.
- Add SLO alerts (availability & latency) once baseline metrics collected.

## Tear Down
```powershell
docker compose down -v
```
This removes containers and volumes.

## Next Enhancements
- Add log aggregation (e.g., Loki or OpenTelemetry collector).
- Expose custom business metrics (e.g., release ingestion lag).
- Add synthetic test flows (purchase simulation). 
