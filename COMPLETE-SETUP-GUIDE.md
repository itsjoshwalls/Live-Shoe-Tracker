# Complete Setup Guide - Live Shoe Tracker
## From Frontend to Backend - Full Connection Guide

**Last Updated**: November 17, 2025  
**Goal**: Get your entire sneaker tracking system connected and running

---

## 📋 Overview

Your Live Shoe Tracker consists of:
1. **Frontend** (Next.js web app) - `sneaker-tracker/apps/web-nextjs`
2. **API Server** (Express/TypeScript) - `sneaker-tracker/apps/api-server`
3. **Desktop App** (Electron) - `sneaker-tracker/apps/desktop-electron`
4. **Python Scrapers** - `sneaker-tracker/packages/scrapers/python`
5. **Databases**: Firebase Firestore + Supabase + Local PostgreSQL

---

## 🎯 STEP 1: Firebase Project Setup

### 1.1 Access Your Firebase Project
```
URL: https://console.firebase.google.com/
Project: live-sneaker-release-tra-df5a4
```

### 1.2 Get Firebase Web Config (for Frontend)
1. Go to **Project Settings** (gear icon, top-left)
2. Scroll to **"Your apps"** section
3. Click **Web app** (</> icon) or "Add app" if none exist
4. Copy the **firebaseConfig** object:
```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "live-sneaker-release-tra-df5a4",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..." // This is your GA Measurement ID!
};
```

### 1.3 Get Service Account (for Backend/Scrapers)
1. **Project Settings** → **Service Accounts** tab
2. Click **"Generate new private key"** (or use existing one)
3. Save JSON file to: `C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json`
4. ✅ You already have this file!

### 1.4 Enable Firestore
1. **Build** → **Firestore Database**
2. If not created, click **"Create database"**
3. Choose **Production mode**
4. Select region: **us-central1** (or nearest)
5. Create collections:
   - `sneakers_canonical` (main product data)
   - `sneakers` (legacy from shoe-tracker)
   - `users` (user profiles)
   - `chat_messages` (if using chat feature)

---

## 🎯 STEP 2: Google Analytics 4 Setup

### 2.1 Find Your GA4 Property
1. Go to https://analytics.google.com/
2. **Admin** (gear icon, bottom-left)
3. **Property** column → Select your property
   - Should be linked to Firebase project
   - Name might be: "Live Sneaker Release Tracker" or similar

### 2.2 Get Measurement ID
1. **Admin** → **Data Streams** (under Property column)
2. Click your **Web** stream
3. Copy **Measurement ID**: `G-XXXXXXXXXX`
   - This is the `measurementId` from Firebase config (step 1.2)
   - Should start with `G-`

### 2.3 Create Measurement Protocol API Secret
1. Same **Web stream** page, scroll down
2. **Measurement Protocol API secrets** section
3. Click **"Create"**
4. Name: `python-scrapers`
5. Click **Create** and copy the **Secret value**
6. ⚠️ Save this immediately - you can't view it again!

### 2.4 Verify GA4 Connection to Firebase
1. Firebase Console → **Project Settings** → **Integrations**
2. Should see **Google Analytics** enabled
3. If not, click **Link** and follow prompts

---

## 🎯 STEP 3: Supabase Project Setup

### 3.1 Access Supabase Project
```
Option A: Cloud Supabase
URL: https://supabase.com/dashboard/projects
Find your project or create new one

Option B: Local Docker Supabase (CURRENT SETUP)
Status: Running on Docker
Containers: postgres, kong, studio, rest, meta
```

### 3.2 Get Supabase Credentials (Local Docker)

Check if containers are running:
```powershell
docker ps | Select-String "supabase"
```

**Studio URL**: http://localhost:3001  
**API URL**: http://localhost:8000  
**PostgreSQL**: localhost:5432

**Default Credentials**:
```
Database: postgres
User: postgres
Password: your-super-secret-postgres-password
Service Role Key: Check docker-compose.yml or .env
Anon Key: Check docker-compose.yml or .env
```

### 3.3 Get Supabase Cloud Credentials (if using cloud)
1. **Project Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: For frontend
   - **service_role key**: For backend (⚠️ secret!)

### 3.4 Verify Database Tables
```powershell
# Connect to local PostgreSQL
docker exec -it sneaker-tracker-postgres psql -U postgres -d postgres

# List tables
\dt

# Should see:
# - soleretriever_data
# - news_articles
# - footlocker_data
# - nike_snkrs_data
```

