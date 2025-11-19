# Sneaker Tracker - Quick Reference

## 🚀 Start Services

### API Server (Production - PM2)
```powershell
pm2 start dist/server.js --name sneaker-api
pm2 status
pm2 logs sneaker-api
```

### API Server (Development)
```powershell
cd sneaker-tracker/apps/api-server
$env:SUPABASE_URL="https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY="your-key-here"
$env:PORT="4000"
npm run build
node -r dotenv/config dist/server.js
```

---

## 🕷️ Run Scrapers

### All Enabled Stores
```powershell
cd sneaker-tracker/packages/scrapers
$env:API_BASE_URL="http://localhost:4000"
pnpm run start
```

### Specific Store
```powershell
pnpm run start kith
pnpm run start extraButter
```

### With Firestore Stats
```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw
pnpm run start
```

---

## 📥 Import NDJSON

### Single File
```powershell
pnpm run import:ndjson -- file=output/kith-1762288358669.ndjson
```

### All Files in Directory
```powershell
pnpm run import:ndjson -- dir=output
```

---

## 📊 Stats & Maintenance

### Finalize Yesterday's Stats
```powershell
pnpm run stats:finalize
```

### Finalize Specific Date
```powershell
pnpm run stats:finalize -- date=2025-11-03
```

### Finalize Today UTC-1
```powershell
pnpm run stats:finalize:utc
```

---

## 🛠️ Add New Store

### Shopify Store
```powershell
pnpm run gen -- name=newStore type=shopify domain=newstore.com enabled=true
```

### Custom Store
```powershell
pnpm run gen -- name=customStore type=custom enabled=false
# Then implement: scrapers/customStore.js
```

---

## 🔍 Health Checks

### API Server
```powershell
curl http://localhost:4000/api/health
```

### Metrics
```powershell
curl http://localhost:4000/api/metrics
```

### Check Scraped Files
```powershell
Get-ChildItem packages/scrapers/output -Filter *.ndjson | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 10
```

### Validate NDJSON Format
```powershell
Get-Content packages/scrapers/output/kith-*.ndjson | 
    Select-Object -First 1 | 
    ConvertFrom-Json | 
    Format-List
```

---

## 🐛 Troubleshooting

### Port Already in Use
```powershell
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

### Kill All Node Processes
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### View PM2 Logs
```powershell
pm2 logs sneaker-api --lines 100
pm2 logs --err  # Errors only
```

### Restart API Server
```powershell
pm2 restart sneaker-api
pm2 reload sneaker-api  # Zero-downtime
```

---

## 📂 Key File Locations

```
sneaker-tracker/
├── apps/
│   ├── api-server/
│   │   ├── src/server.ts              # Main API server
│   │   ├── src/routes/releasesEnhanced.ts  # Batch endpoint
│   │   └── dist/server.js             # Compiled (run this)
│   └── web-nextjs/
│       └── .env.local                 # Supabase credentials
├── packages/
│   └── scrapers/
│       ├── index.js                   # CLI orchestrator
│       ├── config.js                  # Store registry
│       ├── output/                    # NDJSON files
│       ├── scrapers/core/utils.js     # ShopifyScraper
│       ├── handlers/releaseHandler.js # Ingestion logic
│       └── tools/
│           ├── gen-stub.js            # Store generator
│           ├── finalize-stats.js      # Stats finalizer
│           └── import-ndjson.js       # NDJSON importer
├── LAUNCH-READINESS.md                # Launch status
├── DEPLOYMENT-GUIDE.md                # Production setup
└── QUICK-REFERENCE.md                 # This file
```

---

## 🔐 Environment Variables

### Required for API Server
```bash
SUPABASE_URL=https://zaarnclwuiwxxtecrvvs.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...  # Or SUPABASE_SERVICE_ROLE_KEY for prod
PORT=4000
```

### Optional for Scrapers
```bash
API_BASE_URL=http://localhost:4000  # Enables direct POST
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'  # Enables stats
```

---

## 📈 Performance Stats

| Store        | Items | Time | File Size |
|--------------|-------|------|-----------|
| Kith         | 150   | ~5s  | 74 KB     |
| Extra Butter | 150   | ~6s  | 81 KB     |

---

## 🎯 Common Tasks

### Daily Scrape (Production)
```powershell
# Task Scheduler at 2:00 AM
pnpm --filter @sneaker-tracker/scrapers run start
pnpm --filter @sneaker-tracker/scrapers run stats:finalize:utc
```

### Manual Test Scrape
```powershell
pnpm --filter @sneaker-tracker/scrapers run start kith
Get-Content packages/scrapers/output/kith-*.ndjson | Select-Object -First 2
```

### Deploy API Updates
```powershell
cd sneaker-tracker/apps/api-server
npm run build
pm2 restart sneaker-api
pm2 logs sneaker-api --lines 50
```

---

**Need Help?**
- Full docs: `LAUNCH-READINESS.md`, `DEPLOYMENT-GUIDE.md`
- API docs: `apps/api-server/README.md`
- Scrapers docs: `packages/scrapers/README.md`
