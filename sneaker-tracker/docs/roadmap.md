# Live Shoe Tracker — Product Roadmap

This roadmap translates the competitive audit and recent implementation work into concrete milestones. Each milestone lists scope, dependencies, and success metrics. Dates are placeholders; update during planning.

## Milestone A — MVP Hardening (Weeks 1–2)
- Scope: Stabilize unified dashboard, resolve remaining API key issues, ensure smooth dev startup, and align Node to 20.x LTS.
- Deliverables:
  - Confirm `/api/releases` works with valid Supabase keys; document setup in README-ENV.
  - Add RLS policies for tables used by dashboard (read-only for anon, elevated for service role).
  - Dev ergonomics: dedicated start scripts, consistent ports, and cache-clear steps.
- Dependencies: Supabase local stack, `.env.local` correctness, Firebase client config.
- Success metrics: P95 dashboard TTI < 2.5s, API 5xx < 1%, feed freshness < 10m.

## Milestone B — Data Quality & Canonicalization (Weeks 2–4)
- Scope: Improve ingestion normalization/deduping to canonical records and handle date/ID formats.
- Deliverables:
  - Validate ISO date parsing in ingestion; add tests for new formats.
  - Enforce canonical IDs (e.g., `sku::ABC123`) end-to-end.
  - Backfill scripts to migrate historical data into canonical tables.
- Dependencies: `scripts/ingest.py`, migrations in `packages/supabase-migrations`.
- Success metrics: <1% duplicate rate, >99% valid ISO dates, ingestion error rate < 2%.

## Milestone C — Personalization & Notifications (Weeks 4–6)
- Scope: Quick filters, saved views, and notifications for tracked shoes.
- Deliverables:
  - Saved filters with URL + user profile persistence.
  - Email/Push/Webhook notification options (begin with email + webhook).
  - Digest summary (daily/weekly) with interested releases.
- Dependencies: Auth, background job runner, email provider.
- Success metrics: Subscribed users > 20% of MAU, CTR > 8% on notifications.

## Milestone D — Desktop + Offline Polish (Weeks 6–8)
- Scope: Electron enhancements; local cache for poor connectivity; basic offline search.
- Deliverables:
  - Local IndexedDB/SQLite caching; sync on reconnect.
  - Graceful offline UI + queued actions.
- Dependencies: `apps/desktop-electron`, shared data layer.
- Success metrics: Crash-free sessions > 99.5%, PWA-like UX for desktop.

## Milestone E — Security & Compliance (Weeks 8–9)
- Scope: Tighten secrets, IAM, audit logs, and rotation.
- Deliverables:
  - IAM bindings doc + key rotation runbook (completed in this commit).
  - RLS coverage verified; least-privilege service roles.
  - Automated secret rotation reminders.
- Dependencies: Supabase/Firebase IAM, CI secrets.
- Success metrics: 0 leaked secrets in repo, quarterly rotation performed.

## Milestone F — Growth & Performance (Weeks 9–12)
- Scope: Marketing pages, SEO, performance tuning, and analytics funnels.
- Deliverables:
  - Landing page variants; Lighthouse > 90 perf.
  - GA4 funnels for discovery → tracking → conversion.
  - API pagination and result caching improvements.
- Success metrics: +30% organic traffic, conversion uplift ≥ 10%.

## Near-Term Action Items (Next 3–5 days)
- Align to Node 20.x LTS; document install in quick-start.
- Verify Supabase local keys; fix `/api/releases` 500 by supplying valid service role key.
- Add basic RLS to tables used on the dashboard.
- Create smoke tests for ingestion ISO date parsing and canonical ID rules.
- Confirm dev startup from `apps/web-nextjs` with stable port.
