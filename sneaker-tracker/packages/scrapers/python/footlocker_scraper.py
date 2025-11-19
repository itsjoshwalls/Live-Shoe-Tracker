"""
Foot Locker Release Calendar Scraper

Scrapes upcoming sneaker releases from Foot Locker's release calendar.
Uses BeautifulSoup for static content and Playwright for dynamic JavaScript-loaded content.

Features:
- Scrapes release dates, product names, prices, images
- Respects robots.txt and implements rate limiting
- Saves to Supabase with deduplication
- Supports multiple product categories (Jordan, Nike, adidas, etc.)

Usage:
    # Scrape Jordan releases
    python footlocker_scraper.py --category jordan --limit 10

    # Scrape all upcoming releases
    python footlocker_scraper.py --category all --limit 50

    # Test mode (don't save to database)
    python footlocker_scraper.py --category nike --limit 5 --no-save
"""

import os
import sys
import time
import logging
import argparse
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import Playwright (optional for dynamic content)
try:
    from playwright.sync_api import sync_playwright, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Warning: Playwright not available. Install with: pip install playwright && playwright install")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FootLockerScraper:
    """Scraper for Foot Locker release calendar."""
    
    BASE_URL = 'https://www.footlocker.com'
    USER_AGENT = 'Live-Sneaker-Tracker-Bot/1.0 (+https://github.com/yourusername/live-shoe-tracker)'
    
    # Foot Locker release calendar paths
    CATEGORIES = {
        'all': '/release-dates',
        'jordan': '/release-dates/jordan',
        'nike': '/release-dates/nike',
        'adidas': '/release-dates/adidas',
        'new-balance': '/release-dates/new-balance',
        'upcoming': '/release-dates/upcoming',
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
            logger.info("Loaded robots.txt")
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
        return self.robot_parser.can_fetch(self.USER_AGENT, url)
    
    def fetch_page(self, url: str, retry_count: int = 3) -> Optional[BeautifulSoup]:
        """Fetch page with BeautifulSoup."""
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        time.sleep(2.0)  # Conservative rate limiting for retailer sites
        
        for attempt in range(retry_count):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                self.stats['pages_scraped'] += 1
                return BeautifulSoup(response.content, 'lxml')
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    retry_after = int(e.response.headers.get('Retry-After', 120))
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
        """Fetch page with Playwright for dynamic content."""
        if not PLAYWRIGHT_AVAILABLE:
            logger.error("Playwright not available")
            return None
        
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        try:
            await page.goto(url, wait_until='networkidle', timeout=45000)
            await page.wait_for_timeout(3000)  # Wait for lazy-loaded products
            return await page.content()
        except Exception as e:
            logger.error(f"Playwright error for {url}: {e}")
            self.stats['errors'] += 1
            return None
    
    def parse_product(self, product_elem, base_url: str) -> Optional[Dict]:
        """
        Parse product information from HTML element.
        
        Note: Foot Locker's actual HTML structure may differ.
        Update selectors based on live site inspection.
        """
        try:
            # Example selectors (UPDATE THESE after inspecting live site)
            title_elem = product_elem.select_one('h3.product-title, .ProductCard-title')
            price_elem = product_elem.select_one('span.price, .ProductCard-price')
            date_elem = product_elem.select_one('span.release-date, .ProductCard-date')
            image_elem = product_elem.select_one('img.product-image, .ProductCard-image')
            link_elem = product_elem.select_one('a.product-link, .ProductCard-link')
            
            if not title_elem:
                return None
            
            # Extract data
            title = title_elem.get_text(strip=True)
            price = price_elem.get_text(strip=True) if price_elem else None
            release_date = date_elem.get_text(strip=True) if date_elem else None
            image_url = image_elem.get('src') if image_elem else None
            product_url = link_elem.get('href') if link_elem else None
            
            if product_url:
                product_url = urljoin(base_url, product_url)
            
            # Generate unique ID
            product_id = hashlib.md5(f"{title}{release_date}".encode()).hexdigest()[:16]
            
            return {
                'id': f'footlocker::{product_id}',
                'retailer': 'Foot Locker',
                'name': title,
                'price': price,
                'release_date': release_date,
                'image_url': image_url,
                'product_url': product_url,
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'metadata': {
                    'brand': self._extract_brand(title),
                    'category': 'sneakers'
                }
            }
            
        except Exception as e:
            logger.error(f"Error parsing product: {e}")
            self.stats['errors'] += 1
            return None
    
    def _extract_brand(self, title: str) -> str:
        """Extract brand from product title."""
        title_lower = title.lower()
        if 'jordan' in title_lower or 'aj' in title_lower:
            return 'Jordan'
        elif 'nike' in title_lower:
            return 'Nike'
        elif 'adidas' in title_lower or 'yeezy' in title_lower:
            return 'adidas'
        elif 'new balance' in title_lower or 'nb' in title_lower:
            return 'New Balance'
        return 'Unknown'
    
    def scrape_category(self, category: str, limit: int = 50, use_playwright: bool = False) -> List[Dict]:
        """
        Scrape products from a category.
        
        Args:
            category: Category name (e.g., 'jordan', 'nike')
            limit: Max products to scrape
            use_playwright: Use Playwright for dynamic content
        """
        if category not in self.CATEGORIES:
            logger.error(f"Unknown category: {category}")
            return []
        
        url = urljoin(self.BASE_URL, self.CATEGORIES[category])
        logger.info(f"Scraping {category} from {url}")
        
        products = []
        
        if use_playwright and PLAYWRIGHT_AVAILABLE:
            # Use Playwright for JavaScript-rendered content
            import asyncio
            
            async def scrape_with_playwright():
                async with sync_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    page = await browser.new_page()
                    await page.set_extra_http_headers({'User-Agent': self.USER_AGENT})
                    
                    html = await self.fetch_page_playwright(url, page)
                    await browser.close()
                    
                    if not html:
                        return []
                    
                    soup = BeautifulSoup(html, 'lxml')
                    # Update selector based on live site
                    product_elems = soup.select('div.ProductCard, .product-item, article.product')
                    
                    logger.info(f"Found {len(product_elems)} products")
                    
                    for elem in product_elems[:limit]:
                        product = self.parse_product(elem, url)
                        if product:
                            products.append(product)
                            self.stats['products_scraped'] += 1
                    
                    return products
            
            return asyncio.run(scrape_with_playwright())
        
        else:
            # Use BeautifulSoup for static content
            soup = self.fetch_page(url)
            if not soup:
                return products
            
            # Update selector based on live Foot Locker site structure
            product_elems = soup.select('div.ProductCard, .product-item, article.product')
            
            logger.info(f"Found {len(product_elems)} products")
            
            for elem in product_elems[:limit]:
                product = self.parse_product(elem, url)
                if product:
                    products.append(product)
                    self.stats['products_scraped'] += 1
            
            return products
    
    def save_to_supabase(self, products: List[Dict]):
        """Save products to Supabase with upsert (update if exists)."""
        if not products:
            logger.info("No products to save")
            return
        
        try:
            # Upsert to footlocker_data table
            response = self.supabase.table('footlocker_data').upsert(products).execute()
            logger.info(f"Saved {len(products)} products to Supabase")
        except Exception as e:
            logger.error(f"Error saving to Supabase: {e}", exc_info=True)
            self.stats['errors'] += 1
    
    def run(self, category: str, limit: int = 50, save: bool = True, use_playwright: bool = False) -> Dict:
        """
        Run the scraper for a category.
        
        Returns:
            Stats dictionary with scrape results
        """
        start_time = time.time()
        
        logger.info(f"Starting Foot Locker scraper (category={category}, limit={limit}, save={save})")
        
        # Scrape products
        products = self.scrape_category(category, limit, use_playwright)
        
        # Save to database
        if save and products:
            self.save_to_supabase(products)
        
        # Calculate stats
        elapsed = round(time.time() - start_time, 2)
        self.stats['releases_scraped'] = len(products)
        self.stats['elapsed_seconds'] = elapsed
        self.stats['products_per_second'] = round(len(products) / elapsed, 2) if elapsed > 0 else 0.0
        
        logger.info(f"Scraping complete: {self.stats}")
        
        return self.stats


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Foot Locker Release Calendar Scraper')
    parser.add_argument(
        '--category',
        choices=list(FootLockerScraper.CATEGORIES.keys()),
        default='all',
        help='Category to scrape'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=50,
        help='Max products to scrape'
    )
    parser.add_argument(
        '--no-save',
        action='store_true',
        help='Don\'t save to Supabase (testing mode)'
    )
    parser.add_argument(
        '--playwright',
        action='store_true',
        help='Use Playwright for dynamic content'
    )
    
    args = parser.parse_args()
    
    # Run scraper
    scraper = FootLockerScraper()
    stats = scraper.run(
        category=args.category,
        limit=args.limit,
        save=not args.no_save,
        use_playwright=args.playwright
    )
    
    # Print results
    print(f"\n{'='*80}\nFOOT LOCKER SCRAPER RESULTS\n{'='*80}")
    print(f"Category: {args.category}")
    print(f"Products scraped: {stats['products_scraped']}")
    print(f"Errors: {stats['errors']}")
    print(f"Pages scraped: {stats['pages_scraped']}")
    print(f"Elapsed: {stats['elapsed_seconds']}s")
    print(f"Rate: {stats['products_per_second']} products/sec")
    print(f"{'='*80}\n")


if __name__ == '__main__':
    main()
