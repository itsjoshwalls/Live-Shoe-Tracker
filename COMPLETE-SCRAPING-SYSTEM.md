# Complete Scraping System Documentation

## 🎯 System Overview

Comprehensive multi-source data acquisition system covering **60+ sources** across 4 major categories:

1. **Direct Retailers** (40+ stores) - Nike, Adidas, Footlocker, boutiques, etc.
2. **Release Aggregators** (6 sources) - SoleLinks, Sole Retriever, Sneaker News, etc.
3. **Resale Marketplaces** (5 sources) - StockX, GOAT, Flight Club, eBay, etc.
4. **Social Signals** (Twitter, Reddit, Discord) - Real-time hype tracking

---

## 📁 File Structure

```
functions/src/scrapers/
├── productionScrapers.js          # Direct retailers (Nike, Adidas, Footlocker, etc.)
├── releaseAggregators.js          # SoleLinks, Sole Retriever, Sneaktorious, etc.
├── resaleMarketplaces.js          # StockX, GOAT, Flight Club, eBay
├── socialSignals.js               # Twitter, Reddit, Discord webhooks
└── masterOrchestrator.js          # Coordinates all scrapers
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd functions
npm install node-fetch cheerio
```

### 2. Set Environment Variables

```powershell
# Twitter API (optional but recommended)
$env:TWITTER_BEARER_TOKEN = "your_bearer_token_here"

# StockX API (if using official partner API)
$env:STOCKX_API_KEY = "your_stockx_key"

# Discord webhook for outbound notifications
$env:DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/..."
```

### 3. Run All Scrapers

```javascript
import { runMasterScraper } from './scrapers/masterOrchestrator.js';

const results = await runMasterScraper();
console.log(results);
// Output: { totalReleases: 450, totalProducts: 120, duration: 45000, ... }
```

### 4. Run Specific Category

```javascript
import { runAllAggregatorScrapers } from './scrapers/releaseAggregators.js';

const aggregatorData = await runAllAggregatorScrapers();
```

---

## 📊 Data Sources

### Category 1: Direct Retailers (productionScrapers.js)

#### Brand Official
- **Nike SNKRS** - API: `/product_feed/threads/snkrs`
- **Adidas Confirmed** - API: `/api/releases`

#### Chains
- **Footlocker** - HTML: `/release-dates`
- Footaction, Champs, Finish Line, JD Sports, Hibbett, DTLR

#### Boutiques
- **END Clothing** - API: `/api/products?category=launches`
- **Shopify Stores** - API: `/products.json`, `/collections/new-releases`
  - Kith, Concepts, BAIT, Undefeated, SNS, etc.

#### Resale (basic)
- **StockX** - API: `/api/browse`

### Category 2: Release Aggregators (releaseAggregators.js)

| Source | Type | URL | API Available |
|--------|------|-----|---------------|
| **SoleLinks** | Aggregator | solelinks.com | ✅ Mobile API |
| **Sole Retriever** | Aggregator | soleretriever.com | ✅ v1 API |
| **Sneaktorious** | Calendar | sneaktorious.com | ❌ HTML only |
| **Sneaker News** | Editorial | sneakernews.com | ❌ HTML only |
| **Nice Kicks** | Editorial | nicekicks.com | ❌ HTML only |
| **Hypebeast** | Editorial | hypebeast.com/footwear | ❌ HTML only |

### Category 3: Resale Marketplaces (resaleMarketplaces.js)

| Platform | Data Points | API Type |
|----------|-------------|----------|
| **StockX** | Lowest ask, highest bid, sales volume, volatility | Public browse API |
| **GOAT** | Lowest price, instant ship price | Next.js hydration |
| **Flight Club** | Consignment listings | HTML scraping |
| **Stadium Goods** | Resale prices | HTML scraping |
| **eBay** | Sold listings (historical) | HTML scraping |

### Category 4: Social Signals (socialSignals.js)

| Source | Coverage | Auth Required |
|--------|----------|---------------|
| **Twitter** | @solelinks, @snkr_twitr, @SneakerNews, @py_rates | ✅ Bearer token |
| **Reddit** | r/Sneakers, r/SNKRS, r/SneakerDeals | ❌ Public JSON |
| **Discord** | Community webhooks | ❌ Webhook endpoints |

---

## ⚙️ Scheduling & Orchestration

### Recommended Schedule

