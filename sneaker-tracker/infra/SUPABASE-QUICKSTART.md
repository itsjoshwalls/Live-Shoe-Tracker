# Supabase Docker Quick Start

Complete guide to running local self-hosted Supabase for Live Shoe Tracker.

---

## Why Docker Supabase?

✅ **Full Control**: Own your data and infrastructure  
✅ **No Internet Required**: Develop offline  
✅ **Zero Cloud Costs**: Free local development  
✅ **Easy Debugging**: Direct database access  
✅ **Version Control**: Track schema changes in git  

---

## Prerequisites

1. **Docker Desktop** installed and running
2. **Python 3.8+** with requirements.txt installed
3. **PowerShell** (Windows)

---

## Quick Setup (5 minutes)

### Step 1: Navigate to Infra Directory

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\infra
```

### Step 2: Start Supabase + Initialize Schemas

```powershell
.\Setup-Supabase.ps1 -Start -InitSchemas
```

This will:
- Create `.env.supabase` from example
- Start 7 Docker containers (Postgres, Studio, Kong, PostgREST, Realtime, Meta, pgAdmin)
- Wait for PostgreSQL to be ready
- Run all SQL schemas (`solesavy_schema.sql`, `soleretriever_schema.sql`)

### Step 3: Configure Python Scrapers

```powershell
cd ..\packages\scrapers\python

# Update .env file
notepad .env  # Or your preferred editor
```

Add these lines to `.env`:
```env
SUPABASE_URL=http://localhost:8000
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### Step 4: Test a Scraper

```powershell
# Test SoleSavy (no-save mode)
python solesavy_scraper.py --mode releases --limit 5 --no-save

# Test Sole Retriever (no-save mode)
python soleretriever_scraper.py --collection jordan --limit 5 --no-save
```

### Step 5: Start Real-Time Scheduler

```powershell
# Create logs directory if needed
New-Item -ItemType Directory -Force -Path logs

# Start scheduler (scrapes 6 sites every 15 minutes)
python realtime_scheduler.py --mode realtime
```

---

## Access Points

Once running, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Supabase Studio** | http://localhost:3000 | Web UI for database management |
| **pgAdmin** | http://localhost:5050 | Advanced PostgreSQL management |
| **PostgREST API** | http://localhost:8000/rest/v1/ | Auto-generated REST API |
| **Realtime** | ws://localhost:8000/realtime/v1/ | WebSocket subscriptions |
| **PostgreSQL** | `localhost:5432` | Direct database connection |

### pgAdmin Credentials
- **Email**: `admin@sneakertracker.local`
- **Password**: `admin` (changeable in `.env.supabase`)

---

## Management Commands

### Start Supabase
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\infra
.\Setup-Supabase.ps1 -Start
```

### Stop Supabase
```powershell
.\Setup-Supabase.ps1 -Stop
```

### Restart Supabase
```powershell
.\Setup-Supabase.ps1 -Restart
```

### View Logs
```powershell
.\Setup-Supabase.ps1 -Logs
```

### Re-run Schemas (if you update SQL files)
```powershell
.\Setup-Supabase.ps1 -InitSchemas
```

### Clean (DELETE ALL DATA)
```powershell
.\Setup-Supabase.ps1 -Clean
```

---

## Database Tables Created

### 1. `solesavy_data`
Stores SoleSavy releases, raffles, and news.

**Key Fields**:
- `title`, `url` (unique), `type` (release/raffle/news)
- `release_date`, `entry_deadline`
- `retailer`, `status`, `price`, `sku`
- `tags` (array), `scraped_at`

**Indexes**: 7 total (type, release_date, entry_deadline, url_hash, status, full-text search)

### 2. `soleretriever_data`
Stores comprehensive release data from Sole Retriever.

**Key Fields**:
- `title`, `url` (unique), `brand`, `sku`, `style_code`
- `price`, `currency`, `release_date`, `status`
- `has_raffle`, `raffle_retailers` (array)
- `images` (JSONB), `collection`, `category`

**Indexes**: 9 total (brand, collection, release_date, status, has_raffle, url_hash, sku, JSONB, full-text search)

### 3. `sneaker_news` (from earlier)
News articles from 6 sources.

### 4. `sneaker_releases` (from earlier)
Store product data from 41 retailer scrapers.

---

## Scraper Configurations

### SoleSavy Scraper
```powershell
# Scrape releases (BeautifulSoup)
python solesavy_scraper.py --mode releases --limit 10

# Scrape news (BeautifulSoup)
python solesavy_scraper.py --mode news --limit 10

# Scrape raffles (Playwright for dynamic content)
python solesavy_scraper.py --mode raffles --limit 10 --use-playwright

# All modes combined
python solesavy_scraper.py --mode all --limit 5
```

### Sole Retriever Scraper
```powershell
# Scrape specific collection
python soleretriever_scraper.py --collection jordan --limit 20

# Multiple collections
python soleretriever_scraper.py --collection nike,adidas,yeezy --limit 10

# All collections
python soleretriever_scraper.py --collection all --limit 5

# Use Playwright for infinite scroll
python soleretriever_scraper.py --collection jordan --limit 50 --use-playwright
```

### News Scraper (All 6 Sites)
```powershell
# All sites
python news_scraper.py --site all --limit 5

