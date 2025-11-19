# Web Scraping Libraries & Services - Comprehensive Guide

## Core Python Libraries

### HTML Parsing
1. **BeautifulSoup4** (bs4)
   - Simple, pythonic HTML/XML parsing
   - Best for: Static pages, simple scraping
   - `pip install beautifulsoup4`

2. **lxml**
   - Fast XML/HTML parser
   - XPath support
   - `pip install lxml`

3. **html5lib**
   - Standards-compliant HTML5 parser
   - `pip install html5lib`

### HTTP Clients
4. **requests**
   - Simple HTTP library
   - Best for: API calls, simple GET/POST
   - `pip install requests`

5. **httpx**
   - Modern async HTTP client
   - HTTP/2 support
   - `pip install httpx`

6. **aiohttp**
   - Async HTTP client/server
   - Best for: Concurrent scraping
   - `pip install aiohttp`

### Browser Automation
7. **Playwright** (Python)
   - Full browser automation
   - Best for: JavaScript-heavy sites, anti-detection
   - `pip install playwright`

8. **Selenium**
   - Legacy browser automation
   - Wider browser support
   - `pip install selenium`

9. **Puppeteer (pyppeteer)**
   - Headless Chrome automation
   - `pip install pyppeteer`

### Scraping Frameworks
10. **Scrapy**
    - Enterprise-grade framework
    - Built-in pipelines, middlewares
    - Best for: Large-scale projects
    - `pip install scrapy`

11. **Scrapy-Playwright**
    - Scrapy + Playwright integration
    - Best for: JS-heavy sites at scale
    - `pip install scrapy-playwright`

### Data Extraction
12. **extruct**
    - Structured data extraction (JSON-LD, microdata)
    - `pip install extruct`

13. **newspaper3k**
    - Article extraction
    - `pip install newspaper3k`

14. **trafilatura**
    - Web content extraction
    - `pip install trafilatura`

### Anti-Detection & Utilities
15. **fake-useragent**
    - User-agent rotation
    - `pip install fake-useragent`

16. **cloudscraper**
    - Cloudflare bypass
    - `pip install cloudscraper`

17. **urllib-robotparser**
    - robots.txt parser (built-in)
    - Standard library

18. **tenacity**
    - Retry logic
    - `pip install tenacity`

### Data Processing
19. **pandas**
    - Data analysis/manipulation
    - `pip install pandas`

20. **python-dateutil**
    - Date parsing
    - `pip install python-dateutil`

21. **pydantic**
    - Data validation
    - `pip install pydantic`

## Database Clients

### SQL Databases
22. **psycopg2** / **psycopg3**
    - PostgreSQL (Supabase)
    - `pip install psycopg2-binary`

23. **supabase-py**
    - Official Supabase client
    - `pip install supabase`

24. **SQLAlchemy**
    - ORM for multiple databases
    - `pip install sqlalchemy`

### NoSQL Databases
25. **firebase-admin**
    - Firebase/Firestore
    - `pip install firebase-admin`

26. **pymongo**
    - MongoDB
    - `pip install pymongo`

27. **redis-py**
    - Redis caching
    - `pip install redis`

## Cloud Services

### Scraping Infrastructure
28. **ScrapingBee** (service)
    - Managed headless browsers
    - API-based, handles anti-bot
    - scrapingbee.com

29. **Bright Data (formerly Luminati)**
    - Premium proxy network
    - Residential/datacenter IPs
    - brightdata.com

30. **Oxylabs**
    - Proxy service + scraping APIs
    - oxylabs.io

31. **Apify**
    - Cloud scraping platform
    - Pre-built scrapers
    - apify.com

32. **Zyte (formerly Scrapinghub)**
    - Scrapy Cloud hosting
    - Smart proxy manager
    - zyte.com

### Proxy Services
33. **Crawlera / Zyte Smart Proxy Manager**
    - Auto-rotating proxies
    - Ban handling

34. **ProxyMesh**
    - Rotating proxy service
    - proxymesh.com

35. **IPRoyal**
    - Residential/datacenter proxies
    - iproyal.com

