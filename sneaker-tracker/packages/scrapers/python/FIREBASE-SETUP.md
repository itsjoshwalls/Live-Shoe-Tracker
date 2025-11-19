# Firebase & Google Analytics Integration Guide

## Overview

Your scrapers now support **Firestore** storage and **Google Analytics 4** event tracking. This guide shows you how to set everything up.

## Architecture

```
Python Scrapers → Firestore Adapter → Firebase Firestore
                ↓
         Analytics Tracker → Google Analytics 4
```

## What's New

### Created Files

1. **`firestore_adapter.py`** - Connects scrapers to Firestore
   - Batch writes for performance (up to 500 docs at once)
   - Automatic deduplication using document IDs
   - Migration tool from PostgreSQL to Firestore
   
2. **`analytics_tracker.py`** - Sends events to Google Analytics
   - Track scraper runs (products, errors, duration)
   - Track individual product saves
   - Track robots.txt blocks
   - Context manager for automatic tracking

3. **`soleretriever_scraper_firebase.py`** - Updated scraper example
   - Uses Firestore instead of PostgreSQL
   - Sends GA4 events automatically
   - Same CLI interface as before

## Prerequisites

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Firestore Database**:
   - Click "Firestore Database" → "Create database"
   - Choose production mode
   - Select region (e.g., `us-central1`)

4. Create **Service Account**:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save JSON file (e.g., `firebase-service-account.json`)

### 2. Google Analytics 4 Setup

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property or select existing one
3. Get **Measurement ID**:
   - Admin → Data Streams → Web → Copy "Measurement ID" (format: `G-XXXXXXXXXX`)

4. Create **API Secret**:
   - Admin → Data Streams → Web → Measurement Protocol API secrets
   - Click "Create" → Give it a name → Copy secret value

### 3. Firestore Collections Structure

Recommended collection structure:

```
sneakers_canonical/          # Main collection for all products
  {doc_id}/                 # Auto-generated from product URL
    title: string
    url: string             # Unique identifier
    brand: string
    price: string
    sku: string
    status: string          # "upcoming", "released", "sold_out"
    release_date: timestamp
    image_url: string
    source: string          # "soleretriever", "sneakernews", etc.
    scraped_at: timestamp
    created_at: timestamp
    updated_at: timestamp
```

Alternative: Separate collections per source:
```
soleretriever_products/
sneakernews_articles/
footlocker_products/
```

## Installation

### Install Python Packages

```powershell
# Navigate to scrapers directory
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python

# Install Firebase dependencies
pip install -r requirements-firebase.txt

# Or install manually
pip install firebase-admin google-analytics-data requests beautifulsoup4 lxml playwright python-dotenv
```

### Set Environment Variables

**Option 1: PowerShell (Temporary)**

```powershell
# Firebase Service Account (as JSON string)
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\firebase-service-account.json' -Raw

# Google Analytics
$env:GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'
$env:GA_API_SECRET = 'your-api-secret-here'
```

**Option 2: `.env` file (Persistent)**

Create `.env` file in scrapers directory:

```bash
# .env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project",...}
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=your-api-secret
```

Then load in Python:
```python
from dotenv import load_dotenv
load_dotenv()
```

## Usage Examples

### 1. Test Firestore Connection

```powershell
# Test save and query
python firestore_adapter.py `
  --service-account "C:\path\to\firebase-service-account.json" `
  --collection sneakers_test `
  --test-save `
  --test-query
```

Expected output:
```
Saved 2/2 products
Stats: {'saved': 2, 'updated': 0, 'errors': 0, 'skipped': 0}
Found 2 products:
  - Test Jordan 1 (Jordan)
  - Test Nike Dunk (Nike)
```

### 2. Test Google Analytics

```powershell
# Send test event
python analytics_tracker.py `
  --measurement-id "G-XXXXXXXXXX" `
  --api-secret "your-secret" `
  --test-event
```

**Verify in GA4**:
1. Go to GA4 → Reports → Realtime
2. Look for `scraper_run` event (appears within ~1 minute)

### 3. Run Scraper with Firestore + Analytics

```powershell
# Scrape Jordan releases and save to Firestore
python soleretriever_scraper_firebase.py `
  --collection jordan `
  --limit 10 `
  --firestore-collection sneakers_canonical `
  --service-account "C:\path\to\service-account.json"
```

Expected output:
```
Scraping jordan collection: https://www.soleretriever.com/sneaker-release-dates/jordan
Found 117 product links
Saved 10/10 products to Firestore

=== Scraping Results ===
Products scraped: 10
Errors: 0
Duration: 18.45s
Firestore stats: {'saved': 10, 'updated': 0, 'errors': 0}
```

### 4. Migrate Existing PostgreSQL Data

```powershell
# Migrate 20 products from PostgreSQL to Firestore
python firestore_adapter.py `
  --service-account "C:\path\to\service-account.json" `
  --migrate
