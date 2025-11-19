"""
Nike SNKRS App/Web Scraper

Scrapes upcoming sneaker releases from Nike SNKRS.
This is a HIGH-PRIORITY scraper for the most exclusive Nike releases.

IMPORTANT: Nike SNKRS uses heavy JavaScript rendering and anti-bot protection.
This scraper REQUIRES Playwright and may need additional anti-detection measures.

Features:
- Scrapes SNKRS exclusive releases, launch calendar
- Supports draw/raffle entries detection
- Handles dynamic JavaScript content
- Respects robots.txt and implements conservative rate limiting
- Saves to Supabase with deduplication

Usage:
    # Scrape upcoming SNKRS releases
    python nike_snkrs_scraper.py --mode upcoming --limit 20

    # Scrape available now
    python nike_snkrs_scraper.py --mode available --limit 10

    # Test mode (don't save)
    python nike_snkrs_scraper.py --mode upcoming --limit 5 --no-save

WARNING: Nike has strict anti-bot measures. Use conservatively and respect rate limits.
Consider using authenticated sessions for better reliability.
"""

import os
import sys
import time
import logging
import argparse
import hashlib
import json
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

# Playwright is REQUIRED for SNKRS
try:
    from playwright.sync_api import sync_playwright, Page, Browser
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("ERROR: Playwright is REQUIRED for Nike SNKRS scraper!")
    print("Install with: pip install playwright && playwright install chromium")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class NikeSNKRSScraper:
    """
    Scraper for Nike SNKRS platform.
    
    Nike SNKRS is one of the most important sources for exclusive Nike/Jordan releases.
    Uses Playwright with anti-detection to handle JavaScript-heavy pages.
    """
    
    BASE_URL = 'https://www.nike.com'
    SNKRS_URL = 'https://www.nike.com/launch'  # SNKRS launch calendar
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    
    MODES = {
        'upcoming': '/launch/upcoming',
        'available': '/launch',
        'past': '/launch/past-releases',
    }
    
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """Initialize scraper."""
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright is required for Nike SNKRS scraper")
        
        # Supabase client
        self.supabase: Client = create_client(
            supabase_url or os.getenv('SUPABASE_URL'),
            supabase_key or os.getenv('SUPABASE_KEY')
        )
        
        # robots.txt checker
        self.robot_parser = RobotFileParser()
        self.robot_parser.set_url(f"{self.BASE_URL}/robots.txt")
        try:
            self.robot_parser.read()
            logger.info("Loaded robots.txt for Nike")
        except Exception as e:
            logger.warning(f"Could not load robots.txt: {e}")
        
        # Stats
        self.stats = {
            'releases_scraped': 0,
            'products_scraped': 0,
            'errors': 0,
            'blocked_by_robots': 0,
            'pages_scraped': 0,
            'raffles_found': 0
        }
    
    def can_fetch(self, url: str) -> bool:
        """Check if URL can be fetched per robots.txt."""
        return self.robot_parser.can_fetch('*', url)
    
    async def fetch_snkrs_page(self, browser: Browser, url: str) -> Optional[str]:
        """
        Fetch SNKRS page with Playwright and anti-detection.
        
        Nike has sophisticated bot detection - use stealth mode.
        """
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        try:
            context = await browser.new_context(
                user_agent=self.USER_AGENT,
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='America/New_York'
            )
            
            page = await context.new_page()
            
            # Navigate with realistic settings
            await page.goto(url, wait_until='networkidle', timeout=60000)
            
            # Wait for product grid to load (adjust selector based on actual SNKRS structure)
            try:
                await page.wait_for_selector('.product-card, [data-testid="product-card"]', timeout=15000)
            except:
                logger.warning("Product cards did not load within timeout")
            
            # Scroll to trigger lazy loading
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await page.wait_for_timeout(2000)
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await page.wait_for_timeout(2000)
            
            html = await page.content()
            await context.close()
            
            self.stats['pages_scraped'] += 1
            logger.info(f"Successfully fetched SNKRS page: {url}")
            
            return html
            
        except Exception as e:
            logger.error(f"Error fetching SNKRS page {url}: {e}")
            self.stats['errors'] += 1
            return None
    
    def parse_snkrs_product(self, product_elem, base_url: str) -> Optional[Dict]:
        """
        Parse SNKRS product from HTML element.
        
        NOTE: Nike's HTML structure changes frequently. Update selectors based on live site.
        SNKRS uses React/Next.js with data attributes like data-testid.
        """
        try:
            # Example selectors (UPDATE AFTER INSPECTING LIVE SNKRS)
            title_elem = product_elem.select_one('[data-testid="product-title"], h3.product-card__title')
            subtitle_elem = product_elem.select_one('[data-testid="product-subtitle"], .product-card__subtitle')
            price_elem = product_elem.select_one('[data-testid="product-price"], .product-price')
            date_elem = product_elem.select_one('[data-testid="product-date"], .product-card__launch-date')
            image_elem = product_elem.select_one('img[data-testid="product-image"], .product-card__hero-image')
            link_elem = product_elem.select_one('a[data-testid="product-card-link"], a.product-card__link')
            
            # Check for draw/raffle indicator
            draw_elem = product_elem.select_one('[data-testid="draw-badge"], .launch-type-draw')
            
            if not title_elem:
                return None
            
            title = title_elem.get_text(strip=True)
            subtitle = subtitle_elem.get_text(strip=True) if subtitle_elem else ''
            full_name = f"{title} {subtitle}".strip()
            
            price = price_elem.get_text(strip=True) if price_elem else None
            release_date = date_elem.get_text(strip=True) if date_elem else None
            image_url = image_elem.get('src') if image_elem else None
            product_url = link_elem.get('href') if link_elem else None
            
            if product_url:
                product_url = urljoin(base_url, product_url)
            
            # Detect raffle/draw
            is_raffle = draw_elem is not None or (release_date and 'draw' in release_date.lower())
            
            if is_raffle:
                self.stats['raffles_found'] += 1
            
            # Generate unique ID
            product_id = hashlib.md5(f"{full_name}{release_date}".encode()).hexdigest()[:16]
            
            return {
                'id': f'nike_snkrs::{product_id}',
                'retailer': 'Nike SNKRS',
                'name': full_name,
                'price': price,
                'release_date': release_date,
                'image_url': image_url,
                'product_url': product_url,
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'metadata': {
                    'brand': 'Nike' if 'jordan' not in title.lower() else 'Jordan',
                    'is_raffle': is_raffle,
                    'launch_type': 'Draw' if is_raffle else 'FCFS',
                    'platform': 'SNKRS',
                    'category': 'sneakers'
                }
            }
            
        except Exception as e:
            logger.error(f"Error parsing SNKRS product: {e}")
            self.stats['errors'] += 1
            return None
    
    async def scrape_snkrs(self, mode: str, limit: int = 50) -> List[Dict]:
        """
        Scrape Nike SNKRS releases.
        
        Args:
            mode: 'upcoming', 'available', or 'past'
            limit: Max products to scrape
        """
        if mode not in self.MODES:
            logger.error(f"Unknown mode: {mode}")
            return []
        
        url = urljoin(self.BASE_URL, self.MODES[mode])
        logger.info(f"Scraping Nike SNKRS ({mode}) from {url}")
        
        products = []
        
        async with sync_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox'
                ]
            )
            
            html = await self.fetch_snkrs_page(browser, url)
            await browser.close()
            
            if not html:
                logger.warning("Failed to fetch SNKRS page")
                return products
            
            soup = BeautifulSoup(html, 'lxml')
            
            # Update selectors based on live Nike SNKRS structure
            product_elems = soup.select('[data-testid="product-card"], .product-card, article.product')
            
            logger.info(f"Found {len(product_elems)} SNKRS products")
            
            for elem in product_elems[:limit]:
                product = self.parse_snkrs_product(elem, url)
                if product:
                    products.append(product)
                    self.stats['products_scraped'] += 1
            
            # Conservative rate limiting
            await asyncio.sleep(3)
        
        return products
    
    def save_to_supabase(self, products: List[Dict]):
        """Save SNKRS products to Supabase."""
        if not products:
            logger.info("No products to save")
            return
        
        try:
            # Upsert to nike_snkrs_data table
            response = self.supabase.table('nike_snkrs_data').upsert(products).execute()
            logger.info(f"Saved {len(products)} SNKRS products to Supabase")
        except Exception as e:
            logger.error(f"Error saving to Supabase: {e}", exc_info=True)
            self.stats['errors'] += 1
    
    def run(self, mode: str, limit: int = 50, save: bool = True) -> Dict:
        """
        Run the Nike SNKRS scraper.
        
        Returns:
            Stats dictionary with scrape results
        """
        import asyncio
        
        start_time = time.time()
        
        logger.info(f"Starting Nike SNKRS scraper (mode={mode}, limit={limit}, save={save})")
        
        # Scrape products
        products = asyncio.run(self.scrape_snkrs(mode, limit))
        
        # Save to database
        if save and products:
            self.save_to_supabase(products)
        
        # Calculate stats
        elapsed = round(time.time() - start_time, 2)
        self.stats['releases_scraped'] = len(products)
        self.stats['elapsed_seconds'] = elapsed
        self.stats['products_per_second'] = round(len(products) / elapsed, 2) if elapsed > 0 else 0.0
        
        logger.info(f"SNKRS scraping complete: {self.stats}")
        
        return self.stats


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Nike SNKRS Scraper')
    parser.add_argument(
        '--mode',
        choices=list(NikeSNKRSScraper.MODES.keys()),
        default='upcoming',
        help='SNKRS mode to scrape'
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
    
    args = parser.parse_args()
    
    # Run scraper
    scraper = NikeSNKRSScraper()
    stats = scraper.run(
        mode=args.mode,
        limit=args.limit,
        save=not args.no_save
    )
    
    # Print results
    print(f"\n{'='*80}\nNIKE SNKRS SCRAPER RESULTS\n{'='*80}")
    print(f"Mode: {args.mode}")
    print(f"Products scraped: {stats['products_scraped']}")
    print(f"Raffles found: {stats['raffles_found']}")
    print(f"Errors: {stats['errors']}")
    print(f"Pages scraped: {stats['pages_scraped']}")
    print(f"Elapsed: {stats['elapsed_seconds']}s")
    print(f"Rate: {stats['products_per_second']} products/sec")
    print(f"{'='*80}\n")


if __name__ == '__main__':
    main()
