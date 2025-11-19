# Live Shoe Tracker - Clean Repository Structure

**Last Updated:** November 18, 2025  
**Status:** Production-ready workspace with 3 active projects

## 📁 Top-Level Structure

```
Live-Shoe-Tracker/
├── 📦 shoe-tracker/          # Firebase + Vite prototype
├── 📦 sneaker-tracker/       # Production monorepo (Next.js + API + Electron)
├── 📦 scrapers/              # Legacy standalone scrapers (2,588 files - consider archiving)
├── 📂 scripts/               # Cross-project automation
├── 📂 docs/                  # Consolidated documentation hub
├── 📄 README.md              # Main project overview
├── 📄 SETUP-GUIDE.md         # Primary setup instructions
├── 📄 QUICK-START.md         # Fast-track setup
├── 📄 DEPLOYMENT-CHECKLIST.md # Production deployment
└── 📄 .github/copilot-instructions.md # AI agent guidance
```

## 🎯 Active Projects

### 1. `shoe-tracker/` - Firebase Prototype

**Purpose:** Lightweight Firestore + Vite frontend with Python scrapers

**Key Components:**
- **Frontend:** Vite + React (port 5175)
- **Database:** Firebase Firestore (via `sneakers` and `sneakers_canonical` collections)
- **Scrapers:**
  - `scripts/shopify_scraper.py` - 36 Shopify stores
  - `scripts/playwright_monitor/monitor.js` - 12 release calendars
  - `scripts/ingest.py` - Data normalization pipeline

**Environment:**
- `VITE_FIREBASE_CONFIG_JSON` - Client config (stringified JSON)
- `FIREBASE_SERVICE_ACCOUNT` - Service account for Python (stringified JSON)

**Key Scripts:**
```powershell
npm run dev          # Start Vite dev server
npm run monitor      # Run Playwright scraper
python scripts/ingest.py --source sneakers --dest sneakers_canonical
```

### 2. `sneaker-tracker/` - Production Monorepo

**Purpose:** Full-stack production platform with web, desktop, API, and data pipelines

**Apps:**
```
apps/
├── web-nextjs/       # Next.js 14 frontend (port 3002)
├── api-server/       # Express API (port 4000)
└── desktop-electron/ # Offline-capable Electron app
```

**Packages:**
```
packages/
├── scrapers/         # Python (Playwright) + Node.js scrapers
│   ├── python/       # Boutique store scrapers (8 stores)
│   │   ├── raffles/scraper-worker.py
│   │   ├── news_aggregator.py
│   │   └── stockx_integration.py
│   ├── node/         # Large retailer scrapers
│   └── tools/        # Import utilities
├── supabase-migrations/ # SQL schema & migrations
├── firebase-functions/  # Cloud Functions (alerts, triggers)
└── ml/                  # Demand forecasting (optional)
```

**Databases:**
- **Supabase (Primary):** `raffles`, `news_articles`, `price_points`
- **Firebase (Secondary):** Real-time updates, auth

**Environment:**
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` - Production Postgres
- `FIREBASE_SERVICE_ACCOUNT` - Cloud Functions + scrapers
- `GOOGLE_ANALYTICS_ID` - GA4 tracking

**Key Scripts:**
```powershell
# Start all services
cd sneaker-tracker
.\start-dev.ps1

# Individual apps
cd apps/web-nextjs && npm run dev
cd apps/api-server && npm run start

# Scrapers
cd packages/scrapers/python
python -m raffles.scraper-worker
python news_aggregator.py --supabase
```

### 3. `scrapers/` - Legacy Standalone

**Status:** ⚠️ **Consider archiving** - Superseded by `sneaker-tracker/packages/scrapers/`

**Contents:** 2,588 files (old scraper implementations, CSV outputs, docs)

**Recommendation:** Move active scripts to monorepo, archive the rest

## 📚 Documentation Hub

**Primary Docs (Root):**
- `README.md` - Project overview
- `SETUP-GUIDE.md` - Comprehensive setup (Firebase, Supabase, env vars)
- `QUICK-START.md` - 10-minute quick setup
- `DEPLOYMENT-CHECKLIST.md` - Production deployment steps
- `ARCHITECTURE.md` - System architecture
- `CONNECTION-ARCHITECTURE.md` - Service integration map

**Project-Specific:**
- `shoe-tracker/README.md` - Prototype overview
- `shoe-tracker/README-PLAYWRIGHT.md` - Playwright monitor guide
- `sneaker-tracker/QUICK-REFERENCE.md` - Command cheat sheet
- `sneaker-tracker/FIREBASE-SETUP.md` - Firebase integration
- `sneaker-tracker/INTEGRATION-GUIDE.md` - Connect all services
- `sneaker-tracker/DEPLOYMENT-GUIDE.md` - Vercel + Docker deploy

**Central Index:**
- `docs/README.md` - **START HERE** - Documentation hub with organized links

## 🛠️ Cross-Project Scripts

**Root `scripts/` Directory:**
```
scripts/
├── install-all.ps1        # Install all dependencies across projects
├── start-everything.ps1   # Start all dev servers
└── preflight.ps1          # Pre-run environment checks
```

**Project-Specific:**
```
shoe-tracker/
└── Launch-SneakerTracker.ps1  # All-in-one launcher