---

## 🎯 STEP 4: Environment Variables Setup

### 4.1 Frontend Environment (Next.js)
**File**: `sneaker-tracker/apps/web-nextjs/.env.local`

Create/update this file:
```bash
# Firebase (from Step 1.2)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=live-sneaker-release-tra-df5a4.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=live-sneaker-release-tra-df5a4
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=live-sneaker-release-tra-df5a4.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Server
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4.2 API Server Environment
**File**: `sneaker-tracker/apps/api-server/.env`

Create/update this file:
```bash
# Server Config
PORT=4000
NODE_ENV=development

# Firebase Admin (for Firestore access)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"live-sneaker-release-tra-df5a4",...}
# OR path to file:
FIREBASE_SERVICE_ACCOUNT_PATH=C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json

# Supabase
SUPABASE_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PostgreSQL (local)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-super-secret-postgres-password

# Google Analytics (optional, for backend tracking)
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=your-api-secret
```

### 4.3 Python Scrapers Environment
**File**: `sneaker-tracker/packages/scrapers/python/.env`

Create/update this file:
```bash
# Firebase Service Account (as JSON string)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"live-sneaker-release-tra-df5a4",...}

# Google Analytics
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=your-api-secret

# PostgreSQL (local Docker)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-super-secret-postgres-password

# Supabase (local)
SUPABASE_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🎯 STEP 5: PowerShell Environment Setup

### 5.1 Set Session Variables (Quick Test)
```powershell
# Navigate to scrapers directory
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python

# Load Firebase credentials
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content "C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json" -Raw

# Set GA credentials (replace with your actual values)
$env:GA_MEASUREMENT_ID = "G-XXXXXXXXXX"
$env:GA_API_SECRET = "your-api-secret-here"

# Verify
Write-Host "FIREBASE_SERVICE_ACCOUNT length: $($env:FIREBASE_SERVICE_ACCOUNT.Length)"
Write-Host "GA_MEASUREMENT_ID: $env:GA_MEASUREMENT_ID"
Write-Host "GA_API_SECRET: $(if($env:GA_API_SECRET){'SET'}else{'NOT SET'})"
```

### 5.2 Set Permanent User Environment Variables
```powershell
# Set permanently for your Windows user account
[Environment]::SetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT", $env:FIREBASE_SERVICE_ACCOUNT, "User")
[Environment]::SetEnvironmentVariable("GA_MEASUREMENT_ID", $env:GA_MEASUREMENT_ID, "User")
[Environment]::SetEnvironmentVariable("GA_API_SECRET", $env:GA_API_SECRET, "User")

# Restart PowerShell to take effect, or continue with current session
```

---

## 🎯 STEP 6: Installation & Dependencies

### 6.1 Frontend (Next.js)
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs

# Install dependencies
pnpm install

# Verify Next.js version
pnpm list next
```

### 6.2 API Server
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server

# Install dependencies
pnpm install

# Verify TypeScript compilation
pnpm run build
```

### 6.3 Python Scrapers
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python

# Install Python dependencies
pip install -r requirements-firebase.txt

# Verify installations
python -c "import firebase_admin; print('Firebase Admin:', firebase_admin.__version__)"
python -c "import requests; print('Requests:', requests.__version__)"
```

---

## 🎯 STEP 7: Start Services (In Order)

### 7.1 Start Supabase (if not running)
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker

# Check if running
docker ps | Select-String "supabase"

# If not running, start
docker-compose up -d
```

### 7.2 Start API Server
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server

# Development mode
pnpm run dev

# Should see:
# Server running on http://localhost:4000
```

### 7.3 Start Frontend (New Terminal)
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs

# Development mode
pnpm run dev

# Should see:
# ready - started server on 0.0.0.0:3000
# Open: http://localhost:3000
```

---

## 🎯 STEP 8: Test Connections

### 8.1 Test Firebase Connection
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python

# Test Firestore read/write
python firestore_adapter.py --test-save --test-query
```

**Expected Output**:
```
✓ Initialized Firebase Admin SDK
Saved 2/2 products
Found 2 products:
  - Test Jordan 1 (Jordan)
  - Test Nike Dunk (Nike)
```

### 8.2 Test Google Analytics
```powershell
# Send test event
python analytics_tracker.py --test-event

# Should see:
# Event sent: True
```

**Verify in GA4**:
1. Open: https://analytics.google.com/analytics/web/#/realtime
2. Wait 30-60 seconds
3. Look for event `scraper_run` in "Event count by Event name"

### 8.3 Test API Server
```powershell
# In new terminal
curl http://localhost:4000/health

