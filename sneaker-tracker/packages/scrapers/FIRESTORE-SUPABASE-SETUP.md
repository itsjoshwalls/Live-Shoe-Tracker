# 🔥 Firestore + Supabase Dual Database Setup

Your Live Shoe Tracker now supports **DUAL WRITES** to both Firestore and Supabase!

---

## 🎯 Quick Setup

### 1️⃣ Get Your Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click **⚙️ Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file (e.g., `serviceAccount.json`)

---

### 2️⃣ Set Environment Variables

**Navigate to scrapers directory:**
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers
```

**Create/update `.env` file:**
```powershell
# Get Firebase service account as single-line JSON
$firebaseJson = Get-Content "C:\path\to\serviceAccount.json" -Raw | ConvertFrom-Json | ConvertTo-Json -Compress

# Create .env with both databases
@"
# Supabase (for real-time frontend)
SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdnFxenVvZndvamhiZGxvemdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA3OTYxNCwiZXhwIjoyMDc4NjU1NjE0fQ.X-NWR22vzkXbGl5GNBdFYQF47Y2r7B8Tz1J2rgH_kmk

# Firestore (for legacy compatibility)
FIREBASE_SERVICE_ACCOUNT=$firebaseJson
FIRESTORE_COLLECTION=releases

# Optional: API server
API_BASE_URL=http://localhost:4000/api
"@ | Out-File -FilePath .env -Encoding UTF8
```

**Or manually create `.env`:**
```env
# Supabase
SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...kmk

# Firestore (paste your service account JSON as single line)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project",...}
FIRESTORE_COLLECTION=releases
```

---

## 🚀 Usage

### Automatic Dual Writes (When Scraping)

When you run scrapers with `FIREBASE_SERVICE_ACCOUNT` set, data automatically writes to **BOTH** databases:

```powershell
npm run scrape:shopify undefeated kith concepts
# Output:
# [undefeated] 150 releases
# [undefeated] ✅ Sent to API
# [undefeated] 🔥 Firestore: ✅ 150, ❌ 0
# [undefeated] 💾 NDJSON: 150 releases → undefeated-1763112345678.ndjson
```

---

### Manual Import to Firestore

```powershell
# Import single file
npm run import:firestore output\undefeated-1763106462574.ndjson

# Import all files (PowerShell)
Get-ChildItem output\*.ndjson | ForEach-Object { 
    npm run import:firestore $_.FullName 
}
```

---

### Import to Both Databases

```powershell
# Import to Supabase
npm run import:supabase output\undefeated-*.ndjson

# Import to Firestore
npm run import:firestore output\undefeated-*.ndjson
```

---

## 🔍 Verify Data

### Supabase (SQL)
```powershell
node -e "import('@supabase/supabase-js').then(async ({createClient}) => { 
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); 
    const {count} = await sb.from('releases').select('*', {count: 'exact', head: true}); 
    console.log('Supabase:', count, 'releases'); 
})"
```

### Firestore (NoSQL)
```powershell
node -e "
import('firebase-admin').then(async (admin) => {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.default.apps.length) {
        admin.default.initializeApp({ credential: admin.default.credential.cert(serviceAccount) });
    }
    const db = admin.default.firestore();
    const snapshot = await db.collection('releases').limit(1).get();
    const total = await db.collection('releases').count().get();
    console.log('Firestore:', total.data().count, 'releases');
    process.exit(0);
});
"
```

---

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       SCRAPERS                               │
│  (30+ stores: Shopify, Nike, Footlocker, StockX, etc.)     │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
┌────────────────┐      ┌────────────────┐
│   FIRESTORE    │      │   SUPABASE     │
│   (NoSQL)      │      │   (PostgreSQL) │
│                │      │                │
│ - Legacy apps  │      │ - Real-time    │
│ - Firebase SDK │      │ - Row-level    │
│ - Offline      │      │   security     │
│   sync         │      │ - SQL queries  │
└────────┬───────┘      └────────┬───────┘
         │                       │
         ↓                       ↓
┌────────────────┐      ┌────────────────┐
│  Firebase UI   │      │   Next.js UI   │
│  (shoe-tracker)│      │  (web-nextjs)  │
└────────────────┘      └────────────────┘
```

---

## 🎛️ Configuration Options

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | Optional | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase admin key (for imports) |
| `FIREBASE_SERVICE_ACCOUNT` | Optional | Firebase service account JSON |
| `FIRESTORE_COLLECTION` | Optional | Firestore collection name (default: `releases`) |
| `API_BASE_URL` | Optional | API server URL (if using) |

**Note:** At least ONE database must be configured (Supabase OR Firestore). Both is recommended for redundancy.

---

## 🔧 Troubleshooting

### Firestore writes failing?

1. **Check service account:**
   ```powershell
   node -e "console.log(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id)"
   ```

2. **Verify Firestore is enabled:**
   - Go to Firebase Console → Firestore Database
   - Click "Create Database" if needed
   - Start in **Production mode**

3. **Check collection permissions:**
   - Firestore Rules → Allow service account writes:
   ```javascript
   service cloud.firestore {
     match /databases/{database}/documents {
       match /releases/{document=**} {
         allow read, write: if true; // Or use custom auth
       }
     }
   }
   ```

### Supabase writes failing?

1. **Verify table exists:**
   ```sql
   SELECT COUNT(*) FROM releases;
   ```

2. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'releases';
   ```

---

## 📁 File Locations

| What | Where |
|------|-------|
| **Firestore Handler** | `handlers/firestoreHandler.js` |
| **Release Handler** | `handlers/releaseHandler.js` (dual-write logic) |
| **Import Script** | `tools/import-to-firestore.js` |
| **Environment** | `.env` (in scrapers directory) |
| **Hourly Script** | `run-hourly.ps1` (auto-imports to both DBs) |

---

## 🎉 Benefits of Dual Writes

✅ **Redundancy** - Data in two databases  
✅ **Flexibility** - Use Firebase OR Supabase clients  
✅ **Real-time** - Supabase subscriptions for live updates  
✅ **Offline** - Firestore offline sync for mobile  
✅ **Migration** - Gradually move from Firebase → Supabase  
✅ **SQL + NoSQL** - Best of both worlds  

---

## 🚀 Next Steps

1. **Test dual writes:**
   ```powershell
   npm run scrape:shopify undefeated
   # Verify both databases have new data
   ```

2. **Update frontend to use Firestore:**
   - Already exists: `shoe-tracker/src/firebase.js`
   - Just set `VITE_FIREBASE_CONFIG_JSON` in `.env.local`

3. **Set up real-time listeners:**
   - Firestore: `onSnapshot(collection(db, 'releases'), ...)`
   - Supabase: `supabase.from('releases').on('INSERT', ...)`

4. **Enable automated hourly scraping:**
   - See `TASK-SCHEDULER-SETUP.md`
   - Will auto-import to both databases

---

Need help? Check:
- [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) - Full setup
- [QUICKSTART-SUPABASE.md](./QUICKSTART-SUPABASE.md) - Supabase only
- Firebase docs: https://firebase.google.com/docs/firestore
