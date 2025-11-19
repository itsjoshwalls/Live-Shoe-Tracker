# Key Rotation Runbook — Live Shoe Tracker

This runbook standardizes rotation for Supabase, Firebase, and analytics keys. Target duration: ≤ 30 minutes, zero user-visible downtime.

## Scope
- Supabase: anon key (client), service role key (server), JWT secret if applicable.
- Firebase: service account JSON key.
- Analytics: GA4 measurement keys if needed.

## Preconditions
- Ensure you have admin access to Supabase project and Firebase console.
- Confirm you can update CI secrets and deployment environments.

## Rotation Steps — Supabase
1) Generate new keys in Supabase dashboard
- Create/regenerate `anon` and `service_role` keys (do not delete old yet).
2) Update server environments first (service key)
- Next.js API/servers: update `SUPABASE_SERVICE_ROLE_KEY`.
- CI: update secrets for deploy/build workflows.
3) Update client environments (anon key)
- Next.js: update `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_URL` if changed.
4) Deploy and validate
- Roll all services using new keys.
- Verify `/api/releases` responds 200 and client reads work.
5) Revoke old keys
- After validation, revoke previous keys in Supabase dashboard.

## Rotation Steps — Firebase
1) Create new service account key
- Firebase Console → IAM → Service Accounts → Create key (JSON).
2) Update environments
- Server/worker: set `FIREBASE_SERVICE_ACCOUNT` to new JSON string.
- Local dev: update `.env.local`.
3) Validate
- Run ingestion scripts; verify Firestore reads/writes succeed.
4) Revoke old key
- Delete the previous key from the service account.

## Validation Checklist
- Next.js dashboard loads and filters operate.
- `/api/releases` has <1% 5xx and P95 latency within SLOs.
- Ingestion jobs complete ≥98%.
- No errors indicating invalid JWT or JWS signature.

## Rollback Plan
- Keep old keys available until validation completes.
- If failure occurs, restore old keys in env/CI and redeploy.

## Communication
- Post change summary with timestamps, affected services, and validation status in team channel.

## PowerShell Snippets (Windows)
- Update local `.env.local` values:
```powershell
# Example: set in current session only
$env:NEXT_PUBLIC_SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "NEW_ANON_KEY"
$env:SUPABASE_SERVICE_ROLE_KEY = "NEW_SERVICE_ROLE_KEY"
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\new-service-account.json' -Raw
```
- Restart dev services after changes:
```powershell
# From repo root
Push-Location "sneaker-tracker\apps\web-nextjs"; pnpm run dev; Pop-Location
```

## Notes
- Never expose `service_role` in client code or public repos.
- Use separate dev/staging/prod keys.
