# 🚀 Quick Start - Live Shoe Tracker

## ⚡ One-Command Setup

```powershell
# 1. Install dependencies
cd c:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\functions
npm install

# 2. Copy environment template
Copy-Item .env.example .env

# 3. Download service account key from Firebase Console
# Save as: functions/serviceAccountKey.json

# 4. Seed initial data
npm run seed

# 5. Start emulators (from project root)
cd ..
firebase emulators:start
```

## 📋 Common Commands

### Development
```powershell
# Start local emulators
firebase emulators:start

# Start only functions + firestore
npm run dev --prefix functions

# Seed Firestore
npm run seed --prefix functions
```

### Deployment
```powershell
# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes
```

### Logs & Debugging
```powershell
# View function logs (production)
firebase functions:log

# View specific function
firebase functions:log --only onReleaseWrite

# Watch logs in real-time
firebase functions:log --follow
```

## 🔗 Emulator URLs

| Service | URL |
|---------|-----|
| Emulator UI | http://localhost:4000 |
| Firestore | http://localhost:8080 |
| Functions | http://localhost:5001 |

## 📂 File Structure

```
functions/
├── src/
│   ├── handlers/          # 8 Cloud Function handlers
│   ├── utils/             # Firestore, logger, notifications
│   └── index.js           # Main exports
├── .env                   # Your secrets (gitignored)
├── .env.example           # Template
└── package.json           # Dependencies & scripts
```

## 🔥 Cloud Functions Triggers

| Function | Type | Trigger |
|----------|------|---------|
| `onReleaseWrite` | Firestore | `releases/{id}` write |
| `onRetailerWrite` | Firestore | `retailers/{id}` write |
| `onStockWrite` | Firestore | `stock_snapshots/{id}` write |
| `onQueueJob` | Firestore | `queues/{id}` create |
| `sendAlertNotifications` | Scheduled | Every 5 min |
| `runScheduledScraper` | Scheduled | Every 30 min |
| `collectSystemMetrics` | Scheduled | Every 1 hour |

## 🗄️ Firestore Collections

```
releases/                    # Public sneaker releases
  └── {id}/stock_snapshots/  # Stock history subcollection
retailers/                   # Retailer metadata
users/                       # User profiles
  └── {uid}/alerts/          # User alert preferences
queues/                      # Scraper job queue
metrics/                     # System metrics
categories/                  # Sneaker categories
regions/                     # Geographic regions
alerts/                      # Pending notifications
```

## 🔐 Security Rules Summary

| Collection | Read | Write |
|------------|------|-------|
| `users/{uid}` | Owner only | Owner only |
| `users/{uid}/alerts` | Owner only | Owner only |
| `releases` | Public | Admin only |
| `retailers` | Public | Admin only |
| `categories` | Public | Admin only |
| `regions` | Public | Admin only |
| `queues` | Admin only | Admin only |
| `metrics` | Admin only | Admin only |

## 🛠️ Troubleshooting

### Emulators won't start
```powershell
# Kill Java processes
Get-Process -Name "java" | Stop-Process -Force
firebase emulators:start
```

### Missing dependencies
```powershell
cd functions
npm install
```

### Seed data not loading
```powershell
# Verify service account key exists
Test-Path functions/serviceAccountKey.json

# Run seed script
npm run seed --prefix functions
```

## 📊 Environment Variables

Copy from `.env.example` to `.env`:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx
PROJECT_ID=live-sneaker-tracker
REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

## 🎯 Next Steps

1. ✅ Get Firebase service account key
2. ✅ Update `.env` with webhooks
3. ✅ Run `npm run seed`
4. ✅ Start emulators with `firebase emulators:start`
5. ✅ Test functions in Emulator UI (http://localhost:4000)
6. ✅ Deploy to production: `firebase deploy`

---

**Full Guide:** See [SETUP-GUIDE.md](./SETUP-GUIDE.md)
