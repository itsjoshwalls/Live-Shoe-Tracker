# Live Shoe Tracker - Full Implementation Guide

## 📋 Overview

This implementation plan covers the complete revamp of the Live Shoe Tracker system with:
- **30+ retailer scrapers** (Nike, Adidas, Foot Locker, Kith, END., etc.)
- **9 core handlers** (releases, stats, retailers, stock, alerts, user alerts, queue, scheduler, metrics)
- **Firestore collections** (releases, retailers, users, alerts, stats, queues, etc.)
- **Real-time updates** and **cloud automation**
- **Multi-user watchlists** and **custom alerts**

---

## 🗂️ Firestore Collections Schema

### Core Collections
1. **`releases/`** - Central release entity (denormalized for fast queries)
2. **`retailers/`** - Retailer metadata (logos, APIs, regions)
3. **`products/`** - Product catalog (sneaker details, SKUs)
4. **`regions/`** - Geographic regions (US, EU, AS)
5. **`categories/`** - Shoe categories (basketball, running, lifestyle)

### User Collections
6. **`users/`** - User profiles and preferences
7. **`user_watchlists/`** - Per-user release subscriptions
8. **`users/{uid}/alerts/`** - User-specific alert settings
9. **`users/{uid}/shoes/`** - Private shoe collection (mileage tracking)

### System Collections
10. **`releaseStats/`** - Aggregated stats for real-time UI
11. **`stats/daily/days/`** - Daily aggregations (new releases, price averages)
12. **`inventory_snapshots/`** - Stock level snapshots
13. **`releases/{id}/stock_snapshots/`** - Per-release stock history
14. **`alerts/`** - Global alert queue
15. **`queues/`** - Scraper job queue
16. **`queue_results/`** - Job execution results
17. **`metrics/`** - App-wide counters (total releases, scraper runs)
18. **`logs/`** - Event logs (alerts sent, errors)
19. **`changelog/`** - Audit trail

---

## 🔐 Security Rules

**Deployed:** `firestore.rules`

### Key Principles
- **Users**: Read/write only their own data (`users/{uid}`, `user_watchlists/{uid}`, `users/{uid}/shoes`)
- **Public data**: Read-only for all users (`releases`, `retailers`, `products`, `regions`, `categories`)
- **Admin-only writes**: All ingestion paths require `admin == true` custom claim
- **Server-only**: Stats, queues, metrics, logs (admin or server SDK only)
- **Community chat**: Authenticated users can read and create messages

---

## 📊 Composite Indexes

**Deployed:** `firestore.indexes.json`

### Indexes Created
1. `releases` by `retailerId` + `releaseDate` (ASC)
2. `releases` by `status` + `releaseDate` (ASC)
3. `releases` by `productId` + `retailerId` (ASC)
4. `releases` by `region` + `releaseDate` (ASC)
5. `inventory_snapshots` by `releaseId` + `timestamp` (DESC)
6. `alerts` by `userId` + `createdAt` (DESC)
7. `stock_snapshots` by `releaseId` + `timestamp` (DESC)

---

## ☁️ Cloud Functions

### Directory Structure
```
functions/
├── index.js                    # Main exports
├── config.js                   # Global config (scrapers, intervals)
├── package.json                # Dependencies
├── handlers/
│   ├── releaseHandler.js       # CRUD + history tracking
│   ├── statsHandler.js         # Daily stats + real-time aggregation
│   ├── retailerHandler.js      # Retailer metadata management
│   ├── stockHandler.js         # Stock snapshot recording
│   ├── alertsHandler.js        # Discord/Slack webhooks
│   ├── userAlertsHandler.js    # Per-user alert triggers
│   ├── scraperQueueHandler.js  # Job queue management
│   ├── schedulerHandler.js     # Cron scheduler
│   └── metricsHandler.js       # Metrics endpoint + counters
├── scrapers/
│   ├── core/
│   │   ├── baseScraper.js      # Retry logic + module loader
│   │   └── utils.js            # safeFetch, delay helpers
│   ├── nike.js
│   ├── adidas.js
│   ├── footlocker.js
│   └── ... (30+ scrapers)
└── scripts/
    ├── createScrapers.js       # Generator for scraper stubs
    └── seedFirestore.js        # Initial data seeding
```

