# 🚀 Live Shoe Tracker - Complete Setup Guide

## PowerShell Commands Cheat Sheet

### Setting Environment Variables in PowerShell

**❌ WRONG (Bash/Linux syntax):**
```bash
VARIABLE=value
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
```

**✅ CORRECT (PowerShell syntax):**
```powershell
$env:VARIABLE = "value"
$env:NEXT_PUBLIC_SUPABASE_URL = "http://localhost:8000"
```

## Quick Start (One Command)

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker
pwsh -ExecutionPolicy Bypass -File .\START-TRACKER.ps1
```

### Optional Flags:
- `-RunScraper` — Fetch fresh data before starting
- `-ScraperLimit 100` — Number of items to scrape (default: 50)
- `-SkipInstall` — Skip `pnpm install` if already done
- `-OnlyFrontend` — Start UI only (skip scraper/sync)

## Manual Setup Steps

### 1. Configure Environment

**Frontend env** (`apps/web-nextjs/.env.local`):
```env
# Firebase (already configured)
NEXT_PUBLIC_FIREBASE_CONFIG={"projectId":"live-sneaker-release-tra-df5a4",...}

# Supabase Cloud
NEXT_PUBLIC_SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-side only (for API routes)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Install Dependencies

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs
pnpm install
```

### 3. Start Frontend

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs
pnpm run dev
# OR
npx next dev -p 3002
```

**Access the app:**
- Main dashboard: http://localhost:3002
- **Unified view:** http://localhost:3002/unified-dashboard ⭐
- Live releases: http://localhost:3002/live-releases
- API test: http://localhost:3002/api/releases?limit=5

### 4. Run Scrapers (Populate Data)

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python

# Set Firebase credentials
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json' -Raw

# Run scraper (all brands, 50 items)
python soleretriever_scraper_firebase.py --collection all --limit 50

# OR specific brand
python soleretriever_scraper_firebase.py --collection nike --limit 100
```

### 5. Sync to Postgres (Optional)

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\scripts
pwsh -NoProfile -ExecutionPolicy Bypass -File .\run_sync.ps1 -Once -SupabaseUrl "https://npvqqzuofwojhbdlozgh.supabase.co"
```

## Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│  Scrapers   │─────>│  Firestore   │<────>│  Frontend  │
│  (Python)   │      │  (Primary)   │      │  (Next.js) │
└─────────────┘      └──────────────┘      └────────────┘
                            │                      │
                            │ sync                 │ API route
                            v                      v
                     ┌──────────────┐      ┌────────────┐
                     │  Postgres    │<─────│  Supabase  │
                     │  (Analytics) │      │  (Cloud)   │
                     └──────────────┘      └────────────┘
```

### Data Flow:
1. **Scrapers** → Write to Firestore `sneakers_canonical` (real-time)
2. **Frontend** → Reads Firestore live (onSnapshot) for instant updates
3. **Sync script** → Copies Firestore → Postgres (hourly/on-demand)
4. **API route** → Secure server-side Postgres reads (RLS-enabled)
5. **Unified page** → Merges Firestore + Postgres, deduped by URL

## Features Implemented

### ✅ Unified Dashboard (`/unified-dashboard`)
- **Real-time Firestore** + **SQL Postgres** in one view
- Deduplicated by URL (Firestore takes priority for freshness)
- Sorted by `scraped_at` (newest first)

### ✅ Quick Filters
- **Source toggles:** Show/hide Firestore or Postgres
- **Brand chips:** Click to multi-select brands
- **Status chips:** Filter by Live, Upcoming, Sold Out, etc.
- **Search box:** Instant filter by title, brand, or SKU

### ✅ URL-Synced Filters
- Filters persist in URL query params
- Shareable links with pre-applied filters
- Example: `/unified-dashboard?brands=Nike,Adidas&statuses=Live&q=Dunk`

### ✅ Infinite Scroll
- Auto-loads more Postgres results as you scroll
- Smooth pagination (50 items/page)
- "Loading more..." indicator

### ✅ Secure API Route (`/api/releases`)
- Server-side Postgres reads using service role key
- RLS-enabled (no client exposure of admin credentials)
- Query params: `limit`, `offset`, `brand`, `status`, `search`

## Troubleshooting

### Port Conflicts
**Error:** `Port 3002 is in use`
```powershell
# Find and kill process
$pid = (Get-NetTCPConnection -LocalPort 3002).OwningProcess
Stop-Process -Id $pid -Force
```

### "Missing Firebase config"
**Fix:** Check `.env.local` has valid `NEXT_PUBLIC_FIREBASE_CONFIG` JSON (no line breaks)

### "Failed to load from Supabase"
**Fix:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` (server-side env)

### PowerShell Execution Policy
**Error:** `cannot be loaded because running scripts is disabled`
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

## Comparison: Live Shoe Tracker vs. SolySavy

| Feature                          | SolySavy         | Live Shoe Tracker |
|----------------------------------|------------------|-------------------|
| Real-time Firestore updates      | ❌               | ✅                |
| SQL analytics (Postgres)         | ❌               | ✅                |
| Unified Firestore + SQL view     | ❌               | ✅                |
| URL-shareable filters            | ❌               | ✅                |
| Infinite scroll                  | ❌               | ✅                |
| Brand/status chips               | Limited          | ✅ Full           |
| Multi-source deduplication       | ❌               | ✅                |
| Secure API routes (RLS)          | ❌               | ✅                |
| Custom scrapers                  | ❌               | ✅ Python         |

## Next Steps

### Production Checklist
- [ ] Enable RLS policies on `soleretriever_data` table
- [ ] Add authentication (Firebase Auth + Supabase RLS)
- [ ] Deploy to Vercel (frontend) + Supabase cloud (DB)
- [ ] Schedule hourly sync via cron/GitHub Actions
- [ ] Add Google Analytics event tracking
- [ ] Implement email/SMS alerts for drops

### Future Features
- [ ] Price drop alerts
- [ ] Retailer availability map
- [ ] Resale price tracking
- [ ] Mileage tracker integration
- [ ] Mobile app (React Native)

## Support

**Issues?** Check:
1. `apps/web-nextjs/.env.local` exists and has all keys
2. Firebase service account JSON is valid
3. Ports 3002 (frontend) and 3000/8000 (Supabase) are free
4. Node version >= 18 (`node --version`)
5. pnpm installed (`pnpm --version`)

**Still stuck?** Review terminal output and check logs in `apps/web-nextjs/.next/server/app/pages/api/releases.js`

---

**Built with:** Next.js 14, React 18, Firebase, Supabase, PostgreSQL, Python
**License:** MIT