### Captcha Solving
36. **2Captcha** (service)
    - Human captcha solving
    - 2captcha.com

37. **Anti-Captcha**
    - Automated captcha solving
    - anti-captcha.com

## Monitoring & Scheduling

### Task Scheduling
38. **APScheduler**
    - Python job scheduling
    - `pip install apscheduler`

39. **Celery**
    - Distributed task queue
    - `pip install celery`

40. **schedule**
    - Simple cron-like scheduling
    - `pip install schedule`

### Monitoring
41. **Sentry**
    - Error tracking
    - sentry.io

42. **Prometheus + Grafana**
    - Metrics & dashboards
    - prometheus.io

43. **Datadog**
    - Full observability platform
    - datadoghq.com

## Data Storage & Caching

### File Formats
44. **jsonlines**
    - NDJSON format
    - `pip install jsonlines`

45. **pyarrow**
    - Parquet files
    - `pip install pyarrow`

### Caching
46. **diskcache**
    - Persistent caching
    - `pip install diskcache`

47. **redis**
    - In-memory caching
    - `pip install redis`

## Development Tools

### Testing
48. **pytest**
    - Testing framework
    - `pip install pytest`

49. **responses**
    - Mock HTTP requests
    - `pip install responses`

50. **VCR.py**
    - Record/replay HTTP interactions
    - `pip install vcrpy`

### Debugging
51. **ipdb**
    - Interactive debugger
    - `pip install ipdb`

52. **loguru**
    - Advanced logging
    - `pip install loguru`

## Recommended Stack by Use Case

### Quick Scraping (Static Sites)
```python
requests + BeautifulSoup4 + lxml
pandas + supabase-py
fake-useragent
```

### Medium Scraping (Some JS)
```python
httpx + BeautifulSoup4
Playwright (for JS-heavy pages)
supabase-py + redis (caching)
APScheduler (scheduling)
```

### Enterprise Scraping (Large Scale)
```python
Scrapy + Scrapy-Playwright
PostgreSQL/Supabase + Redis
Celery (distributed tasks)
Prometheus + Grafana (monitoring)
Bright Data proxies
```

### Real-Time Monitoring (Your Use Case)
```python
BeautifulSoup4 + requests (lightweight)
Playwright (for JS-rendered content)
Supabase (real-time database)
APScheduler (15-30 min intervals)
Sentry (error tracking)
```

## Installation Command (Full Stack)

```bash
# Core scraping
pip install beautifulsoup4 lxml requests httpx aiohttp

# Browser automation
pip install playwright
playwright install chromium

# Database
pip install supabase firebase-admin psycopg2-binary

# Data processing
pip install pandas python-dateutil pydantic

# Utilities
pip install fake-useragent tenacity python-dotenv

# Scheduling
pip install apscheduler schedule

# Advanced (optional)
pip install scrapy scrapy-playwright
pip install newspaper3k trafilatura extruct
pip install redis diskcache
pip install loguru sentry-sdk
```

## Cost Comparison

| Service | Free Tier | Paid Plans | Best For |
|---------|-----------|------------|----------|
| **Supabase** | 500MB DB, 2GB bandwidth | $25/mo | Database + auth |
| **Bright Data** | None | $500+/mo | Enterprise proxies |
| **ScrapingBee** | 1k requests | $49+/mo | Managed browsers |
| **Apify** | $5 credit | $49+/mo | Cloud scraping |
| **2Captcha** | None | $2.99/1k captchas | Captcha solving |
| **Sentry** | 5k events/mo | $26+/mo | Error tracking |

## Best Practices

1. **Always check robots.txt** before scraping
2. **Respect rate limits** (1-2 req/sec max)
3. **Use caching** to avoid duplicate requests
4. **Rotate user agents** to avoid detection
5. **Handle errors gracefully** with retry logic
6. **Log everything** for debugging
7. **Use proxies** for large-scale scraping
8. **Parse structured data** (JSON-LD, microdata) when available

---

**Last Updated**: November 2025  
**Status**: Production-Ready Recommendations
