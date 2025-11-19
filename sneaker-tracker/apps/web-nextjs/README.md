# Web (Next.js) — Quickstart

Run the web app locally:

```powershell
cd "c:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker"
pnpm install

cd apps/web-nextjs
# Copy and fill envs
Copy-Item .env.local.example .env.local -Force
# Edit .env.local with your Supabase URL and anon key

# Optional: run preflight checks
pwsh -NoProfile -ExecutionPolicy Bypass -File ..\..\scripts\preflight.ps1 -App web-nextjs

# Start dev server
pnpm run dev
```

Required env vars:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Optional:
- NEXT_PUBLIC_FIREBASE_CONFIG (single-line JSON) if you enable Firebase features.

If envs are missing, the app will render a configuration screen instead of crashing.
