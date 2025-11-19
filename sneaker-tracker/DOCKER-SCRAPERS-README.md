# Docker Scraper Infrastructure - Quick Start

## Overview
Complete Docker-based scraper system with 7 independent services:
- **Shopify**: 36 boutique stores (bdgastore, Undefeated, SNS, Size?, etc.)
- **SNKRS**: Nike SNKRS API monitor
- **Confirmed**: adidas Confirmed app tracker
- **Supreme**: Supreme sitemap monitor
- **Raffles**: Multi-boutique raffle scraper (END, SNS, Footpatrol, Size?, Offspring, Undefeated, BAIT, Extra Butter)
- **Queues**: Queue status monitor (Footsites, JD, Finishline)
- **StockX Prices**: Resale price tracking for ML forecasting

## Project Structure

```
sneaker-tracker/
├── infra/
│   └── docker-compose.yml        # Main orchestration file
├── scrapers/
│   ├── shopify/
│   │   ├── Dockerfile
│   │   └── scraper-worker.js
│   ├── snkrs/
│   │   ├── Dockerfile
│   │   └── scraper-worker.js
│   ├── confirmed/
│   │   ├── Dockerfile
│   │   └── scraper-worker.py
│   ├── supreme/
│   │   ├── Dockerfile
│   │   └── scraper-worker.js
│   ├── raffles/
│   │   ├── Dockerfile
│   │   └── scraper-worker.py    # 8 boutiques
│   ├── queues/
│   │   ├── Dockerfile
│   │   └── scraper-worker.js
│   └── stockx-prices/
│       ├── Dockerfile
│       ├── scraper-worker.py
│       └── stockx_prices.cjs    # sneaks-api wrapper
└── .env                         # Environment variables
```

## Setup

### 1. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Scraper intervals (seconds)
SHOPIFY_SCRAPE_INTERVAL=300      # 5 minutes
SNKRS_SCRAPE_INTERVAL=180        # 3 minutes
RAFFLES_SCRAPE_INTERVAL=600      # 10 minutes
STOCKX_SCRAPE_INTERVAL=3600      # 1 hour
```

### 2. Run Migration

Apply database schema for new tables:

```powershell
cd packages\supabase-migrations
.\run-migration.ps1
```

Or use Supabase Dashboard SQL Editor:
- Paste content from `migrations\20251118_raffles_news_prices.sql`
- Click RUN

### 3. Start Scrapers

```bash
cd infra
docker-compose up -d
```

### 4. Monitor Logs

```bash
# All scrapers
docker-compose logs -f

# Specific scraper
docker-compose logs -f raffles-scraper
docker-compose logs -f stockx-prices
```

### 5. Stop/Restart

```bash
# Stop all
docker-compose down

# Restart single service
docker-compose restart raffles-scraper

# Rebuild after code changes
docker-compose up -d --build
```

## Data Flow

1. **Scrapers** → Fetch data from retailers/APIs
2. **Supabase** → Store in tables (`shoe_releases`, `raffles`, `price_points`)
3. **Realtime** → Broadcast updates to clients
4. **Web/Desktop Apps** → Subscribe and display

## Raffle Scraper Coverage

- **END** - launches.endclothing.com
- **SNS** - sneakersnstuff.com/raffle
- **Footpatrol** - footpatrol.com/raffles
- **Size?** - size.co.uk/launches
- **Offspring** - offspring.co.uk/launches
- **Undefeated** - undefeated.com/collections/raffle
- **BAIT** - baitme.com/collections/raffle
- **Extra Butter** - shop.extrabutterny.com/collections/raffle

## Troubleshooting

### Scraper not running
```bash
docker-compose ps  # Check status
docker-compose logs raffles-scraper  # Check errors
```

### No data appearing
- Verify Supabase credentials in `.env`
- Check migration applied: Supabase Dashboard → Database → Tables
- Confirm scrapers writing: `docker-compose logs -f`

### Rate limiting
- Increase `SCRAPE_INTERVAL` in `.env`
- Rebuild: `docker-compose up -d --build`

## Next Steps

1. ✅ Migration applied
2. ✅ Docker infrastructure ready
3. ▶️ Start scrapers: `docker-compose up -d`
4. ▶️ Test UI pages (raffles/news) after data populates
5. ▶️ Monitor ML forecasting with price_points data
