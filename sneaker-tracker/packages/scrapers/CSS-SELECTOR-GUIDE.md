# CSS Selector Update Guide

Quick reference for updating scrapers with correct CSS selectors after inspecting live sites.

## How to Find Selectors

### **Method 1: Browser DevTools (F12)**

1. Open target site in Chrome/Edge
2. Press `F12` to open DevTools
3. Click "Elements" tab
4. Click the "Select element" icon (top-left of DevTools)
5. Hover over product card on page
6. DevTools will highlight the HTML element
7. Right-click element → Copy → Copy selector

**Example**:
```
Site: https://www.soleretriever.com/sneaker-release-dates
Element: First sneaker card
Selector: div.grid > div > a > div
```

### **Method 2: Console Search**

1. Open DevTools Console tab
2. Run selector test:
```javascript
// Test selector
document.querySelectorAll('div.ProductCard').length  // Should return number > 0

// Find all product cards
document.querySelectorAll('[data-testid="product-card"]')

// Get first card's text
document.querySelector('.product-item').innerText
```

---

## Selector Patterns by Site

### **Sole Retriever** (`soleretriever_scraper.py`)

**URL**: https://www.soleretriever.com/sneaker-release-dates

**Current (generic)**:
```python
# Line ~170 in soleretriever_scraper.py
product_elems = soup.select('div.ProductCard, .product-card, article.product')
```

**To Find**:
1. Open https://www.soleretriever.com/sneaker-release-dates
2. Inspect first sneaker card
3. Look for container class (likely `div`, `article`, or `a` tag)
4. Common patterns:
   - `div[class*="Product"]` - Class contains "Product"
   - `article.sneaker-card`
   - `a[href*="/sneaker-release-dates/"]` - Links to release pages
   - `div[data-id]` - Has data-id attribute

**Example Update**:
```python
# After inspection, if cards are in <a> tags with class "release-card":
product_elems = soup.select('a.release-card')

# If using data attributes:
product_elems = soup.select('[data-testid="release-item"]')
```

---

### **SoleSavy** (`solesavy_scraper.py`)

**URL**: https://solesavy.com/news

**Current (generic)**:
```python
# Line ~140 in solesavy_scraper.py (news_articles)
article_elems = soup.select('article.post, div.article-card')
```

**To Find**:
1. Open https://solesavy.com/news
2. Inspect news article card
3. Look for WordPress classes (SoleSavy uses WordPress):
   - `article.post`
   - `div.entry-content`
   - `h2.entry-title`
   - `time.entry-date`

**Example Update**:
```python
# WordPress standard pattern:
article_elems = soup.select('article.post-card')
title_elem = article.select_one('h2.entry-title a')
date_elem = article.select_one('time.published')
```

---

### **Foot Locker** (`footlocker_scraper.py`)

**URL**: https://www.footlocker.com/release-dates

**Current (generic)**:
```python
# Line ~200 in footlocker_scraper.py
product_elems = soup.select('div.ProductCard, .product-item, article.product')
```

**To Find**:
1. Open https://www.footlocker.com/release-dates
2. **Note**: Foot Locker uses heavy JavaScript - likely needs Playwright
3. Look for product grid container
4. Common Foot Locker patterns:
   - `div[data-testid="product-container"]`
   - `article.ProductTile`
   - `div.product-grid > div`

**Playwright Method** (if static scraping fails):
```python
# Test with Playwright flag
python footlocker_scraper.py --category jordan --limit 5 --playwright --no-save
```

**Example Update**:
```python
# If using React/data attributes:
product_elems = soup.select('[data-testid="product-tile"]')
title_elem = product.select_one('[data-testid="product-name"]')
price_elem = product.select_one('[data-testid="product-price"]')
```

---

### **Nike SNKRS** (`nike_snkrs_scraper.py`)

**URL**: https://www.nike.com/launch

**Current (generic)**:
```python
# Line ~150 in nike_snkrs_scraper.py
product_elems = soup.select('[data-testid="product-card"], .product-card, article.product')
```

**To Find**:
1. Open https://www.nike.com/launch
2. **Note**: Nike uses React + Next.js with data-testid attributes
3. Inspect launch card
4. Nike patterns:
   - `[data-testid="product-card"]`
   - `[data-testid="product-card-link"]`
   - `div[class*="product-card"]`

**Example Update**:
```python
# Nike uses data-testid extensively:
product_elems = soup.select('[data-testid="product-card"]')
title_elem = product.select_one('[data-testid="product-card-title"]')
price_elem = product.select_one('[data-testid="product-price"]')
date_elem = product.select_one('[data-testid="product-date"]')
image_elem = product.select_one('[data-testid="product-card-image"]')
```

---

## Common Selector Strategies

### **Strategy 1: Parent Container First**
Find the grid/container that holds all products:
```javascript
// In browser console
document.querySelector('.product-grid').children.length  // Should match number of visible products
```

Then select individual cards:
```python
container = soup.select_one('.product-grid')
product_elems = container.select('> div')  # Direct children only
```

### **Strategy 2: Unique Attributes**
Look for data attributes (best for React/Vue apps):
```python
# Best: Specific data-testid
product_elems = soup.select('[data-testid="product-card"]')

# Good: Unique class prefix
product_elems = soup.select('[class^="ProductCard_"]')

# OK: Href pattern
product_elems = soup.select('a[href*="/product/"]')
```

### **Strategy 3: CSS Combinators**
Use specific parent-child relationships:
```python
# Direct child only
soup.select('div.grid > article')

# Descendant (any level)
soup.select('div.container article.product')

# Adjacent sibling
soup.select('h2.title + p.description')
```

---

## Testing Workflow