sneaker-tracker/
├── start-dev.ps1              # Start web + API + optional Docker
├── setup-integrations.ps1     # Configure Firebase, Supabase, GA, Docker
└── scripts/
    └── pre-launch-check.ps1   # Production readiness check
```

## 🗑️ Removed Items

The following were removed during cleanup (Nov 18, 2025):

**Duplicate Projects:**
- `vite-project/` - Empty Vite boilerplate
- `shoe-tracker-app/` - Duplicate React prototype

**Redundant Documentation:**
- Root: `IMPLEMENTATION-COMPLETE.md`, `GETTING-STARTED.md`, `DISCORD-SETUP.md`, `FIREBASE-SETUP.md`, `INTEGRATION-SUMMARY.md`, `WEBSITE-STATUS.md`, `BEAUTIFUL-WEBSITE-COMPLETE.md`
- `sneaker-tracker/`: `SESSION-SUMMARY.md`, `DEPLOYMENT-PROGRESS.md`, `VERIFICATION-COMPLETE.md`, `SCRAPER-GAP-ANALYSIS.md`, `QUICK-DEPLOY-SCRAPERS.md`
- `packages/scrapers/`: `WHATS-NEW.md`, `SETUP-COMPLETE.md`, `ECOSYSTEM-MAP.md`, `IMPLEMENTATION-SUMMARY.md`

**Obsolete Scripts:**
- Root: `Deploy.ps1`, `Setup-Wizard.ps1`, `find-credentials.ps1`
- `sneaker-tracker/`: `FIX-ALL-ISSUES.ps1`, `MOVE-FROM-ONEDRIVE.ps1`, `CHECK-SYSTEM-STATUS.ps1`
- `apps/web-nextjs/`: `setup-staging.ps1`, `DEPLOY-TO-VERCEL.ps1`, `START-WEBSITE.ps1`
- `packages/scrapers/`: `setup-my-firestore.ps1`, `setup-firestore-easy.ps1`, `test-db-config.ps1`

**Empty Directories:**
- `sneaker-tracker/shoe-tracker/` - Nested duplicate (only had package-lock.json)
- `shoe-tracker/src/Mathmatica/` - Empty folder

## 🚀 Quick Start (New User)

```powershell
# 1. Choose your project
cd shoe-tracker        # For Firebase prototype
# OR
cd sneaker-tracker     # For production monorepo

# 2. Install dependencies
npm install            # (or pnpm install for monorepo)

# 3. Configure environment
# See SETUP-GUIDE.md for detailed steps

# 4. Start development
npm run dev
```

## 📊 Workspace Health Metrics

| Metric | Before Cleanup | After Cleanup | Improvement |
|--------|---------------|---------------|-------------|
| Root-level projects | 5 | 3 | -40% |
| Documentation files | 50+ | ~20 essential | -60% |
| PowerShell scripts | 46 | 27 active | -41% |
| Nested duplicates | 2 | 0 | -100% |
| Empty directories | 2 | 0 | -100% |

## 🎯 Next Steps

1. **Archive `scrapers/`:** If no longer needed, move to `_archived/` or delete
2. **Consolidate Firebase configs:** Consider centralizing in monorepo
3. **Standardize script naming:** Use kebab-case consistently
4. **Create workspace scripts:** Add `pnpm` workspace commands for monorepo
5. **Version control:** Commit cleaned structure with meaningful message

## 📞 Reference

- **Environment variables:** See `.github/copilot-instructions.md`
- **Workflows:** See `.github/workflows/ci-cd.yml`
- **Database schemas:** See `sneaker-tracker/packages/supabase-migrations/`
- **API docs:** See `sneaker-tracker/apps/api-server/README.md`