# Specific site
python news_scraper.py --site solesavy --limit 10
```

---

## Real-Time Scheduler Modes

### Realtime (15 minutes)
```powershell
python realtime_scheduler.py --mode realtime
```
Scrapes all 6 sites every 15 minutes:
- Sneaker News, Hypebeast, Nice Kicks, Complex, SoleSavy, Sole Retriever

### Balanced (30 minutes)
```powershell
python realtime_scheduler.py --mode balanced
```

### Hourly
```powershell
python realtime_scheduler.py --mode hourly
```

### Quick (5 minutes - for testing)
```powershell
python realtime_scheduler.py --mode quick
```

---

## Monitoring Logs

### Python Scraper Logs
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python

# Tail logs in real-time
Get-Content logs/realtime_scheduler.log -Tail 50 -Wait
```

### Docker Container Logs
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\infra

# All containers
.\Setup-Supabase.ps1 -Logs

# Specific container
docker logs sneaker-tracker-postgres -f
docker logs sneaker-tracker-studio -f
docker logs sneaker-tracker-kong -f
```

---

## Querying Data

### Using pgAdmin (Recommended)

1. Open http://localhost:5050
2. Login: `admin@sneakertracker.local` / `admin`
3. Add server:
   - **Name**: Local Supabase
   - **Host**: `postgres` (container name)
   - **Port**: `5432`
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: (from `.env.supabase`)

### Using PostgREST API

```powershell
# Get all SoleSavy releases
Invoke-RestMethod -Uri "http://localhost:8000/rest/v1/solesavy_data?type=eq.release&order=release_date.desc" -Headers @{
    "apikey" = "your-anon-key-from-env"
}

# Get Sole Retriever Jordan releases
Invoke-RestMethod -Uri "http://localhost:8000/rest/v1/soleretriever_data?collection=eq.jordan&order=release_date.desc" -Headers @{
    "apikey" = "your-anon-key-from-env"
}
```

### Using SQL (pgAdmin or psql)

```sql
-- Recent SoleSavy releases
SELECT title, release_date, retailer, url
FROM solesavy_data
WHERE type = 'release'
  AND release_date >= CURRENT_DATE
ORDER BY release_date ASC
LIMIT 10;

-- Upcoming raffles
SELECT title, entry_deadline, retailer
FROM solesavy_data
WHERE type = 'raffle'
  AND entry_deadline >= NOW()
ORDER BY entry_deadline ASC;

-- Sole Retriever by brand
SELECT brand, COUNT(*) as count
FROM soleretriever_data
GROUP BY brand
ORDER BY count DESC;

-- Full-text search for "Dunk"
SELECT title, brand, release_date
FROM soleretriever_data
WHERE to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ to_tsquery('english', 'Dunk')
ORDER BY release_date DESC;
```

---

## Troubleshooting

### "Docker is not running"
- Start Docker Desktop
- Wait for it to fully start (whale icon in system tray)

### "PostgreSQL is not ready"
- Wait 30 seconds and retry
- Check logs: `docker logs sneaker-tracker-postgres`

### "Cannot connect to localhost:8000"
- Check Kong is running: `docker ps | grep kong`
- Restart: `.\Setup-Supabase.ps1 -Restart`

### "Table does not exist"
- Run schemas: `.\Setup-Supabase.ps1 -InitSchemas`
- Check logs: `docker logs sneaker-tracker-postgres`

### Scraper errors
- Verify `.env` has correct `SUPABASE_URL` and `SUPABASE_KEY`
- Test with `--no-save` flag first
- Check logs: `logs/realtime_scheduler.log`

### Port conflicts
If ports 3000, 5432, 8000, etc. are in use:
- Edit `docker-compose.supabase.yml` to change port mappings
- Example: Change `"3000:3000"` to `"3001:3000"`

---

## Data Backup

### Export Database
```powershell
docker exec sneaker-tracker-postgres pg_dump -U postgres -d postgres > backup.sql
```

### Import Database
```powershell
Get-Content backup.sql | docker exec -i sneaker-tracker-postgres psql -U postgres -d postgres
```

---

## Next Steps

1. **Start Supabase**: `.\Setup-Supabase.ps1 -Start -InitSchemas`
2. **Test scrapers**: Run with `--no-save` flag first
3. **Start scheduler**: `python realtime_scheduler.py --mode realtime`
4. **Monitor logs**: Check `logs/realtime_scheduler.log`
5. **View data**: Open http://localhost:3000 or http://localhost:5050

---

## Architecture

```
┌─────────────────┐
│  Python Scrapers │
│  (6 sites)       │
└────────┬─────────┘
         │
         ▼ HTTP POST
┌─────────────────┐
│  Kong Gateway    │  :8000
│  (API Router)    │
└────────┬─────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│PostgREST│ │Realtime│ │  Meta  │ │ Studio │
│  :3001  │ │ :4000  │ │ :8080  │ │ :3000  │
└───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
    │          │          │          │
    └──────────┴──────────┴──────────┘
                    ▼
            ┌──────────────┐
            │  PostgreSQL   │  :5432
            │  (Main DB)    │
            └──────────────┘
                    ▲
                    │
            ┌──────────────┐
            │   pgAdmin     │  :5050
            └──────────────┘
```

---

## Support

- **Documentation**: See `HYBRID-SCRAPER-GUIDE.md`, `ROBOTS-COMPLIANCE.md`
- **Schemas**: `packages/scrapers/python/schemas/`
- **Docker Config**: `infra/docker-compose.supabase.yml`
- **Logs**: `packages/scrapers/python/logs/`

---

**Status**: ✅ Ready to Deploy  
**Last Updated**: 2025  
**Version**: 1.0.0
