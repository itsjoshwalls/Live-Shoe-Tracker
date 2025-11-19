# 🚀 Hybrid Scraper Quick Reference

**BeautifulSoup + Playwright combo for maximum efficiency**

---

## 🎯 When to Use What

### Use BeautifulSoup (Fast, Lightweight)
- ✅ Static HTML pages (news articles, blogs)
- ✅ Server-side rendered content
- ✅ Public data (no authentication)
- ✅ Simple pagination
- ✅ WordPress sites, standard CMSs

**Best for**: Sneaker News, Hypebeast, Nice Kicks, Complex

### Use Playwright (Powerful, Slower)
- ✅ JavaScript-rendered content
- ✅ Infinite scroll / lazy loading
- ✅ Dynamic forms (raffles, searches)
- ✅ API interception needed
- ✅ Complex interactions

**Best for**: GOAT, adidas Confirmed, raffle pages, SPAs

### Use Hybrid (Both)
- ✅ Site with mixed content types
- ✅ Static pages + dynamic sections
- ✅ BeautifulSoup first, Playwright fallback
- ✅ Optimize speed while handling complexity

**Best for**: SoleSavy, Sole Retriever, Nike, Shopify stores

---

## 📦 Available Scrapers

### News/Aggregator Scrapers

| Scraper | Sites | Technology | Speed | Command |
|---------|-------|-----------|-------|---------|
| **news_scraper.py** | 6 news sites | BeautifulSoup | Fast | `python news_scraper.py --site sneakernews` |
| **solesavy_scraper.py** | SoleSavy | Hybrid | Medium | `python solesavy_scraper.py --mode releases` |
| **soleretriever_scraper.py** | Sole Retriever | Hybrid | Medium | `python soleretriever_scraper.py --collection jordan` |

### Store Scrapers

| Scraper | Type | Technology | Command |
|---------|------|-----------|---------|
| **base_scraper.py** | Shopify generic | Playwright | `python base_scraper.py kith https://kith.com` |
| **goat_scraper.py** | Resale | Playwright | `python goat_scraper.py` |
| **adidas_confirmed_scraper.py** | Official app | Playwright | `python adidas_confirmed_scraper.py US` |

---

## ⚡ Quick Commands

### Test Single Site
```powershell
# News (BeautifulSoup - fastest)
python news_scraper.py --site sneakernews --limit 20

# SoleSavy releases (BeautifulSoup)
python solesavy_scraper.py --mode releases --limit 50

# SoleSavy raffles (Playwright - dynamic content)
python solesavy_scraper.py --mode raffles --limit 30

# Sole Retriever upcoming (BeautifulSoup)
python soleretriever_scraper.py --mode releases --limit 100

# Sole Retriever with Playwright (infinite scroll)
python soleretriever_scraper.py --mode all --playwright
```

### Run All News Sites
```powershell
# All 6 sites (BeautifulSoup)
python news_scraper.py --site all --limit 10

# Real-time scheduler (every 15 min)
python realtime_scheduler.py --mode realtime
```

### Dry Run (No Database)
```powershell
python news_scraper.py --site solesavy --no-save
python solesavy_scraper.py --mode all --no-save
python soleretriever_scraper.py --collection nike --no-save
```

---

## 🔧 Configuration Examples

### news_scraper.py
```python
# Add new site to SITE_CONFIGS
'mysite': {
    'base_url': 'https://example.com',
    'category_path': '/sneakers/',
    'article_selector': 'article.post',
    'title_selector': 'h2 a',
    'date_selector': 'time',
    'image_selector': 'img.featured',
    'link_selector': 'a.permalink',
    'excerpt_selector': 'p.excerpt',
    'delay': 1.0,
    'user_agent': 'Live-Sneaker-Tracker-Bot/1.0'
}
```