### Functions Deployed

#### HTTP Endpoints
- `runScraper` - Manually trigger a specific retailer scraper
- `onReleaseIngest` - Callable function for release ingestion
- `health` - Health check endpoint
- `metrics` - Metrics endpoint (JSON, Prometheus-compatible)

#### Scheduled Functions
- `runAllScrapers` - Runs every 20 minutes, processes all scrapers in batches
- `finalizeDailyStats` - Runs daily at midnight UTC, aggregates stats
- `scheduleScraperJobs` - Runs daily at 02:00 UTC, queues scraper jobs

#### Firestore Triggers
- `onReleaseCreated` - Updates stats when new release added
- `onReleaseUpdated` - Updates stats when release modified
- `onReleaseStatusChange` - Sends alerts on status change (LIVE, RAFFLE OPEN, RESTOCK)
- `onInventorySnapshot` - Updates releaseStats when stock changes
- `onQueueJobCreated` - Processes queued scraper jobs
- `onReleaseTriggerUserAlerts` - Sends user-specific alerts

---

## 🕷️ Scraper Architecture

### Supported Retailers (31 Total)
1. Nike
2. Adidas
3. Foot Locker
4. Champs Sports
5. JD Sports
6. Nike SNKRS
7. Finish Line
8. Hibbett Sports
9. Undefeated
10. Concepts
11. Kith
12. Bodega
13. END Clothing
14. Offspring
15. Sneakersnstuff
16. Lapstone & Hammer
17. Extra Butter
18. atmos
19. Social Status
20. A Ma Maniére
21. size?
22. One Block Down
23. Solebox
24. Asphaltgold
25. Hanon
26. Feature
27. Kickz
28. BAIT
29. Oneness
30. Palace
31. StockX

### Scraper Features
- **Retry logic**: 3 attempts with 3s delay
- **Batch execution**: 6 scrapers in parallel (avoid timeouts)
- **Normalization**: Each scraper normalizes to standard schema
- **Error handling**: Logs failures, continues with next scraper

### Standard Release Schema
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
  "releaseType": "online"
}
```

---

## 📈 Stats & Aggregation

### Daily Stats (`stats/daily/days/YYYY-MM-DD`)
```json
{
  "newReleases": 42,
  "updatedReleases": 19,
  "retailers": {
    "nike": {
      "new": 20,
      "updated": 4,
      "priceSum": 4100,
      "priceCount": 20
    }
  },
  "summary": {
    "nike": { "new": 20, "updated": 4, "avgPrice": 205.00 }
  },
  "finalizedAt": "<timestamp>"
}
```

### Release Stats (`releaseStats/{releaseId}`)
```json
{
  "isLive": true,
  "totalAvailable": 120,
  "lastSnapshotAt": "2025-11-04T18:00:00Z",
  "updatedAt": "2025-11-04T18:00:05Z"
}
```

---

## 🔔 Alert System

### Alert Types
1. **Status Change** - Release goes LIVE, RAFFLE OPEN, or RESTOCK
2. **Stock Change** - Inventory becomes available
3. **User Subscriptions** - Custom watchlist triggers

### Delivery Channels
- **Discord** - Webhook integration
- **Slack** - Webhook integration
- **Email** - (Stub for SendGrid/Resend integration)
- **Push** - (Future: FCM integration)

### Configuration
Set webhook URLs via Firebase config:
```bash
firebase functions:config:set alerts.discord_webhook="https://discord.com/api/webhooks/..."
firebase functions:config:set alerts.slack_webhook="https://hooks.slack.com/services/..."
```

---

## 🚀 Deployment Steps

### 1. Prerequisites
```bash
cd shoe-tracker
npm install -g firebase-tools
firebase login
```

### 2. Install Dependencies
```bash
cd functions
npm install
```

### 3. Deploy Security Rules & Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Seed Initial Data
```bash
cd functions
node scripts/seedFirestore.js
```

### 5. Deploy All Functions
```bash
firebase deploy --only functions
```

### 6. Configure Alerts (Optional)
```bash
firebase functions:config:set alerts.discord_webhook="YOUR_WEBHOOK"
firebase functions:config:set alerts.slack_webhook="YOUR_WEBHOOK"
firebase deploy --only functions  # Redeploy to pick up config
```

### 7. Test Endpoints
```bash
# Health check
curl https://us-central1-YOUR_PROJECT.cloudfunctions.net/health

