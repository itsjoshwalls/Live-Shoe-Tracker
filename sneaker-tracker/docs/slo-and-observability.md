# SLOs & Observability — Live Shoe Tracker

This document defines SLIs/SLOs, monitoring, and alerting for core user journeys.

## Service Level Indicators (SLIs)
- Dashboard TTI: Time-to-Interactive for unified dashboard (client-visible) — P95.
- Read Latency: API `/api/releases` server processing time — P95.
- API Error Rate: Percentage of 5xx responses on `/api/releases`.
- Feed Freshness: Age of newest canonical item vs. current time.
- Ingestion Success: Percentage of ingestion jobs that complete without error.
- Data Correctness: Percentage of rows passing canonical validation (ISO dates, IDs, required fields).

## Service Level Objectives (SLOs)
- Dashboard TTI (P95): ≤ 2.5s (desktop), ≤ 3.0s (mobile).
- Read Latency (P95): ≤ 300ms (local), ≤ 600ms (prod).
- API Error Rate: ≤ 1% 5xx over rolling 1h.
- Feed Freshness: ≤ 10 minutes average lag; ≤ 20 minutes P95.
- Ingestion Success: ≥ 98% daily.
- Data Correctness: ≥ 99% valid rows per ingestion batch.

## Measurement
- Client: GA4 custom timings (TTI), Web Vitals, and client error events.
- Server/API: Supabase logs, route-level timing, and 5xx counts; append request IDs.
- Ingestion: Worker logs + job counters (success/failure), error topics.
- Feed Freshness: Periodic query of canonical table’s `updated_at`/`release_date`.

## Monitoring & Alerts
- Alerts (Pager/Email/Slack):
  - API 5xx > 1% for 15 minutes.
  - Read latency P95 > SLO for 15 minutes.
  - Feed freshness P95 > 20 minutes for 20 minutes.
  - Ingestion success < 98% daily.
- Dashboards:
  - API latency/error panels, request throughput, top errors.
  - Ingestion job counts, failure reasons, retry rates.
  - Freshness time series and distribution.

## Implementation Notes
- Add basic timing to `/pages/api/releases.ts` and log to Supabase.
- Emit GA4 events for dashboard TTI and filter interactions.
- Tag logs with `env`, `service`, `request_id`.
- Protect PII: ensure logs contain no secrets or user data.

## Runbooks (Pointers)
- Key rotation: see `docs/SECURITY/key-rotation-runbook.md`.
- IAM roles: see `docs/SECURITY/iam-bindings.md`.
- Incident response: capture summary, timeline, impact, and follow-ups.