```javascript
// Firebase Functions (index.js)

// HIGH FREQUENCY: Every 30 minutes
export const scraperHighPriority = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async () => {
    const { runHighFrequencyScraper } = await import('./scrapers/masterOrchestrator.js');
    return await runHighFrequencyScraper();
  });

// MEDIUM FREQUENCY: Every 2 hours
export const scraperMediumPriority = functions.pubsub
  .schedule('every 2 hours')
  .onRun(async () => {
    const { runMediumFrequencyScraper } = await import('./scrapers/masterOrchestrator.js');
    return await runMediumFrequencyScraper();
  });

// LOW FREQUENCY: Every 6 hours
export const scraperLowPriority = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async () => {
    const { runLowFrequencyScraper } = await import('./scrapers/masterOrchestrator.js');
    return await runLowFrequencyScraper();
  });
```

### Manual Trigger

```powershell
# Test locally
firebase functions:shell

# In shell:
scraperHighPriority()
```

---

## 📈 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  SCHEDULED TRIGGER (Cloud Scheduler)                    │
│  ├─ High Priority: 30min (retailers + aggregators)     │
│  ├─ Medium Priority: 2hr (resale markets)              │
│  └─ Low Priority: 6hr (social signals)                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  MASTER ORCHESTRATOR                                     │
│  ├─ Phase 1: Direct Retailers (40+ sources)            │
│  ├─ Phase 2: Release Aggregators (6 sources)           │
│  ├─ Phase 3: Resale Markets (5 sources)                │
│  └─ Phase 4: Social Signals (Twitter, Reddit)          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  DATA CLEANING & STANDARDIZATION                        │
│  ├─ Brand normalization (Nike/nike → Nike)             │
│  ├─ Date formatting (ISO 8601)                          │
│  ├─ Status mapping (available, upcoming, raffle, etc.)  │
│  └─ SKU extraction and validation                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  DEDUPLICATION ENGINE                                    │
│  ├─ Primary key: SKU + retailer_id                     │
│  ├─ If exists: UPDATE (price, status, stock)           │
│  └─ If new: INSERT with full metadata                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  FIRESTORE STORAGE                                       │
│  ├─ releases (main collection)                          │
│  ├─ retailers (metadata)                                │
│  ├─ stock_snapshots (historical tracking)              │
│  ├─ social_signals (hype data)                          │
│  └─ scraper_metrics (performance monitoring)            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  FRONTEND REAL-TIME UPDATE                               │
│  └─ onSnapshot() listeners → UI updates instantly       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Environment Setup

### Twitter API Setup

1. Go to https://developer.twitter.com/
2. Create new app
3. Get Bearer Token from "Keys and tokens"
4. Set environment variable:

```powershell
firebase functions:config:set twitter.bearer_token="YOUR_TOKEN"
```

### StockX API (Optional)

StockX browse API is publicly accessible. For advanced features:
1. Apply for partner program
2. Get API credentials
3. Configure:

```powershell
firebase functions:config:set stockx.api_key="YOUR_KEY"
```

### Discord Webhooks

Create incoming webhook endpoints in your Discord server:
1. Server Settings → Integrations → Webhooks
2. Copy webhook URL
3. Configure:

```powershell
firebase functions:config:set discord.webhook_url="YOUR_URL"
```

---

## 📊 Metrics & Monitoring

### Scraper Metrics Collection

The system automatically stores metrics in `scraper_metrics` collection:

```javascript
{
  timestamp: "2024-11-10T14:30:00Z",
  totalReleases: 450,
  totalProducts: 120,
  totalSocialSignals: 85,
  duration: 45000,  // milliseconds
  errorCount: 2,
  byCategory: {
    "Direct Retailers": {
      total: 280,
      bySource: {
        "Nike SNKRS": 45,
        "Adidas Confirmed": 32,
        "Footlocker": 28,
        // ...
      }
    },
    "Aggregators": { total: 120 },
    "Resale Markets": { total: 50 }
  }
}
```

### Dashboard Queries

```javascript
// Get last 24 hours of scraper performance
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
const metrics = await db.collection('scraper_metrics')
  .where('timestamp', '>=', yesterday.toISOString())
  .orderBy('timestamp', 'desc')
  .get();

// Calculate success rate
const totalRuns = metrics.size;
const failedRuns = metrics.docs.filter(doc => doc.data().errorCount > 0).length;
const successRate = ((totalRuns - failedRuns) / totalRuns * 100).toFixed(2);
```

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. Rate Limiting (429 errors)

**Solution**: Add throttling between requests

```javascript
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent requests

const promises = retailers.map(retailer => 
  limit(() => scrapeRetailer(retailer))
);

await Promise.all(promises);
```

