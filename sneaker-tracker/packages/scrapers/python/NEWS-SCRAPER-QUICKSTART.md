# 🗞️ BeautifulSoup News Scraper — Quick Start

Get real-time sneaker release news from aggregator sites in 5 minutes.

---

## What This Does

Scrapes **release announcements** from news sites (not store inventory):
- **Sneaker News** — Latest releases, rumors, reviews
- **Hypebeast** — Sneaker news & culture
- **Nice Kicks** — Release dates & coverage
- **Complex Sneakers** — News & commentary

Updates **every 15-30 minutes** for real-time tracking.

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd sneaker-tracker\packages\scrapers\python

# Install Python packages
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file:

```env
# Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
```

### 3. Create Database Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create sneaker_news table
CREATE TABLE IF NOT EXISTS sneaker_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,  -- Prevents duplicates
  published_date TIMESTAMPTZ,
  image_url TEXT,
  excerpt TEXT,
  source TEXT NOT NULL,  -- 'sneakernews', 'hypebeast', etc.
  tags TEXT[],
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast querying
CREATE INDEX IF NOT EXISTS idx_sneaker_news_source ON sneaker_news(source);
CREATE INDEX IF NOT EXISTS idx_sneaker_news_published ON sneaker_news(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_sneaker_news_created ON sneaker_news(created_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE sneaker_news ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust as needed)
CREATE POLICY "Allow public read access" ON sneaker_news
  FOR SELECT USING (true);
```

### 4. Test Single Site

```powershell
# Scrape Sneaker News (20 articles)
python news_scraper.py --site sneakernews --limit 20

# Scrape Hypebeast
python news_scraper.py --site hypebeast --limit 20

# Scrape all sites
python news_scraper.py --site all --limit 10
```

### 5. Start Real-Time Scheduler

```powershell
# Every 15 minutes (real-time mode)
python realtime_scheduler.py --mode realtime

# Every 30 minutes (balanced mode)
python realtime_scheduler.py --mode balanced

# Hourly
python realtime_scheduler.py --mode hourly
```

---

## 📊 Output

### Console Output

```
================================================================================
Starting scheduled scrape run (mode=realtime)
================================================================================
Scraping sneakernews...
Found 30 article elements
Processed 20/20 articles
Saved 18/20 articles to Supabase
sneakernews: 20 articles, 0 errors

Scraping hypebeast...
Found 25 article elements
Processed 20/20 articles
Saved 15/20 articles to Supabase
hypebeast: 20 articles, 0 errors

================================================================================
Run complete: 40 articles, 0 errors, 12.3s
================================================================================
```

### Logs

All activity logged to:
- `logs/realtime_scheduler.log` — Detailed logs
- `logs/scheduler_runs.jsonl` — JSON stats per run
- `logs/scheduler_stats.json` — Overall stats

### Supabase Data

Query your data:

```sql
-- Latest articles
SELECT title, source, published_date, url
FROM sneaker_news
ORDER BY created_at DESC
LIMIT 20;

-- Articles by source
SELECT source, COUNT(*) as count
FROM sneaker_news
GROUP BY source;

-- Recent releases (last 24 hours)
SELECT title, source, published_date
FROM sneaker_news
WHERE published_date > NOW() - INTERVAL '24 hours'
ORDER BY published_date DESC;
```

---

## 🤖 Compliance Checks

Before scraping, the system:
1. ✅ Checks `robots.txt` for each site
2. ✅ Respects `crawl-delay` directives
3. ✅ Uses descriptive User-Agent
4. ✅ Handles rate limiting (HTTP 429)
5. ✅ Prevents duplicate articles (URL deduplication)

See `ROBOTS-COMPLIANCE.md` for full policy details.

---

## 🔧 Advanced Usage

### Dry Run (No Database)

```powershell
# Test scraping without saving
python news_scraper.py --site sneakernews --no-save
```

### One-Time Run

```powershell
# Run once then exit (for testing)
python realtime_scheduler.py --once
```

### Verbose Logging

```powershell
# Debug mode
python news_scraper.py --site sneakernews --verbose
```

### Custom Interval

Edit `realtime_scheduler.py` and add to `SCHEDULING_MODES`:

```python
'custom': {
    'interval_minutes': 45,  # Your interval
    'description': 'Every 45 minutes',
    'sites': ['sneakernews', 'hypebeast']
}
```

Then run:

```powershell
python realtime_scheduler.py --mode custom
```

---

## 📈 Monitoring

### Check Stats

```powershell
# View current stats
cat logs/scheduler_stats.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

# View recent runs
Get-Content logs/scheduler_runs.jsonl | Select-Object -Last 5
```

### Dashboard Integration

Use Supabase Realtime to stream new articles to your frontend:

```javascript
// Example: Next.js/React
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// Subscribe to new articles
const subscription = supabase
  .channel('sneaker_news_changes')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'sneaker_news' },
    (payload) => {
      console.log('New article:', payload.new)
      // Update UI with new article
    }
  )
  .subscribe()
```

---

## 🛠️ Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'apscheduler'`

**Solution**: Install dependencies

```powershell
pip install -r requirements.txt
```

### Issue: `Error: Missing environment variables: SUPABASE_URL, SUPABASE_KEY`

**Solution**: Create `.env` file with your Supabase credentials

```powershell
# Copy example
cp .env.example .env

# Edit with your values
notepad .env
```

### Issue: `Blocked by robots.txt`

**Solution**: Site disallows scraping. Check `ROBOTS-COMPLIANCE.md` and remove from `sites` list.

### Issue: HTTP 429 (Too Many Requests)

**Solution**: Increase delay in `news_scraper.py`:

```python
SITE_CONFIGS = {
    'sneakernews': {
        # ...
        'delay': 2.0,  # Increase from 1.0 to 2.0
    }
}
```

### Issue: No articles found

**Solution**: Site HTML structure may have changed. Update selectors in `news_scraper.py`:

```python
# Inspect site HTML and update selectors
'article_selector': 'article.post',  # Update this
'title_selector': 'h2.entry-title a',  # And this
```

---

## 📚 Next Steps

1. **Add More Sites**: Edit `SITE_CONFIGS` in `news_scraper.py`
2. **Set Up Windows Task Scheduler**: See `DEPLOYMENT-GUIDE.md`
3. **Build Dashboard**: Use Next.js + Supabase Realtime
4. **Add Notifications**: Send alerts for new releases
5. **Integrate with Stores**: Cross-reference news with store scrapers

---

## 📖 Related Documentation

- `ROBOTS-COMPLIANCE.md` — Legal compliance policies
- `SCRAPING-LIBRARIES.md` — Library comparison guide
- `SETUP-GUIDE.md` — Full Python setup (Playwright)
- `README.md` — Project overview

---

**Ready to track releases in real-time? Run:**

```powershell
python realtime_scheduler.py --mode realtime
```