# Metrics
curl https://us-central1-YOUR_PROJECT.cloudfunctions.net/metrics

# Run single scraper
curl "https://us-central1-YOUR_PROJECT.cloudfunctions.net/runScraper?retailer=nike"
```

---

## 📊 Monitoring & Cost Control

### Firebase Console
1. Enable **Firestore usage monitoring**
2. Set **budget alerts** for Cloud Functions
3. Configure **export backups** to Cloud Storage

### Metrics Endpoint
Access at `/metrics` for Grafana/Prometheus integration:
```
total_releases_count 543
total_retailers_count 31
total_users_count 120
scraper_runs_count 92
alerts_sent_count 45
```

---

## 🖥️ Frontend Integration

### Update Required Components

1. **SneakerReleases.jsx** - Read from `releases` collection
2. **Watchlist Component** - CRUD for `user_watchlists`
3. **Alerts Component** - Display `alerts` for current user
4. **Release Detail** - Show `releaseStats` for live data

### Example Queries
```js
// Fetch all releases
db.collection('releases')
  .where('status', '==', 'upcoming')
  .orderBy('releaseDate', 'asc')
  .onSnapshot(snapshot => { ... });

// User watchlist
db.collection('user_watchlists')
  .doc(userId)
  .onSnapshot(doc => { ... });

// User alerts
db.collection('alerts')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => { ... });
```

---

## ✅ Implementation Checklist

### Backend
- [x] Firestore security rules
- [x] Composite indexes
- [x] Cloud Functions structure
- [x] 9 core handlers
- [x] 31 retailer scrapers
- [x] Scheduled jobs (scraping, stats finalization)
- [x] Firestore triggers (releases, stats, alerts)
- [x] HTTP endpoints (health, metrics, manual scraper)
- [x] Seeding script

### Frontend
- [ ] Update `SneakerReleases.jsx` to read from `releases` collection
- [ ] Add watchlist UI
- [ ] Add alerts UI
- [ ] Display `releaseStats` for live updates
- [ ] Support Google + anonymous sign-in

### DevOps
- [ ] Deploy rules & indexes
- [ ] Run seeding script
- [ ] Deploy all functions
- [ ] Configure alert webhooks
- [ ] Enable cost monitoring
- [ ] Set up export backups

---

## 📖 Next Steps

1. **Deploy backend**: `firebase deploy --only functions,firestore:rules,firestore:indexes`
2. **Seed data**: `node functions/scripts/seedFirestore.js`
3. **Update frontend**: Refactor components to use new collections
4. **Test scrapers**: Manually trigger via HTTP endpoint
5. **Monitor**: Check Firebase Console for function execution and errors
6. **Scale**: Adjust `scrapeIntervalMinutes` and `parallelScrapers` in `config.js`

---

## 🆘 Troubleshooting

### Functions not deploying
- Ensure Node.js 18+ is installed
- Check `package.json` for correct dependencies
- Verify Firebase project is selected: `firebase use --add`

### Scrapers failing
- Check retailer API URLs in scraper files
- Review logs: `firebase functions:log`
- Test individual scraper: `curl "...runScraper?retailer=nike"`

### Missing data in Firestore
- Run seeding script: `node functions/scripts/seedFirestore.js`
- Check security rules allow reads

---

## 📚 Resources

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Discord Webhooks](https://discord.com/developers/docs/resources/webhook)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)

---

**Built with ❤️ for sneakerheads worldwide 👟**
