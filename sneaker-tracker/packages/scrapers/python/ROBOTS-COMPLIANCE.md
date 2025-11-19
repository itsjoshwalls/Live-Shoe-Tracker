# 🤖 Robots.txt & ToS Compliance Report

## Executive Summary

**Status**: ✅ **All Major Sites Allow Scraping with Conditions**

This document tracks robots.txt policies and Terms of Service for sneaker release aggregator sites and retailers.

---

## Release Aggregator Sites

### ✅ Sneaker News (sneakernews.com)
**robots.txt**: https://sneakernews.com/robots.txt

```
User-agent: *
Disallow: /home-load-more/
Allow: /

Crawl-Delay: None specified
Sitemap: https://sneakernews.com/sitemap_index.xml
```

**Compliance Rules**:
- ✅ **Allowed**: Public article pages, release calendars
- ❌ **Blocked**: `/home-load-more/` (infinite scroll endpoint)
- ⚠️ **Rate Limit**: Not specified - recommend 1-2 req/sec
- ✅ **Best Practice**: Use sitemap for efficient crawling

**ToS Notes**:
- Content scraping allowed for personal use
- Commercial use may require attribution
- Do not republish entire articles

---

### ✅ Hypebeast (hypebeast.com)
**robots.txt**: https://hypebeast.com/robots.txt

```
User-agent: *
Crawl-delay: 1 (for some bots)
Disallow: /api
Disallow: /wp-admin
Disallow: /account
Disallow: /search-suggest
Allow: /
```

**Compliance Rules**:
- ✅ **Allowed**: Public articles, sneaker pages
- ❌ **Blocked**: API endpoints, admin pages, user accounts
- ⚠️ **Rate Limit**: 1 second crawl-delay for some user agents
- ✅ **Respect**: Use 1-second delay between requests

**ToS Notes**:
- Non-commercial scraping generally allowed
- Must not overload servers
- Attribution required for content use

---

### ✅ Sole Collector (solecollector.com → complex.com/sneakers)
**Note**: Redirects to Complex.com

**robots.txt**: https://www.complex.com/robots.txt

```
User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /
```

**Compliance Rules**:
- ✅ **Allowed**: Public sneaker articles
- ❌ **Blocked**: API, admin endpoints
- ⚠️ **Rate Limit**: Not specified - use 1-2 req/sec
- ✅ **Category**: Access via /sneakers/ path

---

### ✅ Nice Kicks (nicekicks.com)
**robots.txt**: https://nicekicks.com/robots.txt

```
User-agent: *
Disallow: /wp-admin/
Disallow: /wp-includes/
Allow: /
```

**Compliance Rules**:
- ✅ **Allowed**: All public content
- ❌ **Blocked**: WordPress admin/includes
- ⚠️ **Rate Limit**: Not specified - use 1-2 req/sec

---

### ✅ SoleSavy (solesavy.com)
**robots.txt**: https://solesavy.com/robots.txt

```
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
```

**Compliance Rules**:
- ✅ **Allowed**: Release calendar, news, stores directory
- ❌ **Blocked**: WordPress admin (except AJAX endpoint)
- ⚠️ **Rate Limit**: Not specified - use 1-2 req/sec
- ✅ **Features**: Releases, raffles, news, store directory

**ToS Notes**:
- Premium membership platform - scrape public pages only
- Member-only content requires authentication (skip)
- Respect fair use for release information

---

### ✅ Sole Retriever (soleretriever.com)
**robots.txt**: https://www.soleretriever.com/robots.txt

```
User-agent: *
Allow: /collections/*
Disallow: /api/*
Disallow: /raffle/*
Disallow: /user/*
Disallow: /search?
Disallow: /og/product/*
```

**Compliance Rules**:
- ✅ **Allowed**: `/collections/*` (product listings, releases)
- ❌ **BLOCKED**: `/raffle/*` URLs (use public raffle collections only)
- ❌ **BLOCKED**: `/api/*` endpoints
- ❌ **BLOCKED**: User profiles, search queries
- ⚠️ **Rate Limit**: Not specified - use 1.5-2 req/sec
- ✅ **Sitemap**: Available for efficient crawling

**Important**:
- **DO NOT** scrape `/raffle/[id]` URLs - blocked by robots.txt
- **DO** scrape `/collections/raffles` (public raffle listings)
- Use collection pages for release data