### **1. Verify URL is Accessible**
```python
import requests
response = requests.get('https://www.soleretriever.com/sneaker-release-dates')
print(response.status_code)  # Should be 200
```

### **2. Check HTML Structure**
```python
from bs4 import BeautifulSoup
soup = BeautifulSoup(response.content, 'lxml')

# Print first 5000 chars to see structure
print(soup.prettify()[:5000])
```

### **3. Test Selector**
```python
# Try different selectors until you find products
products = soup.select('div.ProductCard')
print(f"Found {len(products)} products")

# If 0, try alternatives:
products = soup.select('article')
products = soup.select('[data-testid="product"]')
products = soup.select('a[href*="/sneaker-"]')
```

### **4. Extract Sample Data**
```python
if products:
    first = products[0]
    print("Title:", first.select_one('h2, h3').get_text(strip=True))
    print("Price:", first.select_one('[class*="price"]').get_text(strip=True))
    print("Image:", first.select_one('img')['src'])
```

---

## Quick Update Template

Use this template to update any scraper:

```python
def parse_product(self, product_elem, base_url: str) -> Optional[Dict]:
    """Parse product from HTML element."""
    try:
        # UPDATE THESE SELECTORS after inspecting live site ↓
        
        # Step 1: Find title (REQUIRED)
        title_elem = product_elem.select_one('h2.product-title, h3, [data-testid="title"]')
        if not title_elem:
            return None
        
        # Step 2: Find price (optional)
        price_elem = product_elem.select_one('span.price, [data-testid="price"], .product-price')
        
        # Step 3: Find date (optional)
        date_elem = product_elem.select_one('time, .release-date, [data-testid="date"]')
        
        # Step 4: Find image (optional)
        image_elem = product_elem.select_one('img')
        
        # Step 5: Find link (optional)
        link_elem = product_elem.select_one('a, [data-testid="product-link"]')
        
        # Extract text/attributes
        title = title_elem.get_text(strip=True)
        price = price_elem.get_text(strip=True) if price_elem else None
        release_date = date_elem.get_text(strip=True) if date_elem else None
        image_url = image_elem.get('src') or image_elem.get('data-src') if image_elem else None
        product_url = link_elem.get('href') if link_elem else None
        
        # Build product dict
        return {
            'name': title,
            'price': price,
            'release_date': release_date,
            'image_url': image_url,
            'product_url': product_url
        }
        
    except Exception as e:
        logger.error(f"Error parsing: {e}")
        return None
```

---

## Debugging Tips

### **Problem: Found 0 products**

**Check**:
1. Is page JavaScript-rendered? → Use Playwright
2. Is selector case-sensitive? → Try lowercase
3. Are products lazy-loaded? → Scroll page first
4. Is page behind authentication? → May need login

**Solution**:
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Print page source
print(soup.prettify()[:10000])  # First 10K chars

# Try broad selector
all_divs = soup.select('div')
print(f"Total divs: {len(all_divs)}")
```

### **Problem: Extracting wrong data**

**Check**:
1. Multiple elements match selector → Use `select_one()` or `[:1]`
2. Text includes extra whitespace → Use `.get_text(strip=True)`
3. Attribute has wrong name → Check `elem.attrs` dict

**Solution**:
```python
# See all attributes
print(price_elem.attrs)  # {'class': ['price', 'sale'], 'data-value': '129.99'}

# Get specific attribute
price = price_elem.get('data-value') or price_elem.get_text(strip=True)
```

---

## Example: Complete Selector Update

**Scenario**: Update Sole Retriever scraper

**Step 1: Inspect Live Site**
```
URL: https://www.soleretriever.com/sneaker-release-dates
Observation: Products are in <a> tags with class "css-1234abc ProductCard"
```

**Step 2: Test Selector in Console**
```javascript
document.querySelectorAll('a[class*="ProductCard"]').length
// Returns: 40 ✅
```

**Step 3: Update Python Code**
```python
# File: soleretriever_scraper.py
# Line ~170

# OLD:
product_elems = soup.select('div.ProductCard, .product-card, article.product')

# NEW:
product_elems = soup.select('a[class*="ProductCard"]')
```

**Step 4: Update Child Selectors**
```python
# Line ~180-190

# OLD:
title_elem = product_elem.select_one('h3.product-title')
price_elem = product_elem.select_one('span.price')

# NEW (after inspection):
title_elem = product_elem.select_one('h2[class*="Title"]')
price_elem = product_elem.select_one('span[class*="Price"]')
```

**Step 5: Test**
```bash
python soleretriever_scraper.py --collection jordan --limit 5 --no-save
# Output should show: "Found 40 products", "Products scraped: 5"
```

---

## Next Steps After Selector Updates

1. **Test each scraper individually**:
   ```bash
   python soleretriever_scraper.py --collection jordan --limit 3 --no-save
   python solesavy_scraper.py --mode news --limit 3 --no-save
   python footlocker_scraper.py --category jordan --limit 3 --no-save
   python nike_snkrs_scraper.py --mode upcoming --limit 3 --no-save
   ```

2. **Verify data quality**:
   - Check that product names make sense
   - Prices are in correct format
   - Dates are parseable
   - Images load correctly

3. **Test with Supabase save**:
   ```bash
   # Remove --no-save flag
   python soleretriever_scraper.py --collection jordan --limit 5
   
   # Verify in Supabase
   psql -h localhost -p 5432 -U postgres -d postgres
   SELECT * FROM soleretriever_data LIMIT 5;
   ```

4. **Enable scheduler**:
   ```bash
   python realtime_scheduler.py --mode realtime
   # Monitor logs for successful scrapes
   ```

---

**Ready to update selectors!** Use browser DevTools to inspect each site and update the scrapers.
