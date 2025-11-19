# Firestore Integration Examples

## Overview

The scrapers package includes three optional Firestore handlers that activate when `FIREBASE_SERVICE_ACCOUNT` is set:

1. **statsHandler** - Daily stats aggregation
2. **retailerHandler** - Retailer metadata management
3. **stockHandler** - Stock level tracking with snapshots

## Setup

### 1. Create Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file (e.g., `service-account.json`)

### 2. Configure Environment

```powershell
# PowerShell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw

# Bash/Linux
export FIREBASE_SERVICE_ACCOUNT=$(cat /path/to/service-account.json)
```

### 3. Run Scrapers

```bash
pnpm run start kith
```

## Firestore Structure Created

```
retailers/
  kith/
    retailerId: "kith"
    retailerName: "Kith"
    region: "US"
    logoUrl: "https://logo.clearbit.com/kith.com"
    apiUrl: "https://kith.com/collections/footwear"
    createdAt: 2025-11-04T20:00:00Z
    updatedAt: 2025-11-04T20:00:00Z

  nike/
    retailerId: "nike"
    retailerName: "Nike"
    region: "US"
    logoUrl: "https://logo.clearbit.com/nike.com"
    ...

releases/
  kith-555088701/
    name: "Air Jordan 1 High OG"
    sku: "555088701"
    liveStock:
      "US_9": { total: 50, available: 20 }
      "US_10": { total: 60, available: 0 }
    stockUpdatedAt: 2025-11-04T20:05:00Z
    
    stock_snapshots/
      auto-generated-id-1:
        stock:
          "US_9": { total: 50, available: 30 }
          "US_10": { total: 60, available: 10 }
        timestamp: 2025-11-04T18:00:00Z
      
      auto-generated-id-2:
        stock:
          "US_9": { total: 50, available: 20 }
          "US_10": { total: 60, available: 0 }
        timestamp: 2025-11-04T20:05:00Z

stats_daily/
  2025-11-04/
    created_count: 150
    updated_count: 25
    scrapers_run: ["kith", "extraButter"]
    avg_price: 165.50
    finalized: true
    finalized_at: 2025-11-05T00:10:00Z
```

## Handler Details

### 1. Retailer Handler

**Auto-creates retailer metadata** when releases are scraped:

```javascript
// Called automatically in index.js
await ensureRetailerMetadata({
  retailerId: "kith",
  retailerName: "Kith",
  region: "US",
  apiUrl: "https://kith.com/collections/footwear",
  rafflePattern: null
});
```

**Features**:
- Creates retailer doc on first scrape
- Updates only changed fields on subsequent runs
- Auto-generates logo URLs via Clearbit
- Tracks creation and update timestamps

**Query retailers**:
```javascript
import { getAllRetailers } from './handlers/retailerHandler.js';

const retailers = await getAllRetailers();
console.log(retailers.length, 'retailers tracked');
```

### 2. Stock Handler

**Records stock level changes** with deduplication:

```javascript
// Called automatically when release has stock data
await recordStockSnapshot('kith-555088701', {
  "US_9": { total: 50, available: 20 },
  "US_10": { total: 60, available: 0 }
});
```

**Features**:
- Stores snapshots in subcollection
- Compares with last snapshot to avoid duplicates
- Updates parent release with `liveStock` summary
- Useful for monitoring stock trends over time

**Analyze stock**:
```javascript
import { summarizeStock } from './handlers/stockHandler.js';

const summary = summarizeStock({
  "US_9": { total: 50, available: 20 },
  "US_10": { total: 60, available: 0 }
});
// { total: 110, available: 20 }
```

### 3. Stats Handler

**Aggregates daily scraping metrics**:

```javascript
// Called automatically after each scrape
await updateStats('kith', releases);
```

**Features**:
- Counts created/updated releases per day
- Tracks scrapers that ran
- Calculates average prices
- Finalize computes summaries (via `pnpm run stats:finalize`)

## Custom Scraper Integration

When implementing custom scrapers, provide stock data in this format:

```javascript
// In your custom scraper's fetchReleases()
{
  name: "Air Jordan 1",
  sku: "555088701",
  retailer: "footlocker",
  region: "US",
  
  // Stock data (optional but recommended)
  stock: {
    "US_9": { total: 50, available: 20 },
    "US_10": { total: 60, available: 0 },
    "US_11": { total: 40, available: 15 }
  },
  
  // Or simple size list (converts to stock format)
  sizes: ["US_9", "US_10", "US_11"],
  
  // Retailer metadata enrichment (optional)
  rafflePattern: "footlocker.com/release-calendar"
}
```

The handlers will automatically:
1. Create/update `retailers/footlocker`
2. Record stock snapshot under `releases/footlocker-555088701/stock_snapshots/`
3. Update daily stats

## Querying Firestore Data

### Get All Retailers
```javascript
const db = admin.firestore();
const snapshot = await db.collection('retailers').get();
const retailers = snapshot.docs.map(doc => doc.data());
```

### Get Stock History for Release
```javascript
const releaseId = 'kith-555088701';
const snapshots = await db
  .collection('releases')
  .doc(releaseId)
  .collection('stock_snapshots')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get();

const history = snapshots.docs.map(doc => ({
  stock: doc.data().stock,
  timestamp: doc.data().timestamp.toDate()
}));
```

### Get Daily Stats
```javascript
const date = '2025-11-04';
const statsDoc = await db.collection('stats_daily').doc(date).get();
const stats = statsDoc.data();
console.log(`${stats.created_count} releases on ${date}`);
```

## Dashboard Integration

Use this Firestore data to build dashboards:

### Retailer Coverage
```sql
SELECT COUNT(*) as total_retailers,
       COUNT(CASE WHEN region = 'US' THEN 1 END) as us_retailers
FROM retailers
```

### Stock Availability Trend
```javascript
// Chart stock decline over time for a release
const releaseId = 'kith-555088701';
const snapshots = await getStockSnapshots(releaseId);

const chartData = snapshots.map(s => ({
  timestamp: s.timestamp,
  available: Object.values(s.stock).reduce((sum, size) => sum + size.available, 0)
}));
```

### Daily Scrape Performance
```javascript
// Last 7 days scraping activity
const last7Days = Array.from({length: 7}, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i);
  return d.toISOString().split('T')[0];
});

const stats = await Promise.all(
  last7Days.map(date => 
    db.collection('stats_daily').doc(date).get()
  )
);

const performance = stats.map((doc, i) => ({
  date: last7Days[i],
  releases: doc.data()?.created_count || 0,
  scrapers: doc.data()?.scrapers_run?.length || 0
}));
```

## Security Rules

Add these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read for retailers and releases
    match /retailers/{retailerId} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated writes
    }
    
    match /releases/{releaseId} {
      allow read: if true;
      allow write: if request.auth != null;
      
      // Stock snapshots subcollection
      match /stock_snapshots/{snapshotId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
    
    // Stats only writable by service account
    match /stats_daily/{date} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

## Troubleshooting

### Handlers Not Running
```bash
# Check if FIREBASE_SERVICE_ACCOUNT is set
echo $env:FIREBASE_SERVICE_ACCOUNT  # PowerShell
echo $FIREBASE_SERVICE_ACCOUNT      # Bash

# Verify JSON is valid
echo $env:FIREBASE_SERVICE_ACCOUNT | ConvertFrom-Json
```

### Permission Errors
- Ensure service account has "Cloud Datastore User" role
- Check Firestore security rules allow writes
- Verify project ID matches in service account JSON

### Stock Not Recording
- Check that releases have `sku` field (used as part of document ID)
- Verify stock data format matches expected structure
- Look for "No stock change" logs (deduplication working)

## Best Practices

1. **Run scrapers on schedule** to build stock history
2. **Finalize stats daily** at UTC midnight: `pnpm run stats:finalize:utc`
3. **Monitor Firestore usage** in Firebase Console (quota limits)
4. **Index frequently queried fields** (sku, retailerId, timestamp)
5. **Set up backups** in Firestore settings
6. **Use subcollections** for time-series data (stock_snapshots)

## Next Steps

- [ ] Implement stock scraping in custom store scrapers
- [ ] Add retailer region auto-detection from domain
- [ ] Build dashboard to visualize stock trends
- [ ] Set up alerts for low stock situations
- [ ] Export stats to BigQuery for advanced analytics