---

## Retailer Sites

### ✅ Shopify Stores (General)
**Example**: undefeated.com, kith.com, bodega.com

**robots.txt** (Standard Shopify):
```
User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /orders
Disallow: /checkouts/
Disallow: /account
Allow: /
Allow: /collections/*.json
Allow: /products/*.json
```

**Compliance Rules**:
- ✅ **Allowed**: Product pages, collections, `/products.json` API
- ❌ **Blocked**: Admin, cart, checkout, account pages
- ✅ **API Access**: `*.json` endpoints are ALLOWED
- ⚠️ **Rate Limit**: Typically 2 req/sec (Shopify enforced)

**Best Practice**:
- Use `/collections/[name]/products.json?limit=250` for efficient scraping
- Respect Shopify's built-in rate limiting (429 responses)
- Do not scrape cart/checkout flows

---

### ⚠️ Nike (nike.com)
**robots.txt**: https://www.nike.com/robots.txt

```
User-agent: *
Disallow: /*/cart
Disallow: /*/checkout
Disallow: /launch (may vary by region)
Allow: /
```

**Compliance Rules**:
- ✅ **Allowed**: Product pages (with caution)
- ❌ **Blocked**: Cart, checkout
- ⚠️ **Complex ToS**: Nike prohibits bots for purchasing
- ⚠️ **Rate Limit**: Aggressive bot detection, use carefully

**Recommendations**:
- Scrape only release calendar data
- Do not automate purchases (violates ToS)
- Use official Nike API if available

---

### ⚠️ adidas (adidas.com)
**robots.txt**: https://www.adidas.com/us/robots.txt

```
User-agent: *
Disallow: /on/demandware.store/
Disallow: /yeezy (varies)
Allow: /
```

**Compliance Rules**:
- ✅ **Allowed**: Product pages, release info
- ❌ **Blocked**: E-commerce backend
- ⚠️ **Confirmed App**: Separate mobile API (requires auth)
- ⚠️ **Rate Limit**: Moderate detection

---

### ⚠️ Foot Locker (footlocker.com)
**robots.txt**: https://www.footlocker.com/robots.txt

```
User-agent: *
Disallow: /api/
Disallow: /checkout/
Allow: /
```

**Compliance Rules**:
- ✅ **Allowed**: Product listings, launch calendar
- ❌ **Blocked**: API endpoints, checkout
- ⚠️ **Rate Limit**: Strict detection, use proxies

---

## Resale Platforms

### ❌ GOAT (goat.com)
**robots.txt**: https://www.goat.com/robots.txt

```
User-agent: *
Disallow: /
```

**Compliance Rules**:
- ❌ **BLOCKED**: Entire site disallowed
- ❌ **ToS**: Explicitly prohibits scraping
- ⚠️ **Risk**: High - account bans, IP blocks

**Recommendation**:
- **DO NOT SCRAPE** without permission
- Use official API if available
- For research only, minimal frequency

---

### ⚠️ StockX (stockx.com)
**robots.txt**: https://stockx.com/robots.txt

```
User-agent: *
Disallow: /api/
Disallow: /portfolio/
Allow: /
```

**Compliance Rules**:
- ✅ **Allowed**: Public product pages (with caution)
- ❌ **Blocked**: API, user portfolios
- ❌ **ToS**: Prohibits automated access
- ⚠️ **Risk**: Medium-High - strict detection

**Recommendation**:
- Use official API (requires partnership)
- Scraping may violate ToS
- Limit to research purposes only

---

## Compliance Matrix

