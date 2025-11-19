# 📋 Quick Reference - Live Shoe Tracker

## 📍 Current Location
```
C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers
```

---

## ⚡ Most Common Commands

```powershell
# Test your setup
.\test-db-config.ps1

# Add Firestore (one-time)
.\setup-firestore.ps1 C:\path\to\serviceAccount.json

# Run ALL scrapers
npm run scrape:shopify

# Run specific stores
npm run scrape:shopify undefeated kith concepts

# Import to Supabase
npm run import:supabase output\undefeated-*.ndjson

# Import to Firestore
npm run import:firestore output\undefeated-*.ndjson

# Check recent files
Get-ChildItem output\*.ndjson | Sort-Object LastWriteTime -Descending | Select-Object -First 5

# Enable automation (run as Admin)
# See TASK-SCHEDULER-SETUP.md
```

---

## 🗄️ Databases

### Supabase (PostgreSQL)
- **URL:** https://npvqqzuofwojhbdlozgh.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/npvqqzuofwojhbdlozgh
- **Table:** `releases` (165 records)
- **Frontend:** Next.js (apps/web-nextjs)

### Firestore (NoSQL)
- **Setup:** `.\setup-firestore.ps1 <path>`
- **Console:** https://console.firebase.google.com
- **Collection:** `releases`
- **Frontend:** React Vite (shoe-tracker)

---

## 📦 Active Scrapers (30+)

### Major (8)
Nike, SNKRS, adidas, Footlocker, Champs, JD Sports, Finish Line, Hibbetts

### Boutiques (18)
Undefeated, Kith, Concepts, Bodega, A Ma Maniere, Union LA, Notre, Saint Alfred, Extra Butter, Social Status, BAIT, Oneness, Lapstone & Hammer, Atmos, Feature, Sneaker Politics, One Block Down

### EU (8)
End, Offspring, Size?, SNS, Solebox, Asphaltgold, Hanon, Kickz

### Resale (2)
StockX, Palace

### Regional (2)
DTLR, Shoe Palace

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `config.js` | Scraper configuration (all enabled) |
| `handlers/releaseHandler.js` | Dual-write logic (Firestore + Supabase) |
| `handlers/firestoreHandler.js` | Firestore batch operations |
| `tools/import-to-supabase.js` | Supabase import tool |
| `tools/import-to-firestore.js` | Firestore import tool |
| `.env` | Environment variables |
| `run-hourly.ps1` | Automated scraping script |

---

## 📖 Documentation

| Guide | When to Read |
|-------|--------------|
| `WHATS-NEW.md` | **Start here** - What changed today |
| `COMPLETE-SETUP-GUIDE.md` | Full setup walkthrough |
| `FIRESTORE-SUPABASE-SETUP.md` | Dual database setup |
| `TASK-SCHEDULER-SETUP.md` | Automation setup |
| `QUICKSTART-SUPABASE.md` | Supabase-only setup |

---

## 🔧 Environment Variables

**Required (at least one):**
```env
SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Optional (for dual DB):**
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIRESTORE_COLLECTION=releases
```

See `.env.example` for full template.

---

## 🚨 Troubleshooting

**Scrapers not finding data?**
- Check `output/*.ndjson` files exist
- Some stores need proxies (set `PROXY_URL`)

**Import failing?**
- Run `.\test-db-config.ps1`
- Check Supabase: table `releases` exists?
- Check Firestore: service account valid?

**Frontend not showing data?**
- Supabase: Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- Firebase: Set `VITE_FIREBASE_CONFIG_JSON`
- Check browser console for errors

---

## 📊 Check Data

**Supabase count:**
```powershell
node -e "import('@supabase/supabase-js').then(async ({createClient}) => { const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); const {count} = await sb.from('releases').select('*', {count: 'exact', head: true}); console.log(count); })"
```

**Firestore count:**
```powershell
node -e "import('firebase-admin').then(async (admin) => { const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); if (!admin.default.apps.length) { admin.default.initializeApp({ credential: admin.default.credential.cert(serviceAccount) }); } const db = admin.default.firestore(); const snapshot = await db.collection('releases').count().get(); console.log(snapshot.data().count); process.exit(0); })"
```

---

## 🎯 Data Flow

```
Scrapers (30+ stores)
    ↓
┌───────────────────┐
│ releaseHandler.js │
└───────┬───────────┘
        │
   ┌────┴─────┬─────────┬──────────┐
   ↓          ↓         ↓          ↓
API Server  Firestore  Supabase  NDJSON
(optional)  (NoSQL)    (SQL)     (backup)
```

---

## 🔗 Quick Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/npvqqzuofwojhbdlozgh)
- [Firebase Console](https://console.firebase.google.com)
- [Frontend (local)](http://localhost:5175)
- [API Docs](../../apps/api-server/README.md)

---

## 💡 Pro Tips

1. **Always have NDJSON backups** - They're generated regardless of DB config
2. **Use dual writes** - Redundancy prevents data loss
3. **Test before automation** - Run `.\test-db-config.ps1` first
4. **Monitor hourly runs** - Check Task Scheduler history
5. **Keep `.env` secure** - Contains sensitive credentials

---

*Last updated: Setup completion with ALL stores enabled + Firestore integration*
