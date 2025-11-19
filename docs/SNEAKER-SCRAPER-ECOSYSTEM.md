# Sneaker Scraper Ecosystem Integration

## Overview

The Live Shoe Tracker now integrates comprehensive sneaker scraping capabilities based on industry-leading practices from cook groups, commercial monitors, and open-source projects. This document details the expanded coverage, advanced features, and integration points.

## Expanded Retailer Coverage

### Major Retailers (270+ Sites)

#### Footsites Family
- **Foot Locker** - Template: `templates/footlocker.js`
- **Champs Sports** - Template: `templates/footlocker.js` (site: 'champs')
- **Eastbay** - Template: `templates/footlocker.js` (site: 'eastbay')
- **Footaction** - Template: `templates/footlocker.js` (site: 'footaction')

**Features:**
- Queue-it detection and handling
- IP ban evasion via proxy rotation
- Browser fingerprinting prevention
- Product card parsing with status detection
- Raffle keyword detection

#### Finish Line
- Template: `templates/footlocker.js::scrapeFinishLine()`
- Multi-category support
- Size availability tracking

#### JD Sports
- **US**: Template: `templates/footlocker.js::scrapeJDSports('us')`
- **UK**: Template: `templates/footlocker.js::scrapeJDSports('uk')`
- **EU**: Template: `templates/footlocker.js::scrapeJDSports('eu')`

**Features:**
- Multi-region support
- New releases collection tracking
- Product grid extraction

#### Shopify Boutiques (100+ Stores)
- Template: `templates/shopify.js`
- Universal scraper for any Shopify store
- Configuration file: `scripts/shopify_stores.json`

**Features:**
- Multi-path collection detection (`/collections/new-arrivals`, `/collections/sneakers`, etc.)
- Fallback to `products.json` API
- Enhanced raffle detection with 18 patterns
- Variant availability tracking
- Batch scraping support

**Raffle Patterns:**
- raffle, draw, fcfs, first come first serve
- reservation, sign up, enter to win, register now
- limited release, exclusive access, members only
- in store only, local pickup, appointment, waitlist
- ballot, launch procedure, cop or drop

### Resale Platforms

#### GOAT
- Template: `templates/resale.js::scrapeGOAT()`
- Search-based scraping
- Size/price matrix extraction
- Product card parsing

#### StockX
- Template: `templates/resale.js::scrapeStockX()`
- Search results extraction
- Last sale and price change tracking
- Anti-detection measures

#### Flight Club
- Template: `templates/resale.js::scrapeFlightClub()`
- Catalog search
- Price tracking

#### Stadium Goods
- Template: `templates/resale.js::scrapeStadiumGoods()`
- Product tile parsing
- Price extraction

## Advanced Infrastructure

### Proxy Management (`lib/proxyManager.js`)

**Supported Providers:**
- Webshare (30M+ IPs, $6/month)
- Smartproxy/Decodo (65M+ IPs, $3.50/GB)
- Oxylabs (102M+ IPs, $45/month)
- SOAX (191M+ IPs, $90/month)
- Bright Data (150M+ IPs, $499/month)
- NetNut (85M+ IPs, $99/month)
- Rayobyte (25M+ IPs, $3.50/GB)

**Features:**
- Multi-provider support
- Residential, ISP, Mobile, Datacenter proxy types
- Rotation strategies: round-robin, random, sticky, best-performing
- Geo-targeting (country, city, ASN)
- Performance tracking (success rate, latency)
- Auto-removal of failing proxies
- Session persistence (sticky IPs for queue systems)

**Usage:**
```javascript
const { proxyManager } = require('./lib/proxyManager');

// Get proxy for scraper
const proxy = await proxyManager.getProxy('nike_scraper', {
  provider: 'webshare',
  rotation: 'sticky',
  sessionId: 'user123'
});

// Record result
proxyManager.recordResult('webshare', proxy, success, latencyMs);

// Get stats
const stats = proxyManager.getAllStats();
```

**Environment Variables:**
```env
DEFAULT_PROXY_PROVIDER=webshare
WEBSHARE_API_KEY=your_key
WEBSHARE_PROXY_LIST=user:pass@host:port,user2:pass2@host2:port2
SMARTPROXY_PROXY_SERVER=http://proxy.smartproxy.com:10000
SMARTPROXY_PROXY_USERNAME=user
SMARTPROXY_PROXY_PASSWORD=pass
```