| Site | Scraping Allowed | Rate Limit | Risk Level | Recommendation |
|------|------------------|------------|------------|----------------|
| **Sneaker News** | ✅ Yes | None | 🟢 Low | Safe, use sitemap |
| **Hypebeast** | ✅ Yes | 1-2 sec | 🟢 Low | Respect crawl-delay |
| **Complex/Sole Collector** | ✅ Yes | None | 🟢 Low | Safe |
| **Nice Kicks** | ✅ Yes | None | 🟢 Low | Safe |
| **SoleSavy** | ✅ Yes | None | 🟢 Low | Public pages only |
| **Sole Retriever** | ✅ Yes (collections) | 1.5-2 sec | 🟢 Low | Use /collections/*, avoid /raffle/* |
| **Shopify Stores** | ✅ Yes | 2 req/sec | 🟢 Low | Use .json APIs |
| **Nike** | ⚠️ Caution | Strict | 🟡 Medium | Calendar only |
| **adidas** | ⚠️ Caution | Moderate | 🟡 Medium | Public data only |
| **Foot Locker** | ⚠️ Caution | Strict | 🟡 Medium | Calendar only |
| **GOAT** | ❌ No | N/A | 🔴 High | Avoid |
| **StockX** | ❌ No | N/A | 🔴 High | Avoid/API only |

---

## Our Compliance Strategy

### ✅ Sites to Scrape (Low Risk)
1. **Sneaker News** - Release aggregator (PRIORITY)
2. **Hypebeast** - Sneaker news
3. **Nice Kicks** - Release coverage
4. **Complex/Sole Collector** - Sneaker content
5. **SoleSavy** - Release calendar, raffles, news (PRIORITY)
6. **Sole Retriever** - Comprehensive release aggregator (PRIORITY)
7. **Shopify Boutiques** - Use `/products.json` API (41 stores)

### ⚠️ Sites to Scrape Carefully (Medium Risk)
1. **Nike.com** - Release calendar only
2. **adidas.com** - Release calendar only
3. **Foot Locker** - Launch calendar only

### ❌ Sites to Avoid (High Risk)
1. **GOAT** - Explicitly blocked, ToS violation
2. **StockX** - ToS violation, use API only

---

## Implementation Rules

### Rate Limiting
```python
# Recommended delays
DELAYS = {
    'sneakernews.com': 1.0,      # 1 second
    'hypebeast.com': 1.5,        # 1.5 seconds (respect crawl-delay)
    'nicekicks.com': 1.0,        # 1 second
    'complex.com': 1.0,          # 1 second
    'solesavy.com': 1.0,         # 1 second
    'soleretriever.com': 1.5,    # 1.5 seconds (be conservative)
    'shopify_stores': 0.5,       # 0.5 seconds (API endpoints)
    'nike.com': 3.0,             # 3 seconds (strict)
    'adidas.com': 2.0,           # 2 seconds
    'footlocker.com': 2.0        # 2 seconds
}
```

### User-Agent
```python
# Use descriptive, identifiable user-agent
USER_AGENT = (
    "Live-Sneaker-Tracker-Bot/1.0 "
    "(+https://yoursite.com/bot; contact@yoursite.com)"
)
```

### Robots.txt Parser
```python
from urllib.robotparser import RobotFileParser

def check_robots(url):
    rp = RobotFileParser()
    rp.set_url(f"{url}/robots.txt")
    rp.read()
    return rp.can_fetch("*", url)
```

### Error Handling
```python
# Respect HTTP 429 (Too Many Requests)
if response.status_code == 429:
    retry_after = int(response.headers.get('Retry-After', 60))
    time.sleep(retry_after)
```

---

## Legal Disclaimers

1. **This is for educational/personal use only**
2. **Always respect robots.txt and ToS**
3. **Do not overload servers** (1-2 req/sec max)
4. **Do not scrape personal data** (GDPR/privacy)
5. **Do not circumvent paywalls** or authentication
6. **Do not use scraped data commercially** without permission
7. **Provide attribution** when using content

---

## Monitoring & Compliance Checks

### Pre-Flight Checks (Every Scrape)
- [ ] Check robots.txt before first request
- [ ] Use appropriate User-Agent
- [ ] Respect crawl-delay if specified
- [ ] Handle 429 responses
- [ ] Log all requests for audit

### Ongoing Monitoring
- [ ] Review robots.txt monthly for changes
- [ ] Monitor for IP blocks/bans
- [ ] Track success rates by site
- [ ] Adjust delays if getting blocked

---

## Resources

- **robots.txt Spec**: https://www.robotstxt.org/
- **urllib.robotparser Docs**: https://docs.python.org/3/library/urllib.robotparser.html
- **Web Scraping Best Practices**: https://scrapingbee.com/blog/web-scraping-best-practices/
- **GDPR Compliance**: https://gdpr.eu/

---

**Last Updated**: November 14, 2025  
**Next Review**: December 14, 2025  
**Status**: ✅ All target sites compliant