### solesavy_scraper.py
```python
# Modes:
# 'releases' - Release calendar (BeautifulSoup)
# 'news' - News articles (BeautifulSoup)
# 'raffles' - Raffle info (Playwright)
# 'all' - Everything

scraper = SoleSavyScraper()
stats = scraper.run(mode='releases', limit=50, save=True)
```

### soleretriever_scraper.py
```python
# Collections:
COLLECTIONS = {
    'all': '/collections/all-releases',
    'nike': '/collections/nike',
    'jordan': '/collections/air-jordan',
    'adidas': '/collections/adidas',
    'yeezy': '/collections/yeezy',
    'upcoming': '/collections/upcoming-releases',
}

# Modes:
# 'releases' - Upcoming releases
# 'collection' - Specific brand/category
# 'all' - Multiple collections

scraper = SoleRetrieverScraper()
stats = scraper.run(
    mode='collection',
    collection='jordan',
    limit=100,
    use_playwright=False  # BeautifulSoup (faster)
)
```

---

## 🤖 Automation

### 15-Minute Real-Time
```powershell
# All 6 news sites every 15 minutes
python realtime_scheduler.py --mode realtime

# Sites scraped:
# - Sneaker News
# - Hypebeast
# - Nice Kicks
# - Complex
# - SoleSavy
# - Sole Retriever
```

### Windows Task Scheduler
```powershell
# Run as Administrator
.\Setup-TaskScheduler.ps1 -Mode realtime

# Creates scheduled task:
# - Runs every 15 minutes
# - Persists across restarts
# - Logs to logs/ directory
```

### Modes Available
- `realtime` - Every 15 minutes (96 runs/day)
- `balanced` - Every 30 minutes (48 runs/day)
- `hourly` - Every hour (24 runs/day)
- `quick` - Every 5 minutes (testing only)

---

## 🗄️ Database Tables

### sneaker_news (News Sites)
```sql
CREATE TABLE sneaker_news (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  published_date TIMESTAMPTZ,
  image_url TEXT,
  excerpt TEXT,
  source TEXT NOT NULL,  -- 'sneakernews', 'solesavy', etc.
  tags TEXT[],
  scraped_at TIMESTAMPTZ
);
```

### solesavy_data (SoleSavy)
```sql
CREATE TABLE solesavy_data (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  type TEXT,  -- 'release', 'raffle', 'news'
  release_date TIMESTAMPTZ,
  entry_deadline TIMESTAMPTZ,
  retailer TEXT,
  image_url TEXT,
  source TEXT DEFAULT 'solesavy',
  scraped_at TIMESTAMPTZ
);
```

### soleretriever_data (Sole Retriever)
```sql
CREATE TABLE soleretriever_data (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  brand TEXT,
  sku TEXT,
  release_date TIMESTAMPTZ,
  price TEXT,
  status TEXT,
  has_raffle BOOLEAN,
  image_url TEXT,
  source TEXT DEFAULT 'soleretriever',
  scraped_at TIMESTAMPTZ
);
```

---

## 📊 Performance Comparison

### Speed (100 items)

| Scraper | Technology | Time | Items/sec |
|---------|-----------|------|-----------|
| news_scraper.py (Sneaker News) | BeautifulSoup | 30s | 3.3 |
| news_scraper.py (all 6 sites) | BeautifulSoup | 120s | 5.0 |
| solesavy_scraper.py (releases) | BeautifulSoup | 45s | 2.2 |
| solesavy_scraper.py (raffles) | Playwright | 90s | 1.1 |
| soleretriever_scraper.py | BeautifulSoup | 60s | 1.7 |
| soleretriever_scraper.py | Playwright | 120s | 0.8 |
| goat_scraper.py | Playwright | 180s | 0.6 |

**Takeaway**: BeautifulSoup is 2-3x faster for static content.

### Resource Usage