### Captcha Solving (`lib/captchaSolver.js`)

**Supported Providers:**
- 2Captcha (recommended, $2.99/1000 solves)
- AntiCaptcha ($0.50-$2/1000 solves)

**Supported Captcha Types:**
- Google reCAPTCHA v2
- Google reCAPTCHA v3
- hCaptcha
- FunCaptcha (via 2Captcha)

**Usage:**
```javascript
const { captchaService } = require('./lib/captchaSolver');

// Detect captcha on page
const captchas = await captchaService.detectCaptcha(page);

// Solve reCAPTCHA v2
const token = await captchaService.solve('recaptcha_v2', {
  siteKey: 'your_site_key',
  pageUrl: 'https://example.com/release'
});

// Inject token
await captchaService.injectToken(page, token, 'recaptcha_v2');
```

**Environment Variables:**
```env
CAPTCHA_PROVIDER=2captcha
CAPTCHA_API_KEY=your_2captcha_key
```

### Anti-Bot Evasion (`lib/antiBot.js`)

#### Browser Fingerprinting Prevention
- Randomized user agents (Chrome, Firefox, Safari)
- Varied viewport sizes (1920x1080, 1366x768, etc.)
- Timezone/locale randomization
- Hardware profile spoofing (CPU cores, RAM, GPU)
- WebGL renderer randomization
- Canvas fingerprint noise injection
- Audio context randomization
- Plugin list generation
- WebRTC IP masking

#### Session Management
- Cookie persistence across requests
- LocalStorage/SessionStorage state saving
- Session expiration (configurable TTL)
- Request limit enforcement
- Activity tracking

#### Human-like Behavior
- Random delays (500-2000ms)
- Mouse movement simulation (curved paths with random steps)
- Human typing (variable keystroke delays)
- Page scrolling (gradual, realistic patterns)
- Element exploration (before main actions)

**Usage:**
```javascript
const { fingerprintManager, sessionManager, HumanBehavior } = require('./lib/antiBot');

// Create fingerprint
const fingerprint = fingerprintManager.generateFingerprint('user123');

// Apply to Playwright context
await fingerprintManager.applyToContext(context, fingerprint);

// Create session
const session = sessionManager.createSession('session123', {
  fingerprint,
  proxy,
  maxRequests: 100,
  ttl: 3600000 // 1 hour
});

// Restore session state
await sessionManager.restoreSessionState('session123', page);

// Human behavior
await HumanBehavior.explorePage(page);
await HumanBehavior.humanType(page, '#search', 'Air Jordan 1');
await HumanBehavior.humanMouseMove(page, '.add-to-cart');
await HumanBehavior.randomDelay(1000, 2000);
```

### ATC Links & Quicktasks (`lib/atcLinks.js`)

Generate Add-To-Cart links and bot quicktasks for instant checkout.

**Supported Retailers:**
- Nike SNKRS
- Adidas
- Footsites (Foot Locker, Champs, Eastbay, Footaction)
- Finish Line
- JD Sports (US, UK, EU)
- Shopify stores (universal)
- Supreme
- Best Buy
- Walmart
- Target

**Supported Bot Formats:**
- Cybersole
- Kodai AIO
- Nike Shoe Bot (NSB)
- Wrath AIO
- Universal (generic JSON)

**Usage:**
```javascript
const { ATCLinkGenerator, generateTaskPayload } = require('./lib/atcLinks');

// Generate Nike ATC link
const nikeLinks = ATCLinkGenerator.nike('DZ5485-612', '10.5');
// {
//   product_url: 'https://www.nike.com/launch/t/DZ5485-612',
//   atc_url: 'https://www.nike.com/launch/t/DZ5485-612?size=10.5',
//   quicktask: { type: 'nike', sku: 'DZ5485-612', size: '10.5', mode: 'launch' }
// }

// Auto-detect and generate
const links = ATCLinkGenerator.generate('footlocker', 'FL12345', { size: '9' });

// Generate full task payload for alerts
const payload = generateTaskPayload(release, 'kodai');
// Includes: release data, ATC links, quicktask for Kodai AIO
```

