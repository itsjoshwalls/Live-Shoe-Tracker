# IAM Bindings — Live Shoe Tracker

Principle of least privilege across Supabase, Firebase, and CI.

## Supabase (Postgres Roles & RLS)
- Roles:
  - `anon`: Read-only with RLS; can select from public views/tables allowed by policies.
  - `authenticated`: Same as `anon` plus user-specific tables/rows via RLS.
  - `service_role`: Elevated for server-side tasks (bypass RLS). Store only in server env.
- Policies (high level):
  - Public read: Allow `anon` select on canonical release view/table with non-sensitive fields.
  - User data: `authenticated` can select/update only rows where `user_id = auth.uid()`.
  - Admin tasks: Use `service_role` in API server/background workers only.
- Migrations:
  - Keep policies in `packages/supabase-migrations`; review PRs for any `bypassrls` use.

## Firebase (Firestore)
- Service accounts:
  - Ingestion/worker: Use a dedicated service account with only required Firestore access (read/write to source/canonical collections).
  - Frontend client: Uses client SDK config; reads restricted to allowed collections via security rules.
- Rules:
  - Restrict writes from clients; prefer server-side writes.
  - Validate fields (types, ranges) where possible.

## GitHub Actions / CI
- Secrets stored in repo/environment secrets:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
  - `FIREBASE_SERVICE_ACCOUNT` (JSON string)
  - `VITE_FIREBASE_CONFIG_JSON` (client config)
  - Analytics keys as needed
- Access:
  - Limit secrets to environments (dev/staging/prod) and required workflows.
  - Rotate per runbook; audit last used timestamps if supported.

## Local Development
- `.env.local` (never commit):
  - Next.js: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GA_MEASUREMENT_ID`.
  - Firebase scripts: `FIREBASE_SERVICE_ACCOUNT` (JSON string), `VITE_FIREBASE_CONFIG_JSON`.
- Guardrails:
  - Do not load `service_role` key in browser code.
  - Use separate dev keys; never reuse prod in dev.

## Reviews & Audits
- PR checklist:
  - No secrets in diffs/logs.
  - RLS policy changes reviewed by 2 maintainers.
  - Server-only keys referenced only in server code or CI.
- Quarterly review:
  - Rotate keys, validate RLS coverage, verify least-privilege access.
