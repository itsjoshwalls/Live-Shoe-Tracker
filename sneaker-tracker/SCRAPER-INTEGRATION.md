# Scraper Integration Guide

## Overview
This guide shows how to integrate the production scrapers from `productionScrapers.js` into the existing Firebase Functions architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Scheduled Trigger (Cloud Scheduler)                        │
│  ↓ Every 1 hour                                             │
├─────────────────────────────────────────────────────────────┤
│  scheduledScraper (index.js)                                │
│  ↓ Calls runAllScrapers()                                   │
├─────────────────────────────────────────────────────────────┤
│  productionScrapers.js                                      │
│  ├─ scrapeNikeSNKRS()                                       │
│  ├─ scrapeAdidasConfirmed()                                 │
│  ├─ scrapeFootlocker()                                      │
│  ├─ scrapeENDClothing()                                     │
│  ├─ scrapeStockX()                                          │
│  └─ scrapeShopifyBoutique()                                 │
│  ↓ Returns raw release data                                 │
├─────────────────────────────────────────────────────────────┤
│  cleanReleaseData() → deduplicateRelease()                  │
│  ↓ Standardized, deduplicated data                          │
├─────────────────────────────────────────────────────────────┤
│  onReleaseIngest (callable function)                        │
│  ↓ Validates with Zod schema                                │
├─────────────────────────────────────────────────────────────┤
│  Firestore Writes                                           │
│  ├─ releases collection                                     │
│  ├─ retailers metadata                                      │
│  ├─ daily_stats aggregation                                 │
│  └─ stock_snapshots tracking                                │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Move Scrapers to Correct Location

```powershell
# Current location (from earlier creation):
# functions/src/scrapers/productionScrapers.js

# Target location:
# sneaker-tracker/packages/firebase-functions/scrapers/productionScrapers.js

# Move command:
cd "c:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker"
mkdir -p "sneaker-tracker\packages\firebase-functions\scrapers"
Move-Item `
  "functions\src\scrapers\productionScrapers.js" `
  "sneaker-tracker\packages\firebase-functions\scrapers\productionScrapers.js"
```

## Step 2: Add Scheduled Function to `index.js`

Add this to `sneaker-tracker/packages/firebase-functions/index.js`:

```javascript
import { runAllScrapers } from "./scrapers/productionScrapers.js";

/**
 * 🕒 scheduledScraper
 * Runs every hour to scrape all retailers for new releases
 */
export const scheduledScraper = functions.pubsub
  .schedule("every 1 hours")  // Adjust frequency as needed
  .timeZone("America/New_York")  // Set to your timezone
  .onRun(async (context) => {
    try {
      functions.logger.info("🚀 Starting scheduled scraper run...");
      
      // Run all scrapers
      const results = await runAllScrapers();
      
      functions.logger.info("✅ Scraper run complete", {
        total: results.total,
        new: results.new,
        updated: results.updated,
        duplicates: results.duplicates,
        errors: results.errors.length,
      });
      
      // Store metrics
      await incrementMetric("scraper_runs");
      await incrementMetric("releases_scraped", results.total);
      await incrementMetric("new_releases_found", results.new);
      
      // Log errors if any
      if (results.errors.length > 0) {
        functions.logger.error("⚠️ Scraper errors encountered", {
          errors: results.errors,
        });
      }
      
      return results;
    } catch (err) {
      functions.logger.error("❌ Scheduled scraper failed", err);
      throw err;
    }
  });
```

## Step 3: Update `productionScrapers.js` to Call `onReleaseIngest`

Modify the `deduplicateRelease` function to use the existing callable function:

