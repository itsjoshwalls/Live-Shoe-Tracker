# Live Shoe Tracker - Complete Connection Architecture

## 🔗 Current Services Overview

### **Active Services** (as of now)
| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **Supabase PostgREST** | 3000 | ✅ Running | REST API for PostgreSQL |
| **Next.js Frontend** | 3002 | ✅ Running | Web UI |
| **PostgreSQL** | 5432 | ✅ Running (Docker) | Primary database |
| **API Server** | 4000 | ❌ Not Running | TypeScript backend (port conflict) |
| **Supabase (Cloud)** | HTTPS | ⚠️ Configured | Cloud Supabase instance |

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Next.js Frontend    │  Port 3002
         │   (web-nextjs)        │  ✅ RUNNING
         └───────┬───────────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌──────────────┐
│Firebase │ │Supabase │ │  API Server  │  Port 4000
│Firestore│ │ Cloud   │ │ (TypeScript) │  ❌ NOT RUNNING
│ (Cloud) │ │ (HTTPS) │ └──────┬───────┘
└────┬────┘ └────┬────┘        │
     │           │             │
     │           │             ▼
     │           │      ┌─────────────┐
     │           │      │  Supabase   │  Port 3000
     │           │      │  PostgREST  │  ✅ RUNNING
     │           │      │   (Local)   │
     │           │      └──────┬──────┘
     │           │             │
     │           └─────────────┼──────────┐
     │                         │          │
     ▼                         ▼          ▼
┌─────────────────────────────────────────────┐
│           PostgreSQL Database                │  Port 5432
│           (Docker Container)                 │  ✅ RUNNING
│  Collections: sneakers, sneakers_canonical   │
└──────────────────┬──────────────────────────┘
                   ▲
                   │
           ┌───────┴────────┐
           │                │
      ┌────▼─────┐   ┌─────▼──────┐
      │  Python  │   │  Firebase  │
      │ Scrapers │   │  Ingest    │
      │          │   │  Scripts   │
      └──────────┘   └────────────┘
```

---

## 📊 Data Flow Architecture

### **Option 1: Firestore Only (Current)**
```
Scrapers → Firestore (Cloud) → Frontend (Real-time)
                              → GA4 Analytics
```
- ✅ Working now
- ✅ Real-time updates via onSnapshot
- ✅ No backend needed
- ❌ No PostgreSQL integration

### **Option 2: Dual Storage (Recommended)**
```
Scrapers → Firestore (Cloud) ──┐
        → PostgreSQL (Local) ───┼→ Frontend reads both
                                │
                        API Server aggregates
```
- ⚠️ API Server currently blocked (port 4000 conflict)
- ✅ PostgreSQL healthy and running
- ⚠️ Scrapers need dual-write capability

### **Option 3: PostgreSQL Primary (Alternative)**
```
Scrapers → PostgreSQL → Supabase PostgREST (port 3000) → Frontend
                     → API Server (port 4000)
```
- ✅ PostgreSQL ready
- ✅ Supabase PostgREST API available
- ❌ API Server not running
- ⚠️ Scrapers currently write to Firestore only

---

## 🔧 Current Configuration Status

### **Frontend (Next.js on port 3002)**
**Connections:**
- ✅ **Firebase/Firestore**: Connected via `NEXT_PUBLIC_FIREBASE_CONFIG`
  - Project: `live-sneaker-release-tracker`
  - Collection: `sneakers_canonical` (dashboard.tsx)
  - Real-time: `onSnapshot` listener active
  
- ⚠️ **Supabase Cloud**: Configured but NOT used in dashboard
  - URL: `https://npvqqzuofwojhbdlozgh.supabase.co`
  - Anon Key: Present in `.env.local`
  - **Issue**: Dashboard queries Firestore, not Supabase
  
- ❌ **API Server**: Not connected (server not running)

### **Python Scrapers**
**Current Behavior:**
- ✅ Write to Firestore `sneakers_canonical`
- ❌ Don't write to PostgreSQL
- ✅ Send GA4 events (when credentials set)