## Integration with Existing Pipeline

### Updated Pipeline Flow

1. **Scraper Templates** → Run with proxy + anti-bot evasion
2. **Captcha Detection** → Auto-solve if encountered
3. **Data Extraction** → Parse products with raffle scoring
4. **ATC Link Generation** → Add to release object
5. **Event Publishing** → Include ATC links and quicktasks in payload
6. **Alert Delivery** → Discord embeds with ATC buttons

### Enhanced Release Object Schema

```javascript
{
  sku: 'ABC123::footlocker',
  name: 'Air Jordan 1 Retro High OG',
  brand: 'Nike',
  price: 180,
  release_date: '2025-12-01T10:00:00Z',
  status: 'upcoming',
  image_url: 'https://...',
  product_url: 'https://...',
  source: 'footlocker',
  raffle_score: 8, // 0-10 scale
  
  // NEW: ATC data
  atc_links: {
    product_url: 'https://www.footlocker.com/product/...',
    atc_url: 'https://www.footlocker.com/api/v3/cart/add?sku=...',
    checkout_url: 'https://...',
    quicktask: {
      type: 'footsites',
      site: 'footlocker',
      sku: 'ABC123',
      size: 'random',
      mode: 'product'
    }
  },
  
  // Platform-specific quicktasks
  quicktasks: {
    cybersole: { site: 'footlocker', sku: 'ABC123', ... },
    kodai: { retailer: 'footlocker', product_sku: 'ABC123', ... }
  },
  
  ingestion_started: '2025-11-13T12:00:00Z',
  ingestion_completed: '2025-11-13T12:00:05Z',
  latency_ms: 5000
}
```

### Discord Alert Enhancements

Alerts now include:
- **ATC Link Button** - Direct add-to-cart
- **Quicktask JSON** - Copy for bot
- **Raffle Score** - Visual indicator (⭐ x8 if raffle_score >= 7)
- **Platform Badges** - Nike, Adidas, Footsites icons

## Configuration

### Shopify Store Targets (`scripts/shopify_stores.json`)

```json
[
  {
    "url": "https://kith.com",
    "collectionPaths": ["/collections/footwear", "/collections/new-arrivals"],
    "maxProducts": 50
  },
  {
    "url": "https://blendsus.com",
    "collectionPaths": ["/collections/sneakers"],
    "maxProducts": 30
  },
  {
    "url": "https://undefeated.com",
    "collectionPaths": ["/collections/all"],
    "maxProducts": 40
  }
]
```

### Environment Variables (Complete List)

```env
# Proxy Configuration
DEFAULT_PROXY_PROVIDER=webshare
WEBSHARE_API_KEY=
WEBSHARE_PROXY_LIST=
SMARTPROXY_PROXY_SERVER=
SMARTPROXY_PROXY_USERNAME=
SMARTPROXY_PROXY_PASSWORD=
OXYLABS_API_KEY=
SOAX_API_KEY=
BRIGHTDATA_API_KEY=

# Captcha Solving
CAPTCHA_PROVIDER=2captcha
CAPTCHA_API_KEY=

# Scraper Behavior
VOLATILE_POLL_INTERVAL_MS=45000
SCRAPER_CB_THRESHOLD=3
SCRAPER_CB_COOLDOWN_MS=900000
HUMAN_BEHAVIOR_ENABLED=true
FINGERPRINT_ROTATION_ENABLED=true

# Session Management
SESSION_TTL_MS=3600000
SESSION_MAX_REQUESTS=100

# ATC Links
ATC_LINK_GENERATION_ENABLED=true
QUICKTASK_BOT_TYPES=cybersole,kodai,nsb,wrath
```

## Usage Examples

### Scraping Foot Locker with Full Stack