```javascript
import admin from 'firebase-admin';
import * as functions from 'firebase-functions';

async function deduplicateRelease(release) {
  const db = admin.firestore();
  
  // Check if release exists (by SKU + retailer combo)
  const existingQuery = await db
    .collection('releases')
    .where('sku', '==', release.sku)
    .where('retailerId', '==', release.retailerId)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    // Release exists - update it
    const existingDoc = existingQuery.docs[0];
    const existingData = existingDoc.data();
    
    // Call onReleaseIngest with updated data
    const httpsCallable = functions.https.onCall;
    await onReleaseIngest(
      {
        ...existingData,
        ...release,
        id: existingDoc.id,
        isNew: false,
        productId: existingDoc.id,
      },
      null  // context not needed for internal calls
    );
    
    return { action: 'updated', releaseId: existingDoc.id };
  } else {
    // New release - create it
    await onReleaseIngest(
      {
        ...release,
        isNew: true,
      },
      null
    );
    
    return { action: 'created', releaseId: release.id };
  }
}
```

## Step 4: Configure Retailer-to-ID Mapping

Create a helper file `sneaker-tracker/packages/firebase-functions/scrapers/retailerMapping.js`:

```javascript
// Maps retailer names to Firestore document IDs
export const RETAILER_IDS = {
  'Nike SNKRS': 'nike_snkrs',
  'Adidas Confirmed': 'adidas_confirmed',
  'Footlocker': 'footlocker_us',
  'END Clothing': 'end_clothing',
  'StockX': 'stockx',
  'Kith': 'kith',
  'Concepts': 'concepts',
  'BAIT': 'bait',
  // Add all 40+ retailers from firestore.seed.json
};

export function getRetailerId(retailerName) {
  const id = RETAILER_IDS[retailerName];
  if (!id) {
    throw new Error(`Unknown retailer: ${retailerName}`);
  }
  return id;
}
```

Then import and use in scrapers:

```javascript
import { getRetailerId } from './retailerMapping.js';

async function scrapeNikeSNKRS() {
  // ... scraping logic ...
  
  releases.push({
    retailerId: getRetailerId('Nike SNKRS'),
    retailerName: 'Nike SNKRS',
    productName,
    brand,
    sku,
    price,
    status,
  });
}
```

## Step 5: Deploy Functions

```powershell
cd sneaker-tracker/packages/firebase-functions

# Install dependencies if needed
npm install node-fetch cheerio

# Deploy only the new scheduled function
firebase deploy --only functions:scheduledScraper

# Or deploy all functions
firebase deploy --only functions
```

## Step 6: Test Locally with Emulators

```powershell
# Start Firebase emulators
firebase emulators:start

# In another terminal, trigger the scraper manually
firebase functions:shell

# Inside the shell:
scheduledScraper()
```

## Step 7: Monitor in Production

### View Logs:
```powershell
firebase functions:log --only scheduledScraper
```

### Cloud Console:
- Go to: https://console.cloud.google.com/functions
- Select your project
- Click `scheduledScraper`
- View logs, metrics, errors

### Set Up Alerts:
```javascript
// Add to index.js:
export const scraperErrorAlert = functions.pubsub
  .topic('scraper-errors')
  .onPublish(async (message) => {
    const { retailer, error } = message.json;
    
    // Send to Discord/Slack
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `⚠️ Scraper Error: ${retailer}\\n${error}`,
      }),
    });
  });
```

## Step 8: Optimize Scheduling

### Adjust Frequency Based on Retailer:
```javascript
// High-priority retailers (Nike, Adidas): Every 30 minutes
export const scheduledScraperHighPriority = functions.pubsub
  .schedule("every 30 minutes")
  .onRun(async () => {
    const priorityScrapers = [
      scrapeNikeSNKRS,
      scrapeAdidasConfirmed,
    ];
    
    for (const scraper of priorityScrapers) {
      await scraper();
    }
  });

// Standard retailers: Every 2 hours
export const scheduledScraperStandard = functions.pubsub
  .schedule("every 2 hours")
  .onRun(async () => {
    const standardScrapers = [
      scrapeFootlocker,
      scrapeENDClothing,
      scrapeShopifyBoutique,
    ];
    
    for (const scraper of standardScrapers) {
      await scraper();
    }
  });

// Resale markets: Every 6 hours (slower-moving data)
export const scheduledScraperResale = functions.pubsub
  .schedule("every 6 hours")
  .onRun(async () => {
    await scrapeStockX();
  });
```

