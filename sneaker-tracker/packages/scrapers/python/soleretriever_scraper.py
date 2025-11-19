"""
Sole Retriever Scraper - Hybrid BeautifulSoup + Playwright

Sole Retriever is a comprehensive sneaker release aggregator and raffle tracker.
Uses BeautifulSoup for product listings and Playwright for raffle/countdown pages.

robots.txt: https://www.soleretriever.com/robots.txt
Status: ✅ Allowed (allows /collections/*, blocks /api/*, /raffle/*, user profiles)

Features:
- Release calendar (upcoming releases with dates)
- Raffle tracker (BLOCKED by robots.txt - use API if available)
- Product collections (by brand, type)
- Store/retailer directory
- Price tracking (retail vs. resale)
- Hybrid scraping (BeautifulSoup + Playwright)

Important: robots.txt blocks /raffle/* - we'll scrape public collection pages only.

Usage:
    python soleretriever_scraper.py --mode releases --limit 100
    python soleretriever_scraper.py --mode collections --collection nike
    python soleretriever_scraper.py --mode all
"""

import os
import sys
import time
import json
import logging
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse, parse_qs
from urllib.robotparser import RobotFileParser

import psycopg2
from psycopg2.extras import RealDictCursor

import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dateutil import parser as date_parser
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Playwright imports (optional)
try:
    from playwright.async_api import async_playwright, Page, Browser
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SoleRetrieverScraper:
    """Hybrid scraper for Sole Retriever platform."""
    
    BASE_URL = "https://www.soleretriever.com"
    USER_AGENT = "Live-Sneaker-Tracker-Bot/1.0 (+https://github.com/yourusername/live-shoe-tracker)"
    
    # Collections (allowed by robots.txt)
    COLLECTIONS = {
        'all': '/sneaker-release-dates',
        'nike': '/sneaker-release-dates/nike',
        'jordan': '/sneaker-release-dates/jordan',
        'adidas': '/sneaker-release-dates/adidas',
        'yeezy': '/sneaker-release-dates/adidas/yeezy',
        'new-balance': '/sneaker-release-dates/new-balance',
        'upcoming': '/sneaker-release-dates',  # Main release calendar
        'raffles': '/sneaker-release-dates',  # Raffles integrated into release pages
    }
    
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """Initialize scraper."""
        # Supabase client
        self.supabase: Client = create_client(
            supabase_url or os.getenv('SUPABASE_URL'),
            supabase_key or os.getenv('SUPABASE_KEY')
        )
        
        # HTTP session
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        })
        
        # robots.txt checker
        self.robot_parser = RobotFileParser()
        self.robot_parser.set_url(f"{self.BASE_URL}/robots.txt")
        try:
            self.robot_parser.read()
            logger.info("Loaded robots.txt - Note: /raffle/* and /api/* are blocked")
        except Exception as e:
            logger.warning(f"Could not load robots.txt: {e}")
        
        # Stats
        self.stats = {
            'releases_scraped': 0,
            'products_scraped': 0,
            'errors': 0,
            'blocked_by_robots': 0,
            'pages_scraped': 0
        }
    
    def can_fetch(self, url: str) -> bool:
        """Check if URL can be fetched per robots.txt."""
        can_fetch = self.robot_parser.can_fetch(self.USER_AGENT, url)
        
        # Extra check for blocked patterns
        if '/raffle/' in url or '/api/' in url or '/user/' in url:
            logger.debug(f"URL blocked by robots.txt pattern: {url}")
            return False
        
        return can_fetch
    
    def fetch_page(self, url: str, retry_count: int = 3) -> Optional[BeautifulSoup]:
        """Fetch page with BeautifulSoup."""
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        time.sleep(1.5)  # Rate limiting (be conservative)
        
        for attempt in range(retry_count):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                self.stats['pages_scraped'] += 1
                return BeautifulSoup(response.content, 'lxml')
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    retry_after = int(e.response.headers.get('Retry-After', 60))
                    logger.warning(f"Rate limited. Waiting {retry_after}s...")
                    time.sleep(retry_after)
                    continue
                elif e.response.status_code == 404:
                    logger.warning(f"Page not found: {url}")
                    return None
                else:
                    logger.error(f"HTTP error {e.response.status_code}: {url}")
                    if attempt == retry_count - 1:
                        self.stats['errors'] += 1
                    return None
            except Exception as e:
                logger.error(f"Error fetching {url}: {e}")
                if attempt < retry_count - 1:
                    time.sleep(2 ** attempt)
                else:
                    self.stats['errors'] += 1
                    return None
        
        return None
    
    async def fetch_page_playwright(self, url: str, page: Page) -> Optional[str]:
        """Fetch page with Playwright (for infinite scroll, dynamic loading)."""
        if not PLAYWRIGHT_AVAILABLE:
            logger.error("Playwright not available")
            return None
        
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        try:
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Scroll to load more products (if infinite scroll)
            for _ in range(3):
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await page.wait_for_timeout(1000)
            
            self.stats['pages_scraped'] += 1
            return await page.content()
        except Exception as e:
            logger.error(f"Playwright error for {url}: {e}")
            self.stats['errors'] += 1
            return None
    
    def parse_product_card(self, card: Any) -> Optional[Dict]:
        """Parse individual product card."""
        try:
            # Handle both link-based and card-based structures
            if card.name == 'a':
                # Link-based structure (current Sole Retriever)
                link = urljoin(self.BASE_URL, card.get('href', ''))
                
                # Title might be in nested element or link text
                title_elem = card.find(['h2', 'h3', 'span', 'div'])
                title = title_elem.get_text(strip=True) if title_elem else card.get_text(strip=True)
                
                # Look in parent for additional data
                parent = card.parent
                img_elem = parent.find('img') if parent else None
                date_elem = parent.find('time') if parent else None
                price_elem = parent.find(class_=lambda x: x and 'price' in str(x).lower()) if parent else None
                
            else:
                # Card-based structure
                title_elem = card.select_one('h2, h3, .product-title, .title, a.product-link')
                title = title_elem.get_text(strip=True) if title_elem else None
                
                # Link
                link_elem = card.select_one('a[href]')
                link = urljoin(self.BASE_URL, link_elem['href']) if link_elem else None
                
                img_elem = card.select_one('img')
                date_elem = card.select_one('.release-date, .date, time, .countdown')
                price_elem = card.select_one('.price, .retail-price, .cost')
            
            # Title
            if not title:
                return None
            
            # Image
            img_elem = card.select_one('img')
            image_url = None
            if img_elem:
                image_url = img_elem.get('src') or img_elem.get('data-src') or img_elem.get('data-lazy-src')
                if image_url:
                    # Handle relative URLs
                    if not image_url.startswith('http'):
                        image_url = urljoin(self.BASE_URL, image_url)
            
            # Release date
            date_elem = card.select_one('.release-date, .date, time, .countdown')
            release_date = None
            if date_elem:
                date_str = date_elem.get('datetime') or date_elem.get('data-date') or date_elem.get_text(strip=True)
                try:
                    release_date = date_parser.parse(date_str).isoformat()
                except:
                    # Store raw string if parse fails
                    release_date = date_str
            
            # Price
            price_elem = card.select_one('.price, .retail-price, .cost')
            price = price_elem.get_text(strip=True) if price_elem else None
            
            # Brand
            brand_elem = card.select_one('.brand, .manufacturer')
            brand = brand_elem.get_text(strip=True) if brand_elem else None
            # Try to infer from title
            if not brand and title:
                title_lower = title.lower()
                if 'jordan' in title_lower:
                    brand = 'Jordan'
                elif 'nike' in title_lower:
                    brand = 'Nike'
                elif 'adidas' in title_lower or 'yeezy' in title_lower:
                    brand = 'adidas'
                elif 'new balance' in title_lower:
                    brand = 'New Balance'
            
            # SKU/Style code
            sku_elem = card.select_one('.sku, .style-code, .product-code')
            sku = sku_elem.get_text(strip=True) if sku_elem else None
            
            # Status
            status_elem = card.select_one('.status, .availability, .badge')
            status = status_elem.get_text(strip=True).lower() if status_elem else 'upcoming'
            
            # Raffle info
            raffle_elem = card.select_one('.raffle-badge, .raffle-info')
            has_raffle = raffle_elem is not None
            
            if title and link:
                # Return in format matching soleretriever_data table schema
                return {
                    # Don't include 'id' - PostgreSQL will auto-generate UUID
                    'title': title[:500] if title else '',  # Prevent too-long titles
                    'url': link,
                    'image_url': image_url,
                    'release_date': release_date,
                    'price': price,
                    'brand': brand,
                    'sku': sku,
                    'status': status,
                    'has_raffle': has_raffle,
                    'source': 'soleretriever'
                    # scraped_at, created_at, updated_at auto-populated by DB
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error parsing product card: {e}")
            self.stats['errors'] += 1
            return None
    
    def scrape_collection(self, collection: str = 'all', limit: int = 100) -> List[Dict]:
        """Scrape products from a collection (BeautifulSoup)."""
        collection_path = self.COLLECTIONS.get(collection, self.COLLECTIONS['all'])
        url = f"{self.BASE_URL}{collection_path}"
        
        logger.info(f"Scraping collection: {collection} ({url})")
        
        products = []
        page_num = 1
        max_pages = 5  # Limit to avoid excessive requests
        
        while len(products) < limit and page_num <= max_pages:
            # Pagination (check if site uses ?page= or /page/)
            page_url = f"{url}?page={page_num}" if page_num > 1 else url
            
            soup = self.fetch_page(page_url)
            if not soup:
                break
            
            # Find product cards/links - Sole Retriever uses link-based structure
            # Live site has 153 links like <a href="/sneaker-release-dates/jordan/...">
            # Filter out collection index pages (URLs should have at least 3 slashes for specific products)
            product_cards = soup.find_all('a', href=lambda x: 
                x and x.startswith('/sneaker-release-dates/') and 
                x != '/sneaker-release-dates' and
                x.count('/') >= 3)  # e.g., /sneaker-release-dates/jordan/air-jordan-1/...
            
            # Fallback to traditional selectors
            if not product_cards:
                product_cards = soup.select('div.product-card, div.product-item, article.product, div.grid-item')
            
            if not product_cards:
                logger.info(f"No products found on page {page_num}")
                break
            
            logger.info(f"Page {page_num}: Found {len(product_cards)} product cards")
            
            for card in product_cards:
                if len(products) >= limit:
                    break
                
                product = self.parse_product_card(card)
                if product:
                    products.append(product)
                    self.stats['products_scraped'] += 1
            
            # Check if there's a next page
            next_link = soup.select_one('a.next, a[rel="next"], .pagination-next')
            if not next_link:
                break
            
            page_num += 1
        
        logger.info(f"Scraped {len(products)} products from {collection} collection")
        return products
    
    async def scrape_collection_playwright(self, collection: str = 'all', limit: int = 100) -> List[Dict]:
        """Scrape collection with Playwright (for infinite scroll)."""
        if not PLAYWRIGHT_AVAILABLE:
            logger.warning("Playwright not available. Using BeautifulSoup fallback.")
            return self.scrape_collection(collection=collection, limit=limit)
        
        collection_path = self.COLLECTIONS.get(collection, self.COLLECTIONS['all'])
        url = f"{self.BASE_URL}{collection_path}"
        
        logger.info(f"Scraping collection with Playwright: {collection}")
        
        products = []
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            html = await self.fetch_page_playwright(url, page)
            if not html:
                await browser.close()
                return []
            
            soup = BeautifulSoup(html, 'lxml')
            
            # Parse products
            product_cards = soup.select('div.product-card, div.product-item, article.product, div.grid-item')[:limit]
            
            logger.info(f"Found {len(product_cards)} product cards (Playwright)")
            
            for card in product_cards:
                product = self.parse_product_card(card)
                if product:
                    products.append(product)
                    self.stats['products_scraped'] += 1
            
            await browser.close()
        
        return products
    
    def save_to_postgres_direct(self, items: List[Dict], table_name: str = 'soleretriever_data') -> int:
        """Save items directly to PostgreSQL (bypass PostgREST)."""
        saved_count = 0
        
        # Get connection info from environment
        db_host = os.getenv('POSTGRES_HOST', 'localhost')
        db_port = os.getenv('POSTGRES_PORT', '5432')
        db_name = os.getenv('POSTGRES_DB', 'postgres')
        db_user = os.getenv('POSTGRES_USER', 'postgres')
        db_password = os.getenv('POSTGRES_PASSWORD', 'your-super-secret-postgres-password')
        
        try:
            conn = psycopg2.connect(
                host=db_host,
                port=db_port,
                database=db_name,
                user=db_user,
                password=db_password
            )
            cursor = conn.cursor()
            
            for item in items:
                try:
                    # Upsert query (INSERT ... ON CONFLICT DO UPDATE)
                    query = """
                        INSERT INTO {table} (
                            title, url, image_url, release_date, price, brand, sku, 
                            status, has_raffle, source
                        ) VALUES (
                            %(title)s, %(url)s, %(image_url)s, %(release_date)s, %(price)s, 
                            %(brand)s, %(sku)s, %(status)s, %(has_raffle)s, %(source)s
                        )
                        ON CONFLICT (url) DO UPDATE SET
                            title = EXCLUDED.title,
                            image_url = EXCLUDED.image_url,
                            release_date = EXCLUDED.release_date,
                            price = EXCLUDED.price,
                            brand = EXCLUDED.brand,
                            sku = EXCLUDED.sku,
                            status = EXCLUDED.status,
                            has_raffle = EXCLUDED.has_raffle,
                            updated_at = NOW()
                        RETURNING id;
                    """.format(table=table_name)
                    
                    cursor.execute(query, item)
                    saved_count += 1
                    logger.debug(f"Saved: {item.get('title', '')[:50]}")
                    
                except Exception as e:
                    logger.error(f"Error saving item: {e}")
                    logger.error(f"Item: {json.dumps(item, indent=2, default=str)}")
                    self.stats['errors'] += 1
                    conn.rollback()
                    continue
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            self.stats['errors'] += len(items)
        
        return saved_count
    
    def save_to_supabase(self, items: List[Dict], table_name: str = 'soleretriever_data') -> int:
        """Save items to Supabase (fallback to direct PostgreSQL if JWT fails)."""
        saved_count = 0
        
        for item in items:
            try:
                result = self.supabase.table(table_name).upsert(
                    item,
                    on_conflict='url'
                ).execute()
                
                if result.data:
                    saved_count += 1
                    logger.debug(f"Saved: {item.get('title', '')[:50]}")
                else:
                    logger.error(f"Supabase returned no data for item: {item.get('title', '')[:50]}")
                    logger.error(f"Full item data: {json.dumps(item, indent=2, default=str)}")
                    self.stats['errors'] += 1
                    
            except Exception as e:
                error_msg = str(e)
                # If JWT error, fall back to direct PostgreSQL
                if 'JWT' in error_msg or 'JWS' in error_msg or '401' in error_msg:
                    logger.warning("JWT authentication failed, falling back to direct PostgreSQL")
                    return self.save_to_postgres_direct(items, table_name)
                
                logger.error(f"Error saving to Supabase: {e}")
                logger.error(f"Item that failed: {json.dumps(item, indent=2, default=str)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                self.stats['errors'] += 1
        
        return saved_count
    
    async def run_async(self, mode: str = 'releases', collection: str = 'all', 
                       limit: int = 100, save: bool = True, use_playwright: bool = False) -> Dict[str, Any]:
        """Run scraper asynchronously."""
        start_time = time.time()
        logger.info(f"Starting Sole Retriever scraper (mode={mode}, collection={collection}, limit={limit})")
        
        all_items = []
        
        # Scrape based on mode
        if mode == 'releases':
            if use_playwright and PLAYWRIGHT_AVAILABLE:
                products = await self.scrape_collection_playwright('upcoming', limit=limit)
            else:
                products = self.scrape_collection('upcoming', limit=limit)
            all_items.extend(products)
            
        elif mode == 'collection':
            if use_playwright and PLAYWRIGHT_AVAILABLE:
                products = await self.scrape_collection_playwright(collection, limit=limit)
            else:
                products = self.scrape_collection(collection, limit=limit)
            all_items.extend(products)
            
        elif mode == 'all':
            # Scrape multiple collections
            for coll in ['upcoming', 'nike', 'jordan', 'adidas']:
                logger.info(f"Scraping {coll} collection...")
                if use_playwright and PLAYWRIGHT_AVAILABLE:
                    products = await self.scrape_collection_playwright(coll, limit=limit // 4)
                else:
                    products = self.scrape_collection(coll, limit=limit // 4)
                all_items.extend(products)
        
        # Save to Supabase
        if save and all_items:
            saved = self.save_to_supabase(all_items)
            logger.info(f"Saved {saved}/{len(all_items)} items to Supabase")
        
        # Finalize stats
        elapsed = time.time() - start_time
        self.stats['total_items'] = len(all_items)
        self.stats['elapsed_seconds'] = round(elapsed, 2)
        self.stats['items_per_second'] = round(len(all_items) / elapsed, 2) if elapsed > 0 else 0
        
        logger.info(f"Scraping complete: {json.dumps(self.stats, indent=2)}")
        return self.stats
    
    def run(self, mode: str = 'releases', collection: str = 'all', 
            limit: int = 100, save: bool = True, use_playwright: bool = False) -> Dict[str, Any]:
        """Run scraper synchronously."""
        return asyncio.run(self.run_async(
            mode=mode, 
            collection=collection, 
            limit=limit, 
            save=save, 
            use_playwright=use_playwright
        ))


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Sole Retriever scraper (hybrid BeautifulSoup + Playwright)')
    parser.add_argument(
        '--mode',
        choices=['releases', 'collection', 'all'],
        default='releases',
        help='What to scrape'
    )
    parser.add_argument(
        '--collection',
        choices=list(SoleRetrieverScraper.COLLECTIONS.keys()),
        default='all',
        help='Which collection to scrape (for collection mode)'
    )
    parser.add_argument('--limit', type=int, default=100, help='Max items to scrape')
    parser.add_argument('--playwright', action='store_true', help='Use Playwright (slower but handles JS)')
    parser.add_argument('--no-save', action='store_true', help='Dry run (don\'t save to DB)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate environment
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_KEY'):
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_KEY")
        sys.exit(1)
    
    # Run scraper
    scraper = SoleRetrieverScraper()
    stats = scraper.run(
        mode=args.mode, 
        collection=args.collection, 
        limit=args.limit, 
        save=not args.no_save,
        use_playwright=args.playwright
    )
    
    print(f"\n{'='*60}\nSTATS\n{'='*60}")
    print(json.dumps(stats, indent=2))


if __name__ == '__main__':
    main()