#### 2. HTML Structure Changed

**Symptoms**: Scraper returns empty arrays or null values

**Solution**: 
1. Inspect website HTML in browser DevTools
2. Update CSS selectors in scraper
3. Add fallback selectors

```javascript
// Use multiple fallback selectors
const title = $elem.find('.product-title, h3, .title, [data-product-name]').first().text();
```

#### 3. API Endpoints Changed

**Symptoms**: 404 or 403 errors from API calls

**Solution**:
1. Open browser DevTools → Network tab
2. Navigate to website
3. Filter for XHR/Fetch requests
4. Find new API endpoint
5. Update scraper URL

#### 4. Missing Environment Variables

**Symptoms**: "TWITTER_BEARER_TOKEN not set" warnings

**Solution**:

```powershell
# Check current config
firebase functions:config:get

# Set missing variables
firebase functions:config:set twitter.bearer_token="xxx"

# Deploy
firebase deploy --only functions
```

---

## 🚦 Best Practices

### 1. Respect Rate Limits

```javascript
const rateLimiter = new RateLimiter(60); // 60 req/min

async function scrapeWithRateLimit(url) {
  await rateLimiter.throttle();
  return await fetch(url);
}
```

### 2. Add User-Agent Headers

```javascript
const headers = {
  'User-Agent': 'Mozilla/5.0 (compatible; SneakerTrackerBot/1.0; +https://yoursite.com/bot)',
  'Accept': 'application/json',
};
```

### 3. Handle Failures Gracefully

```javascript
async function scrapeWithRetry(scraperFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await scraperFn();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Failed after ${maxRetries} attempts:`, error);
        return [];
      }
      await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
}
```

### 4. Cache Frequently Accessed Data

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

---

## 🎓 GitHub Resources

### Recommended Open-Source Projects

1. **yasserqureshi1/sneaker-monitors** ⭐⭐⭐⭐⭐
   - URL: https://github.com/yasserqureshi1/sneaker-monitors
   - Language: Python
   - Features: Multi-site monitors, Discord webhooks, Shopify support
   - License: MIT

2. **AidanJSmith/StockXAPI** ⭐⭐⭐⭐
   - URL: https://github.com/AidanJSmith/StockXAPI
   - Language: Python
   - Features: Clean StockX API wrapper
   - License: MIT

3. **philipperemy/nike-snkrs-bot** ⭐⭐⭐
   - URL: https://github.com/philipperemy/nike-snkrs-bot
   - Language: Python
   - Features: SNKRS API reverse engineering

### How to Discover More

```javascript
import { discoverGitHubScrapers } from './scrapers/masterOrchestrator.js';

const projects = await discoverGitHubScrapers();
console.log(projects);
// Returns: Array of {name, url, stars, language, quality, isActive}
```

---

## 📞 Support & Updates

### Monitoring Scraper Health

Set up alerts for scraper failures:

```javascript
// In Firebase Functions
if (results.errorCount > 5) {
  await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `⚠️ High error count: ${results.errorCount} scrapers failed`,
    }),
  });
}
```

### Keep Scrapers Updated

- Monitor GitHub repos for updates
- Subscribe to retailer API newsletters
- Join sneaker dev communities on Discord/Reddit
- Check scraper metrics weekly for declining success rates

---

## ✅ Success Metrics

### Target Performance

- **Success Rate**: >95% of scraper runs complete without errors
- **Coverage**: 400+ releases tracked per day
- **Latency**: Releases appear in system within 1 hour of going live
- **Accuracy**: <1% duplicate releases after deduplication
- **Uptime**: 99.5% availability for scheduled scrapers

### Current Status

Run diagnostics:

```javascript
import { runMasterScraper } from './scrapers/masterOrchestrator.js';

const results = await runMasterScraper();
console.log(`Success Rate: ${((results.totalReleases - results.errors.length) / results.totalReleases * 100).toFixed(2)}%`);
console.log(`Coverage: ${results.totalReleases} releases`);
console.log(`Latency: ${(results.duration / 1000).toFixed(2)}s`);
```

---

## 🚀 Next Steps

1. ✅ Deploy scrapers to Firebase Functions
2. ✅ Configure scheduled triggers
3. ✅ Set up monitoring dashboard
4. ✅ Test with real data for 7 days
5. ✅ Fine-tune rate limits and frequencies
6. ✅ Add retailer-specific customizations
7. ✅ Integrate with frontend UI
8. ✅ Launch to production!

**Your customers will never miss a drop! 🎯👟**
