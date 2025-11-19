# 🚀 Launch Checklist - Get Your Sneaker Tracker Live

## Current Status
✅ API Server built and ready  
✅ Scrapers working (150+ releases per store)  
✅ Firebase Functions ready to deploy  
✅ Next.js web app exists  
⚠️ Need to start services and deploy  

---

## Step 1: Start API Server (5 minutes)

### Option A: Quick Local Test
```powershell
# Open Terminal 1
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server

# Set environment variables
$env:SUPABASE_URL="https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXJuY2x3dWl3eHh0ZWNydnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzAxMDMsImV4cCI6MjA3NzgwNjEwM30.ixSRWRjaRYQ0kvaJ9gWw2vM4MM2HRtCZa5sfx-ibJak"
$env:PORT="4000"

# Start server
npm run build
node -r dotenv/config dist/server.js
```

**Verify**: Open browser to http://localhost:4000/api/health  
Should see: API endpoints listed

### Option B: Production with PM2 (Recommended)
```powershell
# Install PM2 globally (one-time)
npm install -g pm2

# Create ecosystem config
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server
```

Create `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [{
    name: 'sneaker-api',
    script: './dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      SUPABASE_URL: 'https://zaarnclwuiwxxtecrvvs.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXJuY2x3dWl3eHh0ZWNydnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzAxMDMsImV4cCI6MjA3NzgwNjEwM30.ixSRWRjaRYQ0kvaJ9gWw2vM4MM2HRtCZa5sfx-ibJak'
    }
  }]
};
```

```powershell
# Build and start
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Auto-start on reboot
```

---

## Step 2: Start Next.js Web App (5 minutes)

```powershell
# Open Terminal 2
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs

# Install dependencies (if not done)
pnpm install

# Start development server
pnpm run dev
```

**Verify**: Open browser to http://localhost:3000  
Should see: Your sneaker release tracker homepage

**Note**: `.env.local` already has Supabase credentials configured ✅

---

## Step 3: Run Initial Data Scrape (10 minutes)

```powershell
# Open Terminal 3
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers

# Set API endpoint
$env:API_BASE_URL="http://localhost:4000"

# Optional: Enable Firestore stats
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw

# Run all enabled scrapers
pnpm run start

# Or run specific stores
pnpm run start kith
pnpm run start extraButter
```

**What happens**:
1. Scrapers fetch releases from stores
2. Data POSTs to API server (or falls back to NDJSON)
3. API saves to Supabase
4. Website displays releases in real-time

**Verify**: 
- Check API logs for "sent X releases to API"
- Refresh website to see releases appear

---

## Step 4: Import Any NDJSON Files (If API POST Failed)

```powershell
# If scrapers wrote NDJSON files instead of POSTing
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers

# Import all NDJSON files
pnpm run import:ndjson -- dir=output
```

---

## Step 5: Deploy Firebase Functions (Optional, 15 minutes)

```powershell
# Install Firebase CLI (one-time)
npm install -g firebase-tools

# Login
firebase login

# Deploy functions
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\firebase-functions
pnpm install
firebase deploy --only functions
```

**This gives you**:
- Auto-stats finalization (daily at midnight)
- User alert subscriptions
- Discord/Slack webhooks
- Metrics endpoint

---

## Step 6: Set Up Automated Scraping (Optional)

### Option A: Windows Task Scheduler

**Create file**: `C:\scripts\run-scrapers.ps1`
```powershell
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers"

$env:API_BASE_URL = "http://localhost:4000"

# Run all scrapers
pnpm run start

# Import any NDJSON fallbacks
if (Test-Path "output\*.ndjson") {
    pnpm run import:ndjson -- dir=output
}

# Log
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path "C:\scripts\scraper-log.txt" -Value "$timestamp - Completed"
```

**Task Scheduler**:
1. Open Task Scheduler → Create Task
2. Name: "Sneaker Scraper - Daily"
3. Trigger: Daily at 2:00 AM
4. Action: `powershell.exe -File "C:\scripts\run-scrapers.ps1"`

### Option B: PM2 Cron (If using PM2)

```powershell
# Add scraper to PM2 with cron
pm2 start "pnpm run start" --name scrapers --cron "0 2 * * *" --no-autorestart
```

---

## Quick Verification Checklist

After completing steps 1-3, verify everything works:

- [ ] API Server running: http://localhost:4000/api/health returns OK
- [ ] Website running: http://localhost:3000 loads
- [ ] Scrapers completed: Check terminal for "✓ kith: 150 releases"
- [ ] Data in Supabase: Open Supabase dashboard → Table Editor → releases table has data
- [ ] Website shows data: Refresh http://localhost:3000 and see releases

---

## Troubleshooting

### API Server Won't Start
```powershell
# Check if port is in use
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue

# Kill process if needed
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Website Shows No Data
1. Check API is running: `curl http://localhost:4000/api/health`
2. Check Supabase has data: Open Supabase dashboard → releases table
3. Check Next.js API route configuration

### Scrapers Not Posting to API
1. Verify `$env:API_BASE_URL` is set
2. Check API server logs for incoming requests
3. Use NDJSON fallback: `pnpm run import:ndjson -- dir=output`

---

## Production Deployment (When Ready)

### Deploy API to Cloud
**Options**:
- Railway: https://railway.app (easiest)
- Render: https://render.com
- Heroku: https://heroku.com
- VPS: DigitalOcean, Linode ($5-10/mo)

### Deploy Website to Vercel
```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy
cd apps/web-nextjs
vercel

# Follow prompts, add environment variables
```

### Update Scrapers to Use Production API
```powershell
# Change API_BASE_URL to your deployed API
$env:API_BASE_URL="https://your-api.railway.app"
pnpm run start
```

---

## What to Do Right Now

**Immediate Next Steps** (choose one):

### A. Quick Local Demo (Fastest - 10 minutes)
1. Start API server (Step 1, Option A)
2. Start website (Step 2)
3. Run scrapers (Step 3)
4. View results at http://localhost:3000

### B. Production-Ready Setup (Best - 30 minutes)
1. Install PM2: `npm install -g pm2`
2. Create ecosystem.config.cjs for API
3. Start API with PM2 (Step 1, Option B)
4. Start website (Step 2)
5. Run scrapers with API_BASE_URL set
6. Set up Task Scheduler for daily scraping

### C. Full Cloud Deployment (Most reliable - 1 hour)
1. Deploy API to Railway/Render
2. Deploy website to Vercel
3. Deploy Firebase Functions
4. Set up cron job for scrapers (GitHub Actions or cloud scheduler)

---

## Recommended: Start with Option A

**Run these commands in order**:

```powershell
# Terminal 1 - API Server
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server
$env:SUPABASE_URL="https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXJuY2x3dWl3eHh0ZWNydnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzAxMDMsImV4cCI6MjA3NzgwNjEwM30.ixSRWRjaRYQ0kvaJ9gWw2vM4MM2HRtCZa5sfx-ibJak"
$env:PORT="4000"
node -r dotenv/config dist/server.js

# Terminal 2 - Website (open new terminal)
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs
pnpm run dev

# Terminal 3 - Scrapers (open new terminal)
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers
$env:API_BASE_URL="http://localhost:4000"
pnpm run start kith
```

Then open http://localhost:3000 in your browser! 🎉

---

**Which option do you want to start with?**
