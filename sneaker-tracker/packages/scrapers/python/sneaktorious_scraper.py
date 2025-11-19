"""
Sneaktorious Scraper - Release calendar scraper

Scrapes release information from sneaktorious.com
Features: robots.txt compliance, upsert logic, PostgreSQL fallback

Usage:
    python sneaktorious_scraper.py --limit 20
    python sneaktorious_scraper.py --brand jordan --no-save
"""

import os
import sys
import time
import json
import logging
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class SneaktoriousScraper:
    """Scraper for sneaktorious.com"""
    
    BASE_URL = 'https://sneaktorious.com'
    USER_AGENT = 'Live-Sneaker-Tracker-Bot/1.0'
    
    BRANDS = {
        'all': '/release-dates',
        'jordan': '/release-dates/jordan',
        'nike': '/release-dates/nike',
        'adidas': '/release-dates/adidas',
        'yeezy': '/release-dates/yeezy',
        'new-balance': '/release-dates/new-balance',
    }
    
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """Initialize scraper."""
        self.supabase: Client = create_client(
            supabase_url or os.getenv('SUPABASE_URL'),
            supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        
        # robots.txt checker
        self.robot_parser = RobotFileParser()
        self.robot_parser.set_url(f"{self.BASE_URL}/robots.txt")
        try:
            self.robot_parser.read()
            logger.info("Loaded robots.txt")
        except Exception as e:
            logger.warning(f"Could not load robots.txt: {e}")
        
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': self.USER_AGENT})
        
        self.stats = {
            'products_scraped': 0,
            'products_saved': 0,
            'errors': 0,
            'blocked_by_robots': 0
        }
    
    def can_fetch(self, url: str) -> bool:
        """Check if URL can be fetched per robots.txt."""
        return self.robot_parser.can_fetch(self.USER_AGENT, url)
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch page with BeautifulSoup."""
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        time.sleep(1.5)  # Rate limiting
        
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'lxml')
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            self.stats['errors'] += 1
            return None
    
    def parse_product(self, product_elem: Any) -> Optional[Dict]:
        """Parse product element."""
        try:
            # Title and URL
            title_elem = product_elem.select_one('h2, h3, .title, a')
            if not title_elem:
                return None
            
            title = title_elem.get_text(strip=True)
            link = product_elem.select_one('a')
            url = link.get('href') if link else None
            if url and not url.startswith('http'):
                url = urljoin(self.BASE_URL, url)
            
            # Price
            price_elem = product_elem.select_one('.price, span[class*="price"]')
            price = price_elem.get_text(strip=True) if price_elem else None
            
            # Date
            date_elem = product_elem.select_one('time, .date, span[class*="date"]')
            release_date = None
            if date_elem:
                date_str = date_elem.get('datetime') or date_elem.get_text(strip=True)
                try:
                    from dateutil import parser as date_parser
                    release_date = date_parser.parse(date_str).isoformat()
                except:
                    pass
            
            # Image
            image_elem = product_elem.select_one('img')
            image_url = None
            if image_elem:
                image_url = image_elem.get('src') or image_elem.get('data-src')
                if image_url and not image_url.startswith('http'):
                    image_url = urljoin(self.BASE_URL, image_url)
            
            # SKU/Style Code
            sku_elem = product_elem.select_one('.sku, .style-code, span[class*="sku"]')
            sku = sku_elem.get_text(strip=True) if sku_elem else None
            
            return {
                'title': title,
                'url': url or f"{self.BASE_URL}/unknown-{hash(title)}",
                'price': price,
                'release_date': release_date,
                'image_url': image_url,
                'sku': sku,
                'source': 'sneaktorious',
                'status': 'upcoming'
            }
            
        except Exception as e:
            logger.error(f"Error parsing product: {e}")
            return None
    
    def scrape_brand(self, brand: str = 'all', limit: int = 20) -> List[Dict]:
        """Scrape products from brand page."""
        brand_path = self.BRANDS.get(brand, self.BRANDS['all'])
        url = f"{self.BASE_URL}{brand_path}"
        
        logger.info(f"Scraping {brand} from {url}")
        
        soup = self.fetch_page(url)
        if not soup:
            return []
        
        # Find product elements - adjust selectors based on actual site structure
        products = soup.select('div[class*="product"], article, div.release-item, div[class*="card"]')
        logger.info(f"Found {len(products)} products")
        
        results = []
        for product in products[:limit]:
            product_data = self.parse_product(product)
            if product_data:
                results.append(product_data)
                self.stats['products_scraped'] += 1
        
        return results
    
    def save_to_postgres_direct(self, products: List[Dict], table_name: str = 'soleretriever_data') -> int:
        """Save directly to PostgreSQL."""
        saved_count = 0
        
        try:
            conn = psycopg2.connect(
                host=os.getenv('POSTGRES_HOST', 'localhost'),
                port=os.getenv('POSTGRES_PORT', '5432'),
                database=os.getenv('POSTGRES_DB', 'postgres'),
                user=os.getenv('POSTGRES_USER', 'postgres'),
                password=os.getenv('POSTGRES_PASSWORD', 'your-super-secret-postgres-password')
            )
            cursor = conn.cursor()
            
            for product in products:
                try:
                    query = """
                        INSERT INTO {table} (
                            title, url, price, release_date, image_url, sku, source, status
                        ) VALUES (
                            %(title)s, %(url)s, %(price)s, %(release_date)s,
                            %(image_url)s, %(sku)s, %(source)s, %(status)s
                        )
                        ON CONFLICT (url) DO UPDATE SET
                            title = EXCLUDED.title,
                            price = EXCLUDED.price,
                            release_date = EXCLUDED.release_date,
                            updated_at = NOW()
                        RETURNING id;
                    """.format(table=table_name)
                    
                    cursor.execute(query, product)
                    saved_count += 1
                    self.stats['products_saved'] += 1
                    
                except Exception as e:
                    logger.error(f"Error saving product: {e}")
                    self.stats['errors'] += 1
                    conn.rollback()
                    continue
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            self.stats['errors'] += len(products)
        
        return saved_count
    
    def save_to_supabase(self, products: List[Dict], table_name: str = 'soleretriever_data') -> int:
        """Save to Supabase with PostgreSQL fallback."""
        for product in products:
            try:
                result = self.supabase.table(table_name).upsert(product, on_conflict='url').execute()
                if result.data:
                    self.stats['products_saved'] += 1
            except Exception as e:
                error_msg = str(e)
                if 'JWT' in error_msg or 'JWS' in error_msg or '401' in error_msg:
                    logger.warning("JWT authentication failed, falling back to direct PostgreSQL")
                    return self.save_to_postgres_direct(products, table_name)
                logger.error(f"Error saving: {e}")
                self.stats['errors'] += 1
        
        return self.stats['products_saved']
    
    def run(self, brand: str = 'all', limit: int = 20, save: bool = True) -> Dict[str, Any]:
        """Run scraper."""
        start_time = time.time()
        
        products = self.scrape_brand(brand, limit)
        
        if save and products:
            saved = self.save_to_supabase(products)
            logger.info(f"Saved {saved}/{len(products)} products")
        
        self.stats['elapsed_seconds'] = round(time.time() - start_time, 2)
        return self.stats


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape Sneaktorious')
    parser.add_argument('--brand', default='all', help='Brand to scrape')
    parser.add_argument('--limit', type=int, default=20, help='Max products')
    parser.add_argument('--no-save', action='store_true', help='Dry run')
    
    args = parser.parse_args()
    
    scraper = SneaktoriousScraper()
    stats = scraper.run(brand=args.brand, limit=args.limit, save=not args.no_save)
    
    print(f"\n{'='*60}\nSTATS\n{'='*60}")
    print(json.dumps(stats, indent=2))
