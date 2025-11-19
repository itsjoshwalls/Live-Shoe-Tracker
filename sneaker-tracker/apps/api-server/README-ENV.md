# Environment variables for `apps/api-server`

Use a Supabase *service role* key for any server-side operations that require elevated privileges (migrations, direct SQL, admin tasks). Never commit the service role key to source control — add it to your CI/hosting provider's secret store.

Required env vars (example in `.env.example`):

- `SUPABASE_URL` — your Supabase project URL (e.g. `https://abc123.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only** service role key. Use this for production servers. If not available, `SUPABASE_ANON_KEY` can be used for local dev but is less secure.
- `SUPABASE_ANON_KEY` — public anon key (used by the web client). Not recommended for server-side writes in production.
- `PORT` — port the API server will listen on (default 3000). Use a non-3000 port locally if running Next.js dev on 3000.

Local development tips:

1. Copy `.env.example` to `.env` in `apps/api-server/` and fill in values.
2. For local development you can reuse the anon key but do not deploy servers with the anon key.
3. In CI or production, add `SUPABASE_SERVICE_ROLE_KEY` to environment secrets and do not expose it to client code.
