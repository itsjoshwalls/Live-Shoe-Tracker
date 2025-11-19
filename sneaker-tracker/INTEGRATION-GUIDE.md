# Integration Setup Guide

Complete guide to connecting Firebase, Supabase, Google Analytics, GitHub, and Docker to your local development environment.

## Quick Start

```powershell
# Run the automated setup script
.\setup-integrations.ps1

# Start all services
.\start-dev.ps1
```

## Manual Setup

### 1. Supabase (Database)

**Dashboard**: https://supabase.com/dashboard/project/npvqqzuofwojhbdlozgh

**Environment Variables**:
```powershell
$env:SUPABASE_URL = "https://npvqqzuofwojhbdlozgh.supabase.co"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdnFxenVvZndvamhiZGxvemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNzk2MTQsImV4cCI6MjA3ODY1NTYxNH0.4FjKNA85WkaF6K_9lj9L2-hnAsIDxz1dR_h1OMqyg8E"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdnFxenVvZndvamhiZGxvemdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA3OTYxNCwiZXhwIjoyMDc4NjU1NjE0fQ.X-NWR22vzkXbGl5GNBdFYQF47Y2r7B8Tz1J2rgH_kmk"
```

**Tables**:
- `raffles` - Raffle calendar entries
- `news_articles` - Sneaker news aggregation
- `price_points` - Resale pricing data
- `shoe_releases` - Release calendar

**SQL Editor**: https://supabase.com/dashboard/project/npvqqzuofwojhbdlozgh/sql

### 2. Firebase (Auth & Firestore)

**Console**: https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4

**Client Config** (Next.js/Vite):
```powershell
$env:NEXT_PUBLIC_FIREBASE_CONFIG = '{"projectId":"live-sneaker-release-tra-df5a4","apiKey":"AIzaSyCwGR3zbZ5d7IADy8mfXGK6nXKV2qftLU8","authDomain":"live-sneaker-release-tra-df5a4.firebaseapp.com","storageBucket":"live-sneaker-release-tra-df5a4.firebasestorage.app","messagingSenderId":"502208285918","appId":"1:502208285918:web:ffa300e2d11831fd9e464f","measurementId":"G-MBQ55CK0BJ"}'
```

**Service Account** (Scrapers/Backend):
1. Go to: https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Save as `firebase-service-account.json`
4. Set environment variable:
```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'firebase-service-account.json' -Raw
```

**Firestore Collections**:
- `sneakers` - Raw scraped product data
- `sneakers_canonical` - Normalized/deduplicated releases

### 3. Google Analytics

**Property**: Live Shoe Tracker
**Dashboard**: https://analytics.google.com/

```powershell
$env:NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-MBQ55CK0BJ"
$env:GA_API_SECRET = "0M7G1M1fRkmGl3LLVdFhgA"
```

**Events tracked**:
- Page views
- Product clicks
- Raffle entries
- Search queries

### 4. GitHub

**Initialize repository**:
```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/live-shoe-tracker.git
git push -u origin main
```

**GitHub Secrets** (for CI/CD):
Navigate to: https://github.com/YOUR_USERNAME/live-shoe-tracker/settings/secrets/actions

Add these secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_CLIENT_CONFIG`
- `FIREBASE_SERVICE_ACCOUNT`
- `GA_MEASUREMENT_ID`
- `VERCEL_TOKEN` (for deployment)
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 5. Docker

**Install**: https://www.docker.com/products/docker-desktop

**Start services**:
```powershell
cd infra
docker-compose up -d
```

**View logs**:
```powershell
docker-compose logs -f raffles-scraper
docker-compose logs -f news-aggregator
```

**Stop services**:
```powershell
docker-compose down
```

**Rebuild after code changes**:
```powershell
docker-compose up -d --build
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js Web App                │
│            (localhost:3002 / Vercel)            │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│   Supabase   │          │   Firebase   │
│  (Database)  │          │ (Auth/Store) │
└──────────────┘          └──────────────┘
        ▲                         ▲
        │                         │
        └─────────┬───────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│   Docker     │      │    GitHub    │
│  Scrapers    │      │   Actions    │
└──────────────┘      └──────────────┘
```

## Data Flow

1. **Scrapers** (Docker containers) → Collect data from retailers
2. **Firebase** → Store raw product data
3. **Supabase** → Store canonical releases, raffles, news, pricing
4. **Next.js** → Fetch from Supabase & Firebase for display
5. **Google Analytics** → Track user interactions
6. **GitHub Actions** → CI/CD pipeline for deployment

## Environment Files

### Root `.env`
Master configuration file with all integrations

### `apps/web-nextjs/.env.local`
Next.js-specific configuration (client-side safe vars)

### `apps/api-server/.env`
API server configuration (server-side only)

### `infra/.env`
Docker Compose environment variables

### `packages/scrapers/python/.env`
Python scraper configuration

## Troubleshooting

### Supabase connection fails
- Verify URL and keys are correct
- Check RLS policies in Supabase dashboard
- Ensure tables exist (run migrations)

### Firebase authentication issues
- Verify service account JSON is valid
- Check Firebase project permissions
- Ensure Firestore is enabled

### Docker containers not starting
- Check Docker Desktop is running
- Verify `.env` file exists in `infra/`
- Review logs: `docker-compose logs SERVICE_NAME`

### Next.js build errors
- Clear `.next` folder: `Remove-Item -Recurse .next`
- Reinstall dependencies: `npm ci`
- Check all required env vars are set

## Testing Integrations

### Test Supabase
```powershell
cd packages/scrapers/python
python -c "from supabase import create_client; client = create_client('$env:SUPABASE_URL', '$env:SUPABASE_SERVICE_ROLE_KEY'); print(client.table('raffles').select('*').limit(1).execute())"
```

### Test Firebase
```powershell
cd shoe-tracker
python scripts/seed_firestore.py --limit 5
```

### Test Docker
```powershell
cd infra
docker-compose up raffles-scraper
# Watch for "Upserted X raffles" message
```

### Test Next.js
```powershell
cd apps/web-nextjs
npm run dev
# Visit http://localhost:3002/raffles
```

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Docker Docs**: https://docs.docker.com
- **Next.js Docs**: https://nextjs.org/docs