| Technology | Memory | CPU | Disk I/O |
|-----------|--------|-----|----------|
| BeautifulSoup | ~50MB | Low (5-10%) | Minimal |
| Playwright | ~300MB | Medium (20-30%) | Moderate |
| Hybrid | ~150MB | Low-Medium (10-20%) | Low |

---

## 🔒 robots.txt Compliance

### Allowed Sites ✅
- Sneaker News: No restrictions
- Hypebeast: 1-2s crawl-delay
- Nice Kicks: No restrictions
- Complex: No restrictions
- SoleSavy: WordPress standard (no /wp-admin/)
- Sole Retriever: `/collections/*` allowed, `/raffle/*` blocked

### Blocked Patterns ❌
- Sole Retriever: `/raffle/[id]`, `/api/*`, `/user/*`
- All sites: Admin panels, user profiles

### Our Implementation
```python
# Built-in robots.txt checking
def can_fetch(self, url: str) -> bool:
    return self.robot_parser.can_fetch(self.USER_AGENT, url)

# Before every request
if not self.can_fetch(url):
    logger.warning(f"Blocked by robots.txt: {url}")
    return None
```

---

## 🛠️ Troubleshooting

### BeautifulSoup Issues

**Problem**: No items found  
**Solution**: Check selectors, inspect page HTML
```powershell
python news_scraper.py --site sneakernews --verbose
```

**Problem**: Parse errors  
**Solution**: Try different parser
```python
# lxml (faster)
soup = BeautifulSoup(html, 'lxml')

# html.parser (more lenient)
soup = BeautifulSoup(html, 'html.parser')
```

### Playwright Issues

**Problem**: Browser launch failed  
**Solution**: Reinstall Playwright browsers
```powershell
playwright install chromium --force
```

**Problem**: Timeout errors  
**Solution**: Increase timeout, use headful mode
```python
await page.goto(url, timeout=60000)  # 60 seconds
```

**Problem**: Too slow  
**Solution**: Use BeautifulSoup for static content
```powershell
# Instead of this (Playwright):
python soleretriever_scraper.py --playwright

# Use this (BeautifulSoup):
python soleretriever_scraper.py
```

### Hybrid Approach Decision Tree

```
Is content JavaScript-rendered?
├─ No → Use BeautifulSoup
│  └─ Example: news_scraper.py
│
└─ Yes → Check if critical
   ├─ Critical (raffle deadlines, live data) → Use Playwright
   │  └─ Example: solesavy_scraper.py --mode raffles
   │
   └─ Not critical (product listings) → Try BeautifulSoup first
      ├─ Works? → Great, keep it
      └─ Fails? → Add Playwright fallback
         └─ Example: soleretriever_scraper.py --playwright
```

---

## 📚 Related Documentation

- **[NEWS-SCRAPER-QUICKSTART.md](./NEWS-SCRAPER-QUICKSTART.md)** - 5-minute setup
- **[ROBOTS-COMPLIANCE.md](./ROBOTS-COMPLIANCE.md)** - Legal compliance
- **[README.md](./README.md)** - Full overview
- **[SCRAPING-LIBRARIES.md](./SCRAPING-LIBRARIES.md)** - Library comparison

---

## 💡 Pro Tips

1. **Start with BeautifulSoup** - Try it first, add Playwright only if needed
2. **Use Playwright selectively** - Only for dynamic content (raffles, SPAs)
3. **Combine approaches** - BeautifulSoup for listings, Playwright for details
4. **Monitor performance** - Check `elapsed_seconds` in stats output
5. **Respect robots.txt** - Always check compliance before scraping
6. **Rate limit properly** - 1-2 seconds between requests minimum
7. **Log everything** - Use `--verbose` for debugging
8. **Test incrementally** - Start with `--limit 5` before full runs

---

**Quick Start Command**:
```powershell
# Test all 6 news sites (BeautifulSoup + Hybrid)
python news_scraper.py --site all --limit 5

# Start 15-minute automation
python realtime_scheduler.py --mode realtime
```