## Step 9: Add Retry Logic

Update `productionScrapers.js`:

```javascript
async function scrapeWithRetry(scraperFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await scraperFn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function runAllScrapers() {
  const scrapers = [
    { name: 'Nike SNKRS', fn: scrapeNikeSNKRS },
    { name: 'Adidas Confirmed', fn: scrapeAdidasConfirmed },
    // ... etc
  ];
  
  for (const { name, fn } of scrapers) {
    try {
      await scrapeWithRetry(fn);
    } catch (error) {
      results.errors.push({ retailer: name, error: error.message });
    }
  }
}
```

## Step 10: Add Rate Limiting

```javascript
class RateLimiter {
  constructor(requestsPerMinute) {
    this.delay = 60000 / requestsPerMinute;
    this.lastRequest = 0;
  }
  
  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.delay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.delay - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
}

// Usage in scrapers:
const nikeLimiter = new RateLimiter(60);  // 60 requests/minute

async function scrapeNikeSNKRS() {
  await nikeLimiter.throttle();
  const response = await fetch(...);
  // ...
}
```

## Environment Variables

Add to `.env` (for local) and Firebase Config (for production):

```bash
# Retailer APIs
NIKE_API_KEY=your_nike_key
ADIDAS_API_KEY=your_adidas_key
STOCKX_API_KEY=your_stockx_key

# Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Feature flags
ENABLE_NIKE_SCRAPER=true
ENABLE_ADIDAS_SCRAPER=true
SCRAPER_FREQUENCY_MINUTES=60
```

Set in Firebase:
```powershell
firebase functions:config:set scraper.nike_api_key="xxx"
firebase functions:config:set scraper.frequency="60"
```

## Troubleshooting

### Scraper returns no data:
1. Check retailer website hasn't changed structure
2. Verify API endpoints still active
3. Check for rate limiting (429 errors)
4. Ensure auth tokens are valid

### Duplicate releases created:
1. Verify deduplication logic checks both SKU and retailerId
2. Check if SKU format changed (e.g., "DZ123" vs "DZ-123")
3. Add logging to see what's being compared

### High costs:
1. Reduce scraper frequency for low-priority retailers
2. Use conditional updates (only write if data changed)
3. Enable Firestore query caching
4. Monitor Firestore read/write usage in console

## Next Steps

1. ✅ Move productionScrapers.js to correct location
2. ✅ Add scheduledScraper to index.js
3. ✅ Create retailerMapping.js with all 40+ retailers
4. ✅ Deploy and test in emulators
5. ✅ Deploy to production
6. ✅ Monitor logs for first 24 hours
7. ✅ Fine-tune scheduling based on traffic
8. ✅ Set up error alerts
9. ✅ Add retry logic and rate limiting
10. ✅ Document scraper-specific quirks for team

## Success Criteria

- [ ] Scrapers run on schedule without errors
- [ ] New releases appear in Firestore within 1 hour of going live
- [ ] Deduplication prevents duplicate entries
- [ ] Data quality checks pass (valid dates, brands, prices)
- [ ] No customer reports missing drops for 30 days
- [ ] Error rate < 5% across all scrapers
- [ ] Average latency < 30 seconds per scraper
- [ ] Cost < $50/month for all scheduled functions

## Resources

- Firebase Functions Docs: https://firebase.google.com/docs/functions
- Firestore Data Model: `sneaker-tracker/docs/dataset_schema.md`
- Retailer List: `sneaker-tracker/packages/firebase-functions/firestore.seed.json`
- Admin UI: `sneaker-tracker/apps/web-nextjs/pages/admin/retailers.tsx`
