# Store Scrapers (JavaScript)

This package contains a registry and scaffolding for store-specific scrapers that find live sneaker releases across many retailers. It complements existing Python scrapers (e.g., Shopify monitor) and provides a unified JavaScript interface.

## Structure

- `index.js` – tiny CLI runner and orchestrator
- `config.js` – registry of stores with type and module path
- `scrapers/core/` – base classes and utilities
- `scrapers/*.js` – store-specific implementations (stubs for non-Shopify)
- `handlers/` – pluggable handlers for releases, stats, and alerts

## Supported/Registered Stores

The registry already includes the following (and more): Nike, SNKRS, Adidas, Footlocker, Champs, JD Sports, Finishline, Hibbett, Undefeated, Concepts, Kith, Bodega, END., Offspring, Sneakersnstuff, Lapstone & Hammer, Extra Butter, Atmos, Social Status, A Ma Manière, size?, One Block Down, Solebox, Asphaltgold, Hanon, Feature, KICKZ, BAIT, Oneness, Palace, StockX, plus additional Shopify-based stores (Sneaker Politics, Saint Alfred, DTLR, Notre, Union LA, Shoe Palace, etc.).

- Shopify-backed stores use the generic `ShopifyScraper` with minimal setup.
- Non-Shopify stores are scaffolded as stubs and can be implemented incrementally.

## Usage

```bash
# From monorepo root
pnpm --filter @sneaker-tracker/scrapers install
pnpm --filter @sneaker-tracker/scrapers run start               # Run all enabled scrapers
pnpm --filter @sneaker-tracker/scrapers run start nike          # Run a specific scraper
pnpm --filter @sneaker-tracker/scrapers run gen -- name=myShop type=shopify domain=example.com enabled=true  # Add a Shopify store
pnpm --filter @sneaker-tracker/scrapers run gen -- name=myCustom type=custom enabled=false                   # Add a custom stub
pnpm --filter @sneaker-tracker/scrapers run stats:finalize      # Finalize yesterday's Firestore stats (requires FIREBASE_SERVICE_ACCOUNT)
pnpm --filter @sneaker-tracker/scrapers run stats:finalize -- date=2025-11-03  # Finalize a specific date
```

Note: Some stores require advanced authentication or headless browsers. Those are scaffolded as `custom` and return an empty list until implemented.

## Implementing a Store

1. Add an entry in `config.js` (set `enabled: true` when ready).
2. For Shopify stores, set `{ type: 'shopify', domain: 'example.com' }`.
3. For custom stores, create `scrapers/<store>.js` exporting a class extending `BaseScraper` and implement `fetchReleases()`.

## Output Shape

Each scraper should return an array of normalized releases:

```js
{
  retailer: 'kith',
  name: 'Air Jordan 1 High OG',
  sku: '555088-701',
  price: 179.99,
  currency: 'USD',
  url: 'https://kith.com/products/...',
  imageUrl: 'https://...jpg',
  releaseDate: '2025-12-25T10:00:00Z',
  status: 'upcoming',
  locations: [],
  sizes: []
}
```

## Next Steps

- Implement non-Shopify scrapers (Footsites, END., SNS, size?)
- Add pagination and product filtering (e.g., by tags or collections)
- Integrate outputs with Supabase/Firebase ingestion workers
- Add Playwright-based variants for stores requiring JS rendering
 - Use the generator to quickly add more stores to the registry

## Firestore Daily Stats

This package can optionally update daily stats in Firestore if `FIREBASE_SERVICE_ACCOUNT` is set to the full JSON of a service account with write access.

### Retailer Metadata Tracking

The `retailerHandler` automatically maintains a Firestore `retailers` collection with metadata for each store:

```javascript
// Firestore structure: retailers/{retailerId}
{
  retailerId: "kith",
  retailerName: "Kith",
  region: "US",
  logoUrl: "https://logo.clearbit.com/kith.com",
  apiUrl: "https://kith.com/collections/footwear",
  rafflePattern: null,
  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

This metadata is created/updated automatically when scrapers run.

### Stock Snapshot Tracking

The `stockHandler` records stock level changes as subcollections under each release:

```javascript
// Firestore structure: releases/{releaseId}/stock_snapshots/{timestamp}
{
  stock: {
    "US_9": { total: 50, available: 20 },
    "US_10": { total: 60, available: 0 }
  },
  timestamp: <timestamp>
}

// Parent document updated with: releases/{releaseId}
{
  liveStock: { ... },
  stockUpdatedAt: <timestamp>
}
```

Stock snapshots are only recorded when data changes (deduplication via JSON comparison).

### Configuration

PowerShell example:

```pwsh
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw
pnpm --filter @sneaker-tracker/scrapers run start kith   # updates counters for today
pnpm --filter @sneaker-tracker/scrapers run stats:finalize  # computes yesterday summary
```

Windows Task Scheduler (daily finalize at 12:10am UTC) example action (Program/script):

```pwsh
powershell.exe
```

Arguments (adjust paths):

```pwsh
-NoProfile -ExecutionPolicy Bypass -Command "$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw; cd 'C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker'; pnpm --filter @sneaker-tracker/scrapers run stats:finalize"
```