```

This will:
- Read all rows from `soleretriever_data` table
- Convert to Firestore format
- Save to `sneakers_canonical` collection
- Preserve all existing data

## Integration with Existing Scrapers

To update your other scrapers (news_scraper.py, etc.), add these imports:

```python
from firestore_adapter import FirestoreAdapter
from analytics_tracker import AnalyticsTracker, ScraperRunContext

# Initialize
firestore = FirestoreAdapter()
analytics = AnalyticsTracker()

# In your scraper
with ScraperRunContext(analytics, 'your_scraper_name') as ctx:
    # Scrape products
    products = scrape_products()
    
    # Save to Firestore
    firestore.save_products(products, collection='sneakers_canonical')
    
    # Update context stats
    ctx.products_scraped = len(products)
    ctx.errors = error_count
# GA event sent automatically on exit
```

## Firestore Security Rules

Add these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow service account full access
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Allow public read for web app
    match /sneakers_canonical/{sneaker} {
      allow read: if true;
      allow write: if false;  // Only service account can write
    }
  }
}
```

## Monitoring in Google Analytics

### Custom Events Tracked

1. **`scraper_run`** - Every scraper execution
   - Parameters: `source`, `products_scraped`, `errors`, `duration_seconds`, `status`
   
2. **`product_saved`** - Each product saved
   - Parameters: `source`, `product_title`, `brand`, `price`
   
3. **`scraper_error`** - Errors encountered
   - Parameters: `source`, `error_type`, `error_message`
   
4. **`robots_blocked`** - When robots.txt blocks scraping
   - Parameters: `source`, `url`

### View Events in GA4

1. **Realtime**: Admin → Reports → Realtime → Event count by Event name
2. **Explore**: Admin → Explore → Create custom report
3. **API**: Use `google-analytics-data` Python package

### Example GA4 Exploration Query

```python
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest

client = BetaAnalyticsDataClient()

request = RunReportRequest(
    property=f"properties/{property_id}",
    dimensions=[{"name": "eventName"}, {"name": "customEvent:source"}],
    metrics=[{"name": "eventCount"}],
    date_ranges=[{"start_date": "7daysAgo", "end_date": "today"}],
)

response = client.run_report(request)
```

## Troubleshooting

### Firestore Errors

**Error**: `Could not automatically determine credentials`
- **Fix**: Set `FIREBASE_SERVICE_ACCOUNT` environment variable or use `--service-account` flag

**Error**: `Insufficient permissions`
- **Fix**: Check service account has "Cloud Datastore User" role in IAM

**Error**: `Document ID too long`
- **Fix**: Adapter automatically truncates to 1500 chars, but check product URLs

### Google Analytics Errors

**Error**: `measurement_id and api_secret required`
- **Fix**: Set `GA_MEASUREMENT_ID` and `GA_API_SECRET` environment variables

**Events not appearing in GA4**
- **Check**: Realtime reports (up to 60 second delay)
- **Debug**: Use `--debug` flag with analytics_tracker.py
- **Verify**: Measurement ID format is `G-XXXXXXXXXX` (not `UA-XXXXXX`)

**Validation errors**
- Run with debug endpoint: `analytics = AnalyticsTracker(debug=True)`
- Check response for validation messages

## Performance Optimization

### Firestore Batch Writes

```python
# Good: Batch write (1 API call for 500 docs)
firestore.save_products(products, use_batch=True)  # Default

# Avoid: Individual writes (500 API calls)
firestore.save_products(products, use_batch=False)
```

### Analytics Batch Events

```python
# Send multiple events at once (up to 25)
events = [
    {'name': 'scraper_run', 'params': {'source': 'test1', 'products': 10}},
    {'name': 'scraper_run', 'params': {'source': 'test2', 'products': 20}},
]
analytics.send_batch_events(events)
```

## Cost Estimates

### Firestore Pricing (as of 2024)

- **Reads**: $0.06 per 100K documents
- **Writes**: $0.18 per 100K documents
- **Storage**: $0.18 per GB/month

**Example**: 1000 products/day = ~30K writes/month = **$0.05/month**

### Google Analytics 4

- **Free**: Up to 10M events/month
- **360**: $150K/year (unlimited)

Your scraper traffic will be well under free tier.

## Next Steps

1. ✅ Install dependencies (`pip install -r requirements-firebase.txt`)
2. ✅ Set up Firebase project and download service account
3. ✅ Set up GA4 property and get measurement ID + API secret
4. ✅ Set environment variables
5. ✅ Test with `firestore_adapter.py --test-save --test-query`
6. ✅ Test with `analytics_tracker.py --test-event`
7. ✅ Run `soleretriever_scraper_firebase.py --limit 5`
8. ✅ Migrate existing data with `--migrate` flag
9. ✅ Update other scrapers to use Firestore
10. ✅ Monitor in GA4 Realtime dashboard

## Questions?

Check the code comments in:
- `firestore_adapter.py` - Detailed docstrings for all methods
- `analytics_tracker.py` - GA4 event tracking patterns
- `soleretriever_scraper_firebase.py` - Complete integration example