```javascript
const { scrapeFootsites } = require('./templates/footlocker');
const { proxyManager } = require('./lib/proxyManager');
const { fingerprintManager, sessionManager, HumanBehavior } = require('./lib/antiBot');
const { captchaService } = require('./lib/captchaSolver');
const { ATCLinkGenerator } = require('./lib/atcLinks');

async function scrapeFootLockerFull() {
  // Get proxy
  const proxy = await proxyManager.getProxy('footlocker_scraper', {
    provider: 'webshare',
    rotation: 'round-robin'
  });

  // Generate fingerprint
  const fingerprint = fingerprintManager.generateFingerprint('fl_session_1');

  // Scrape (anti-bot + proxy built-in)
  const releases = await scrapeFootsites('footlocker', proxy);

  // Enhance with ATC links
  for (const release of releases) {
    const atcData = ATCLinkGenerator.generate(release.source, release.sku.split('::')[0], {
      size: 'random',
      productUrl: release.product_url
    });
    release.atc_links = atcData;
  }

  return releases;
}
```

### Batch Scraping Shopify Boutiques

```javascript
const { scrapeShopifyStores } = require('./templates/shopify');
const storeConfigs = require('./scripts/shopify_stores.json');
const { proxyManager } = require('./lib/proxyManager');

async function scrapeAllBoutiques() {
  const proxy = await proxyManager.getProxy('shopify_scraper', {
    provider: 'smartproxy',
    rotation: 'random'
  });

  const allReleases = await scrapeShopifyStores(storeConfigs, proxy);
  
  // Filter high raffle scores
  const raffles = allReleases.filter(r => r.raffle_score >= 7);
  
  console.log(`Found ${raffles.length} raffles out of ${allReleases.length} releases`);
  return allReleases;
}
```

### Resale Price Tracking

```javascript
const { scrapeGOAT, scrapeStockX } = require('./templates/resale');

async function trackResalePrices(query) {
  const [goatListings, stockxListings] = await Promise.all([
    scrapeGOAT(query),
    scrapeStockX(query)
  ]);

  // Compare prices
  const comparison = goatListings.map(goat => {
    const stockx = stockxListings.find(s => s.name === goat.name);
    return {
      name: goat.name,
      goat_price: goat.lowest_price,
      stockx_price: stockx?.lowest_price,
      best_platform: goat.lowest_price < (stockx?.lowest_price || Infinity) ? 'GOAT' : 'StockX'
    };
  });

  return comparison;
}
```

## Performance Considerations

- **Proxy Rotation**: Prevents IP bans; use sticky for queue systems, rotating for bulk scraping
- **Captcha Budget**: 2Captcha costs ~$3/1000 solves; minimize by using anti-bot evasion first
- **Session Limits**: Default 100 requests/session; rotate sessions for long-running scrapers
- **Raffle Detection**: Adds <50ms per product; negligible overhead
- **ATC Generation**: Instant; no API calls required

## Legal & Ethical Compliance

- **Respect robots.txt**: Ethical scrapers honor directives
- **Rate Limiting**: Built into pipeline (3s delay between stores)
- **Terms of Service**: User responsibility; scraping may violate retailer ToS
- **Personal Data**: Scrapers avoid PII; focus on public product data
- **Commercial Use**: Consult legal counsel for large-scale/commercial operations

## Roadmap

1. **Phase 1** (Current): Core scraper templates, proxy/captcha/anti-bot infrastructure
2. **Phase 2** (Q1 2026): Supreme, YeezySupply, BSTN, SNS templates
3. **Phase 3** (Q2 2026): API-based scrapers (Nike Commerce API, Adidas DemandWare)
4. **Phase 4** (Q3 2026): ML-powered raffle prediction (beyond keyword matching)
5. **Phase 5** (Q4 2026): Integrated cook group features (early links, guides, group buys)

## Support & Resources

- **Discord**: Join sneaker community servers for real-time updates
- **GitHub**: Issues and PRs welcome for new templates
- **Documentation**: See individual module READMEs in `scrapers/lib/` and `templates/`

## References

This integration is based on research from:
- 27 cited sources on sneaker scraping ecosystem (see comprehensive report)
- Open-source projects: Sneaker-Monitors, SNKRS-Monitor, SneakerBot, kekmonitors
- Commercial platforms: Restocked.io, Distill.io, Raffle Sneakers
- Cook groups: ChefCooks, Notify, Kodai Exclusive (pricing/feature benchmarks)
- Proxy providers: Webshare, Smartproxy, Oxylabs, SOAX, Bright Data
- Bot integrations: Cybersole, Kodai AIO, NSB, Wrath AIO

---

**Last Updated**: November 13, 2025
**Maintainer**: Live Shoe Tracker Team
