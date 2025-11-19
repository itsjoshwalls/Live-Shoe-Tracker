# 🚀 Live Shoe Tracker - Local Development Setup

## 📁 Directory Structure

```
/Live-Shoe-Tracker
│
├── functions/
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── releaseHandler.js
│   │   │   ├── retailerHandler.js
│   │   │   ├── stockHandler.js
│   │   │   ├── alertsHandler.js
│   │   │   ├── userAlertsHandler.js
│   │   │   ├── scraperQueueHandler.js
│   │   │   ├── schedulerHandler.js
│   │   │   └── metricsHandler.js
│   │   │
│   │   ├── utils/
│   │   │   ├── firestore.js
│   │   │   ├── logger.js
│   │   │   ├── notifications.js
│   │   │   └── seedFirestore.js
│   │   │
│   │   └── index.js
│   │
│   ├── .env.example
│   └── package.json
│
├── firestore.indexes.json
├── firestore.seed.json
├── firestore.rules
└── firebase.json
```

## 🛠️ Setup Instructions

### 1️⃣ Install Dependencies

```powershell
cd functions
npm install
```

### 2️⃣ Configure Environment Variables

1. Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

2. Update `functions/.env` with your credentials:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-id
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook-url
PROJECT_ID=live-sneaker-tracker
REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

### 3️⃣ Generate Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to: **Settings → Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `functions/serviceAccountKey.json`

⚠️ **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore`!

### 4️⃣ Seed Firestore (First Time Only)

```powershell
cd functions
npm run seed
```

This will populate:
- ✅ 4 categories (Running, Basketball, Lifestyle, Skate)
- ✅ 4 regions (US, UK, EU, JP)
- ✅ 5 retailers (Nike, Adidas, Footlocker, SNS, END)

### 5️⃣ Start Emulators

From the **project root** directory:

```powershell
cd ..
firebase emulators:start
```

Or from the `functions` directory:

```powershell
npm run dev
```

This will start:
- 🔥 Firestore Emulator: `localhost:8080`
- ⚙️ Functions Emulator: `localhost:5001`
- 🎨 Emulator UI: `localhost:4000`

### 6️⃣ Deploy Firestore Indexes & Rules

```powershell
# Deploy indexes
firebase deploy --only firestore:indexes

# Deploy security rules
firebase deploy --only firestore:rules
```

### 7️⃣ Deploy Cloud Functions (Production)

```powershell
cd functions
npm run deploy
```

## 🔥 Cloud Functions Deployed

### Firestore Triggers
- `onReleaseWrite` - Triggers on any release document change
- `onRetailerWrite` - Triggers on any retailer document change
- `onStockWrite` - Triggers on stock snapshot changes
- `onQueueJob` - Processes scraper queue jobs

### Scheduled Functions
- `sendAlertNotifications` - Runs every 5 minutes
- `runScheduledScraper` - Runs every 30 minutes
- `collectSystemMetrics` - Runs every 1 hour

## 📊 Firestore Collections

| Collection | Description | Security |
|------------|-------------|----------|
| `users` | User profiles | User-owned |
| `users/{uid}/alerts` | User alert preferences | User-owned |
| `releases` | Sneaker releases | Public read, admin write |
| `releases/{id}/stock_snapshots` | Stock history | Public read, admin write |
| `retailers` | Retailer metadata | Public read, admin write |
| `queues` | Scraper job queue | Admin-only |
| `metrics` | System metrics | Admin-only |
| `categories` | Sneaker categories | Public read, admin write |
| `regions` | Geographic regions | Public read, admin write |
| `alerts` | Pending alerts | Admin-only |

## 🧪 Testing Locally

### Test Firestore Triggers

1. Open Emulator UI: `http://localhost:4000`
2. Navigate to **Firestore**
3. Create/modify documents in `releases` collection
4. Check **Logs** tab to see trigger executions

### Test Scheduled Functions

In the Emulator UI, go to **Functions** and manually trigger:
- `sendAlertNotifications`
- `runScheduledScraper`
- `collectSystemMetrics`

### View Logs

```powershell
# Production logs
firebase functions:log

# Local emulator logs
# Check terminal where emulators are running
```

## 🔐 Security Notes

1. **Never commit** `serviceAccountKey.json`
2. **Never commit** `.env` files
3. Set admin claims for privileged users:

```javascript
admin.auth().setCustomUserClaims(uid, { admin: true });
```

## 🚨 Common Issues

### "Cannot find module 'firebase-admin'"
```powershell
cd functions
npm install
```

### "Permission denied" errors
- Check Firestore rules in `firestore.rules`
- Verify user has `admin: true` custom claim for protected operations

### Emulators won't start
```powershell
# Kill existing processes
Get-Process -Name "java" | Stop-Process -Force

# Restart emulators
firebase emulators:start
```

## 📚 Next Steps

1. ✅ Set up Discord/Slack webhooks for alerts
2. ✅ Configure Firebase Authentication
3. ✅ Connect frontend to Firestore collections
4. ✅ Add scraper implementations in `handlers/scraperQueueHandler.js`
5. ✅ Set up monitoring dashboard (Grafana/Prometheus)

## 🎯 Production Deployment Checklist

- [ ] Update `.env` with production webhooks
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy indexes: `firebase deploy --only firestore:indexes`
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Seed production data: Update `firestore.seed.json` and import
- [ ] Set up Firebase Authentication
- [ ] Configure custom claims for admin users
- [ ] Enable billing for Cloud Functions
- [ ] Set up monitoring and alerts

---

**Need Help?** Check the [Firebase Documentation](https://firebase.google.com/docs) or review handler code in `functions/src/handlers/`.