**Available Adapters:**
- `firestore_adapter.py` - Firestore batch writes ✅
- `analytics_tracker.py` - GA4 event tracking ✅
- Direct PostgreSQL writes ⚠️ (not currently used)

### **PostgreSQL Database**
**Status:** ✅ Running in Docker (3+ days uptime)
**Accessible via:**
1. Direct connection: `localhost:5432`
2. Supabase PostgREST API: `http://localhost:3000`

**Tables:** Created from `create_tables.sql`

---

## 🎯 Integration Options

### **A) Keep Firestore as Primary (Simplest - Current Setup)**

**What's working:**
- Scrapers → Firestore ✅
- Frontend → Firestore ✅
- Real-time updates ✅

**What needs fixing:**
1. Add Supabase auth integration to frontend
2. Optionally: Sync Firestore → PostgreSQL for analytics/backup

**Commands:**
```powershell
# Already working! Just scrape:
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json' -Raw
python soleretriever_scraper_firebase.py --collection nike --limit 20
```

---

### **B) Add PostgreSQL/Supabase Integration (Full Stack)**

**Benefits:**
- SQL queries and advanced analytics
- Supabase auth, storage, real-time
- Better data backup and migrations

**Implementation:**

#### 1. **Update Frontend to Read from Both Sources**

Create a unified data layer that reads from Firestore AND Supabase:

```typescript
// lib/dataLayer.ts
import { getFirestoreInstance } from './firebaseClient';
import { createClient } from '@supabase/supabase-js';

export async function getUnifiedReleases() {
  // Get from Firestore
  const firestoreData = await getFirestoreReleases();
  
  // Get from Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: supabaseData } = await supabase
    .from('sneakers')
    .select('*');
  
  // Merge and deduplicate
  return [...firestoreData, ...supabaseData];
}
```

#### 2. **Update Scrapers to Write to Both**

Modify scrapers to dual-write:

```python
# In your scraper
from firestore_adapter import FirestoreAdapter
import psycopg2

# Save to Firestore (current)
firestore_adapter.save_products(products)

# ALSO save to PostgreSQL
conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='postgres',
    user='postgres',
    password='your-super-secret-postgres-password'
)
# Insert products...
```

#### 3. **Fix API Server Port Conflict**

```powershell
# Find what's using port 4000
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | 
  Select-Object OwningProcess | Get-Unique | 
  ForEach-Object { 
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "Port 4000 used by: $($proc.Name) (PID: $($proc.Id))"
    # Kill it if not critical
    # Stop-Process -Id $proc.Id -Force
  }

# OR change API server port in .env
# PORT=4001
```

#### 4. **Use Supabase PostgREST API (Already Running!)**

You already have PostgREST on port 3000. Use it directly:

```typescript
// Frontend can query PostgreSQL via REST
fetch('http://localhost:3000/sneakers?limit=50')
  .then(res => res.json())
  .then(data => console.log('PostgreSQL sneakers:', data));
```

---

### **C) Hybrid Approach (Best of Both Worlds)**

**Strategy:**
1. **Scrapers** → Write to Firestore (fast, real-time)
2. **Background Worker** → Sync Firestore → PostgreSQL (hourly)
3. **Frontend** → Read from Firestore (live data)
4. **Analytics/Reports** → Query PostgreSQL (complex queries)

**Benefits:**
- ✅ Keep current fast scraping to Firestore
- ✅ Get PostgreSQL for analytics
- ✅ No dual-write complexity in scrapers
- ✅ Best performance

**Implementation:**
```python
# scripts/sync_firestore_to_postgres.py
from firestore_adapter import FirestoreAdapter
import psycopg2

adapter = FirestoreAdapter()
products = adapter.list_products(limit=1000)

# Bulk insert to PostgreSQL
conn = psycopg2.connect(...)
# INSERT ON CONFLICT UPDATE...
```

