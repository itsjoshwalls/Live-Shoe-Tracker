# BigQuery Analytics Setup Guide

This guide explains how to set up Firestore to BigQuery exports for advanced time-series analytics.

## 📊 Why BigQuery?

While the current Next.js app provides **real-time analytics** using Firestore aggregations, BigQuery enables:
- **Historical trend analysis** (e.g., "How have raffle counts changed over 6 months?")
- **Time-series queries** (e.g., "Weekly active users growth")
- **Complex SQL analytics** (e.g., "Average raffle duration by retailer")
- **Looker Studio dashboards** with interactive charts and filters

## 🔧 Setup Methods

### Method 1: Firebase Console (Recommended for Quick Setup)

1. **Navigate to Firestore Settings**
   - Open [Firebase Console](https://console.firebase.google.com/project/live-sneaker-release-tracker/firestore)
   - Go to **Firestore Database** → **Settings** (gear icon)

2. **Enable BigQuery Export**
   - Click **"Export to BigQuery"**
   - Select collections to export:
     - `releases` (sneaker releases with status changes)
     - `retailers` (store metadata)
     - `users` (user profiles for growth analytics)
     - `user_alerts` (alert subscriptions for engagement metrics)
   
3. **Configure Export Settings**
   - **Dataset location**: `us-central1` (same as your Cloud Functions)
   - **Dataset ID**: `firestore_exports` (or custom name)
   - **Export mode**: 
     - ✅ **Incremental** (recommended) - only new/changed documents
     - ⚠️ Full export - all documents (expensive, use sparingly)

4. **Verify Tables Created**
   - Open [BigQuery Console](https://console.cloud.google.com/bigquery?project=live-sneaker-release-tracker)
   - Navigate to `live-sneaker-release-tracker` → `firestore_exports`
   - Confirm tables:
     - `releases_raw_latest` (latest version of each release)
     - `releases_raw_changelog` (historical changes)
     - `retailers_raw_latest`
     - `users_raw_latest`
     - `user_alerts_raw_latest`

### Method 2: Firebase Extension (Automated)

```powershell
# Install Firestore to BigQuery extension
cd "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker"
firebase ext:install firebase/firestore-bigquery-export --project live-sneaker-release-tracker

# Follow prompts:
# - Dataset location: us-central1
# - Project ID: live-sneaker-release-tracker
# - Collection path: releases (run for each collection)
# - Table ID: releases (matches collection name)
# - Wildcard path: No (unless using subcollections)
```

**Repeat for each collection**: `retailers`, `users`, `user_alerts`

## 📈 Example BigQuery Queries

Once exports are enabled, you can run SQL queries for analytics:

### 1. Release Status Changes Over Time
```sql
SELECT
  DATE(timestamp) as date,
  data.status as status,
  COUNT(*) as count
FROM `live-sneaker-release-tracker.firestore_exports.releases_raw_changelog`
WHERE data.status IS NOT NULL
GROUP BY date, status
ORDER BY date DESC
LIMIT 30;
```

### 2. Active Raffles by Retailer
```sql
SELECT
  r.data.name as retailer_name,
  r.data.region as region,
  COUNT(*) as active_raffles
FROM `live-sneaker-release-tracker.firestore_exports.releases_raw_latest` AS rel
JOIN `live-sneaker-release-tracker.firestore_exports.retailers_raw_latest` AS r
  ON rel.data.retailerId = r.document_id
WHERE rel.data.status = 'RAFFLE OPEN'
GROUP BY retailer_name, region
ORDER BY active_raffles DESC;
```

### 3. User Growth Trend
```sql
SELECT
  DATE_TRUNC(DATE(timestamp), WEEK) as week,
  COUNT(DISTINCT data.email) as new_users
FROM `live-sneaker-release-tracker.firestore_exports.users_raw_changelog`
WHERE operation = 'INSERT'
GROUP BY week
ORDER BY week DESC
LIMIT 12;
```

### 4. Average Raffle Duration
```sql
WITH raffle_durations AS (
  SELECT
    data.productName as product,
    data.retailerId as retailer,
    MIN(CASE WHEN data.status = 'RAFFLE OPEN' THEN timestamp END) as raffle_start,
    MIN(CASE WHEN data.status = 'RAFFLE CLOSED' THEN timestamp END) as raffle_end
  FROM `live-sneaker-release-tracker.firestore_exports.releases_raw_changelog`
  GROUP BY product, retailer
)
SELECT
  retailer,
  AVG(TIMESTAMP_DIFF(raffle_end, raffle_start, HOUR)) as avg_duration_hours
FROM raffle_durations
WHERE raffle_start IS NOT NULL AND raffle_end IS NOT NULL
GROUP BY retailer
ORDER BY avg_duration_hours DESC;
```

## 📊 Looker Studio Dashboard (Optional)

After BigQuery exports are running, create interactive dashboards:

1. **Connect Data Source**
   - Open [Looker Studio](https://lookerstudio.google.com/)
   - Create New Report → BigQuery → Select `live-sneaker-release-tracker.firestore_exports`

2. **Build Dashboard Components**
   - **Raffles Timeline**: Line chart (date vs count, filter by status=RAFFLE OPEN)
   - **Retailer Heatmap**: Geo chart (region vs release count)
   - **Brand Distribution**: Pie chart (brand vs count)
   - **User Growth**: Trend line (week vs new users)
   - **Top Retailers**: Table (retailer, region, release count, active count)

3. **Add Filters**
   - Date range picker
   - Brand selector (Nike, Jordan, Adidas, etc.)
   - Region filter (US, EU, APAC, etc.)
   - Status filter (LIVE, UPCOMING, SOLD OUT, RAFFLE)

## 🚦 Current Status

**Implemented:**
- ✅ BigQuery tables for `queue_events` and `release_events` (backend Pub/Sub pipeline)
- ✅ Real-time Firestore analytics in Next.js app (sufficient for current needs)

**Pending (Optional Enhancement):**
- ⏸️ Firestore → BigQuery exports for historical data
- ⏸️ Looker Studio dashboard template
- ⏸️ Scheduled queries for pre-computed aggregations

**Recommendation**: Start with real-time Firestore analytics. Add BigQuery when you need:
- Historical trend analysis (3+ months of data)
- Complex joins across multiple collections
- Executive dashboards with scheduled reports
- Data science/ML model training

## 💰 Cost Considerations

- **Firestore exports**: ~$1.30 per million document writes
- **BigQuery storage**: $0.02 per GB/month (first 10 GB free)
- **BigQuery queries**: $5 per TB scanned (first 1 TB/month free)
- **Estimated monthly cost** (1000 releases/day): ~$10-20/month

## 🔗 Resources

- [Firestore BigQuery Export Guide](https://firebase.google.com/docs/firestore/solutions/schedule-export)
- [BigQuery SQL Reference](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax)
- [Looker Studio Tutorials](https://support.google.com/looker-studio/answer/6283323)
- [Extension Documentation](https://firebase.google.com/products/extensions/firestore-bigquery-export)