# Or
Invoke-RestMethod http://localhost:4000/health
```

**Expected**: `{"status":"ok"}` or similar health check response

### 8.4 Test Frontend
1. Open browser: http://localhost:3000
2. Check browser console (F12) for errors
3. Verify Firebase initialization
4. Test navigation

### 8.5 Test Full Scraper Pipeline
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python

# Run scraper with Firestore + GA
python soleretriever_scraper_firebase.py --collection jordan --limit 5

# Should see:
# Scraping jordan collection...
# Found X product links
# Saved 5/5 products to Firestore
# Products scraped: 5
# Errors: 0
```

**Verify**:
- Firebase Console → Firestore → `sneakers_canonical` collection → should have 5 new docs
- GA4 Realtime → should show `scraper_run` and `product_saved` events

---

## 🎯 STEP 9: Troubleshooting

### Issue: "FIREBASE_SERVICE_ACCOUNT not set"
```powershell
# Verify variable is set
$env:FIREBASE_SERVICE_ACCOUNT.Length

# If 0 or blank, reload:
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content "C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json" -Raw
```

### Issue: "GA events not appearing"
1. Check Measurement ID format: Must start with `G-`
2. Verify API Secret is correct (no extra spaces)
3. Check Realtime dashboard is for correct property
4. Wait 60-90 seconds (can have delay)
5. Try debug mode:
```powershell
python analytics_tracker.py --test-event --debug
```

### Issue: "Port 4000 already in use"
```powershell
# Find process
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess }

# Kill process (replace PID)
Stop-Process -Id <PID> -Force

# Or use different port in .env:
# PORT=4001
```

### Issue: "Supabase connection refused"
```powershell
# Check containers
docker ps | Select-String "supabase"

# Restart if needed
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker
docker-compose restart

# Check logs
docker logs sneaker-tracker-postgres
```

### Issue: Frontend "Firebase not initialized"
1. Check `.env.local` file exists in `apps/web-nextjs`
2. Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
3. Restart dev server after changing .env
4. Check browser console for specific error

---

## 🎯 STEP 10: Quick Start Script

Save this as `start-all.ps1`:

```powershell
# Quick Start Script for Live Shoe Tracker

Write-Host "=== Starting Live Shoe Tracker ===" -ForegroundColor Cyan

# Load environment variables
Write-Host "[1/5] Loading environment variables..." -ForegroundColor Yellow
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content "C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json" -Raw
$env:GA_MEASUREMENT_ID = "G-XXXXXXXXXX"  # REPLACE
$env:GA_API_SECRET = "your-api-secret"   # REPLACE

# Check Docker
Write-Host "[2/5] Checking Supabase..." -ForegroundColor Yellow
$supabase = docker ps | Select-String "supabase"
if ($supabase) {
    Write-Host "✓ Supabase running" -ForegroundColor Green
} else {
    Write-Host "✗ Starting Supabase..." -ForegroundColor Yellow
    docker-compose up -d
}

# Start API Server
Write-Host "[3/5] Starting API Server..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server'; pnpm run dev"

# Wait for API to start
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "[4/5] Starting Frontend..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs'; pnpm run dev"

# Test connections
Write-Host "[5/5] Testing connections..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $health = Invoke-RestMethod http://localhost:4000/health -ErrorAction Stop
    Write-Host "✓ API Server: OK" -ForegroundColor Green
} catch {
    Write-Host "✗ API Server: Not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Services Started ===" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000"
Write-Host "API Server: http://localhost:4000"
Write-Host "Supabase Studio: http://localhost:3001"
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
```

---

## 📊 Summary Checklist

Before you start, gather these credentials:

- [ ] Firebase web config (firebaseConfig object)
- [ ] Firebase service account JSON file
- [ ] GA4 Measurement ID (G-XXXXXXXXXX)
- [ ] GA4 API Secret
- [ ] Supabase URL (cloud or http://localhost:8000)
- [ ] Supabase anon key
- [ ] Supabase service_role key
- [ ] PostgreSQL password

Then follow steps 1-10 in order. Each step builds on the previous one.

---

**Need Help?** 
- Check logs: Browser console (F12), terminal output, Docker logs
- Verify environment variables are set
- Ensure all ports are available (3000, 4000, 8000, 5432)
- Restart services after changing .env files