---

## 🚀 Quick Fix: Complete Integration NOW

### **Step 1: Update Frontend .env.local**

Fix Supabase URL to use local PostgREST:

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs
```

Update `.env.local`:
```env
# Use LOCAL Supabase PostgREST (port 3000)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### **Step 2: Migrate Firestore Data to PostgreSQL**

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json' -Raw

# Migrate all Firestore data to PostgreSQL
python firestore_adapter.py --migrate-to-postgres
```

### **Step 3: Update Dashboard to Show Both Sources**

Create a new dashboard page showing data from BOTH:

```typescript
// pages/unified-dashboard.tsx
const [firestoreReleases, setFirestoreReleases] = useState([]);
const [postgresReleases, setPostgresReleases] = useState([]);

// Listen to Firestore
useEffect(() => {
  const db = getFirestoreInstance();
  const q = query(collection(db, 'sneakers_canonical'));
  return onSnapshot(q, (snapshot) => {
    setFirestoreReleases(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
  });
}, []);

// Fetch from PostgreSQL via PostgREST
useEffect(() => {
  fetch('http://localhost:3000/sneakers')
    .then(res => res.json())
    .then(data => setPostgresReleases(data));
}, []);

// Show merged view
const allReleases = [...firestoreReleases, ...postgresReleases];
```

---

## 📋 Current Data Inventory

### **Firestore `sneakers_canonical`**
- ✅ 30 products (20 migrated + 10 Jordans scraped)
- ✅ Real-time updates working
- ✅ Frontend connected

### **PostgreSQL `sneakers` table**
- ⚠️ May have data from earlier migrations
- ✅ Schema created from `create_tables.sql`
- ❌ Not currently used by frontend

### **Supabase Cloud**
- ⚠️ Configured but credentials show URL: `https://npvqqzuofwojhbdlozgh.supabase.co`
- ❌ Not actively used

---

## ✅ Recommended Next Steps (Priority Order)

### **Priority 1: Verify Current Setup**
```powershell
# 1. Check PostgreSQL has data
docker exec -it sneaker-tracker-postgres psql -U postgres -d postgres -c "SELECT COUNT(*) FROM sneakers;"

# 2. Test PostgREST API
Invoke-WebRequest http://localhost:3000/sneakers -UseBasicParsing

# 3. Check Firestore data
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json' -Raw
python firestore_adapter.py --test-query
```

### **Priority 2: Choose Integration Strategy**
Pick ONE:
- **A) Firestore Only** - Keep current, simplest
- **B) Add PostgreSQL** - Full integration, more complex
- **C) Hybrid Sync** - Best balance (recommended)

### **Priority 3: Implement Chosen Strategy**
I can help implement whichever you choose!

---

## 🔍 Quick Diagnostic Commands

```powershell
# See all listening ports
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in @(3000,3001,3002,4000,5432,8000) } | Select-Object LocalPort, State | Sort-Object LocalPort

# Check Docker containers
docker ps

# Test each service
curl http://localhost:3000/sneakers  # PostgreSQL via PostgREST
curl http://localhost:3002           # Next.js frontend
curl http://localhost:4000/health    # API Server (if running)

# Check PostgreSQL directly
docker exec -it sneaker-tracker-postgres psql -U postgres -d postgres -c "\dt"
```

---

## 💡 Summary

**You currently have:**
1. ✅ **Firestore** - Connected, working, has 30 products
2. ✅ **PostgreSQL** - Running, healthy, accessible
3. ✅ **PostgREST API** - Running on port 3000
4. ✅ **Next.js Frontend** - Running on port 3002, reading Firestore
5. ❌ **API Server** - Not running (port conflict)

**To get EVERYTHING connected:**
- Keep Firestore for real-time scraper data ✅
- Use PostgreSQL for analytics/complex queries
- Sync between them (one-way or two-way)
- Add Supabase auth for user management

**Which integration approach do you want?** I'll implement it completely for you!
