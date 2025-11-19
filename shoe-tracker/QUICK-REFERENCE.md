# Live Shoe Tracker - Quick Reference Card

## 🚀 Quick Deploy

```powershell
cd shoe-tracker
.\Deploy-Functions.ps1
```

Or manual:
```bash
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,firestore:indexes,functions
node functions/scripts/seedFirestore.js
```

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `firestore.rules` | Security rules (19 collections) |
| `firestore.indexes.json` | 7 composite indexes |
| `functions/index.js` | Main Cloud Functions exports |
| `functions/config.js` | Global config (31 scrapers, intervals) |
| `functions/handlers/` | 9 core handlers |
| `functions/scrapers/` | 31 retailer scrapers + core utils |
| `IMPLEMENTATION-GUIDE.md` | Full documentation (300+ lines) |
| `IMPLEMENTATION-SUMMARY.md` | What's been completed |

---

## ☁️ Cloud Functions

### HTTP Endpoints
- `GET /health` - Health check
- `GET /metrics` - Metrics (JSON, Prometheus-compatible)
- `GET /runScraper?retailer=nike` - Manual scraper trigger
- `POST onReleaseIngest` - Callable function for release ingestion

### Scheduled
- `runAllScrapers` - Every 20 min (batched, 6 parallel)
- `finalizeDailyStats` - Midnight UTC (aggregates daily stats)
- `scheduleScraperJobs` - 02:00 UTC (queues jobs)

### Firestore Triggers
- `onReleaseCreated` - Updates stats
- `onReleaseUpdated` - Updates stats
- `onReleaseStatusChange` - Sends alerts (LIVE, RAFFLE OPEN, RESTOCK)
- `onInventorySnapshot` - Updates releaseStats
- `onQueueJobCreated` - Processes queued jobs
- `onReleaseTriggerUserAlerts` - User-specific alerts

---

## 🗂️ Firestore Collections

### Core
- `releases` - Central release entity (denormalized)
- `retailers` - Retailer metadata
- `products` - Product catalog
- `regions` - Geographic regions
- `categories` - Shoe categories

### User
- `users` - User profiles
- `user_watchlists` - Per-user subscriptions
- `users/{uid}/alerts` - User alert settings
- `users/{uid}/shoes` - Private shoe collection

### System
- `releaseStats` - Real-time aggregations
- `stats/daily/days` - Daily stats
- `inventory_snapshots` - Stock snapshots
- `releases/{id}/stock_snapshots` - Per-release history
- `alerts` - Global alert queue
- `queues` - Scraper job queue
- `queue_results` - Job results
- `metrics` - App-wide counters
- `logs` - Event logs
- `changelog` - Audit trail

---

## 🕷️ Scrapers (31 Total)

### Big Box
Nike, Adidas, Foot Locker, Champs Sports, JD Sports, Nike SNKRS, Finish Line, Hibbett Sports

### Boutiques
Undefeated, Concepts, Kith, Bodega, Lapstone & Hammer, Extra Butter, atmos, Social Status, A Ma Maniére, Feature, BAIT, Oneness

### European
END Clothing, Offspring, Sneakersnstuff, size?, One Block Down, Solebox, Asphaltgold, Hanon, Kickz

### Other
Palace, StockX

---

## 🔔 Configure Alerts

```bash
firebase functions:config:set alerts.discord_webhook="https://discord.com/api/webhooks/..."
firebase functions:config:set alerts.slack_webhook="https://hooks.slack.com/services/..."
firebase deploy --only functions
```

---

## 🧪 Test Endpoints

```bash
# Health check
curl https://us-central1-YOUR_PROJECT.cloudfunctions.net/health

# Metrics
curl https://us-central1-YOUR_PROJECT.cloudfunctions.net/metrics

# Manual scraper
curl "https://us-central1-YOUR_PROJECT.cloudfunctions.net/runScraper?retailer=nike"
```

---

## 📊 Data Models

### Release Schema
```json
{
  "id": "nike-12345",
  "retailerId": "nike",
  "retailerName": "Nike",
  "productName": "Air Jordan 1 Retro High OG",
  "releaseDate": "2025-12-20T10:00:00Z",
  "price": 180,
  "currency": "USD",
  "status": "upcoming",
  "url": "https://www.nike.com/launch/t/air-jordan-1",
  "region": "US",
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>",
  "history": [{"event": "created", "timestamp": "...", "price": 180}]
}
```

### Release Stats Schema
```json
{
  "isLive": true,
  "totalAvailable": 120,
  "lastSnapshotAt": "2025-11-04T18:00:00Z",
  "updatedAt": "2025-11-04T18:00:05Z"
}
```

### Daily Stats Schema
```json
{
  "newReleases": 42,
  "updatedReleases": 19,
  "retailers": {
    "nike": {"new": 20, "updated": 4, "priceSum": 4100, "priceCount": 20}
  },
  "summary": {
    "nike": {"new": 20, "updated": 4, "avgPrice": 205.00}
  }
}
```

---

## 🛠️ Frontend Integration

### Query Releases
```js
db.collection('releases')
  .where('status', '==', 'upcoming')
  .orderBy('releaseDate', 'asc')
  .onSnapshot(snapshot => { ... });
```

### Query User Watchlist
```js
db.collection('user_watchlists')
  .doc(userId)
  .onSnapshot(doc => { ... });
```

### Query User Alerts
```js
db.collection('alerts')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => { ... });
```

### Query Release Stats
```js
db.collection('releaseStats')
  .doc(releaseId)
  .onSnapshot(doc => {
    const { isLive, totalAvailable } = doc.data();
  });
```

---

## ✅ Implementation Status

### ✅ Backend Complete (8/8)
- Firestore rules & indexes
- 9 core handlers
- 31 retailer scrapers
- All triggers (HTTP, scheduled, Firestore)
- Seeding script
- Deployment script
- Full documentation

### 🔄 Frontend Pending (4/4)
- Update components to use `releases` collection
- Add watchlist UI
- Add alerts UI
- Display `releaseStats`

---

## 📚 Documentation

- **IMPLEMENTATION-GUIDE.md** - Full guide (300+ lines)
- **IMPLEMENTATION-SUMMARY.md** - What's completed
- **Deploy-Functions.ps1** - Automated deployment
- **README.md** - Project overview

---

## 🆘 Troubleshooting

### Functions not deploying
```bash
firebase use --add  # Select project
firebase login      # Re-authenticate
```

### Scrapers failing
```bash
firebase functions:log  # Check logs
```

### Missing data
```bash
node functions/scripts/seedFirestore.js  # Re-seed
```

---

**Built with ❤️ for sneakerheads worldwide 👟**
