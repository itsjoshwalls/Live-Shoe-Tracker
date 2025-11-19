"""
Sole Retriever Scraper with Firestore + Google Analytics

Updated version that saves to Firestore instead of PostgreSQL/Supabase.
Includes Google Analytics event tracking for monitoring.

Environment Variables Required:
- FIREBASE_SERVICE_ACCOUNT: JSON string of Firebase service account credentials
- GA_MEASUREMENT_ID: Google Analytics 4 Measurement ID (format: G-XXXXXXXXXX)
- GA_API_SECRET: Google Analytics 4 Measurement Protocol API Secret

Usage:
    python soleretriever_scraper_firebase.py --collection jordan --limit 10
"""

import os
import sys
import time
import logging
import argparse
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from firestore_adapter import FirestoreAdapter
    from analytics_tracker import AnalyticsTracker, ScraperRunContext
except ImportError:
    print("Error: Missing firestore_adapter.py or analytics_tracker.py")
    print("Make sure both files are in the same directory")
    sys.exit(1)

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from urllib.robotparser import RobotFileParser

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SoleRetrieverScraperFirebase:
    """
    Scraper for Sole Retriever sneaker release calendars.
    Saves to Firestore with Google Analytics tracking.
    """
    
    BASE_URL = "https://www.soleretriever.com"
    
    COLLECTIONS = {
        'jordan': '/sneaker-release-dates/jordan',
        'nike': '/sneaker-release-dates/nike',
        'adidas': '/sneaker-release-dates/adidas',
        'yeezy': '/sneaker-release-dates/yeezy',
        'newbalance': '/sneaker-release-dates/new-balance',
        'all': '/sneaker-release-dates'
    }
    
    def __init__(self, firestore_adapter: FirestoreAdapter, 
                 analytics_tracker: Optional[AnalyticsTracker] = None,
                 delay: float = 1.5, user_agent: str = None):
        """
        Initialize scraper.
        
        Args:
            firestore_adapter: Initialized FirestoreAdapter instance
            analytics_tracker: Optional AnalyticsTracker instance
            delay: Delay between requests in seconds
            user_agent: Custom user agent string
        """
        self.firestore = firestore_adapter
        self.analytics = analytics_tracker
        self.delay = delay
        self.user_agent = user_agent or "Mozilla/5.0 (compatible; SneakerBot/1.0)"
        self.robots_parser = None
        self.stats = {
            'products_scraped': 0,
            'errors': 0,
            'blocked_by_robots': 0,
            'start_time': None,
            'end_time': None
        }
        
        # Check robots.txt
        self._check_robots_txt()
    
    def _check_robots_txt(self):
        """Check robots.txt for scraping permissions."""
        try:
            self.robots_parser = RobotFileParser()
            self.robots_parser.set_url(f"{self.BASE_URL}/robots.txt")
            self.robots_parser.read()
            logger.info("robots.txt loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load robots.txt: {e}")
            self.robots_parser = None
    
    def can_fetch(self, url: str) -> bool:
        """Check if URL can be fetched according to robots.txt."""
        if not self.robots_parser:
            return True
        return self.robots_parser.can_fetch(self.user_agent, url)
    
    def scrape_collection(self, collection: str = 'jordan', limit: int = None) -> List[Dict]:
        """
        Scrape products from a collection.
        
        Args:
            collection: Collection name (jordan, nike, adidas, yeezy, newbalance, all)
            limit: Maximum number of products to scrape
            
        Returns:
            List of product dictionaries
        """
        self.stats['start_time'] = time.time()
        
        if collection not in self.COLLECTIONS:
            logger.error(f"Invalid collection: {collection}")
            return []
        
        url = self.BASE_URL + self.COLLECTIONS[collection]
        
        # Check robots.txt
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            if self.analytics:
                self.analytics.track_robots_blocked('soleretriever', url)
            return []
        
        logger.info(f"Scraping {collection} collection: {url}")
        
        try:
            # Fetch page
            response = requests.get(
                url,
                headers={'User-Agent': self.user_agent},
                timeout=30
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Find product links (updated selector from previous fix)
            product_links = soup.find_all('a', href=lambda x: 
                x and x.startswith('/sneaker-release-dates/') and 
                x != '/sneaker-release-dates' and
                x.count('/') >= 3
            )
            
            logger.info(f"Found {len(product_links)} product links")
            
            products = []
            for i, link in enumerate(product_links):
                if limit and i >= limit:
                    break
                
                try:
                    product_url = urljoin(self.BASE_URL, link.get('href'))
                    product = self._scrape_product_page(product_url)
                    
                    if product:
                        products.append(product)
                        self.stats['products_scraped'] += 1
                        
                        # Track individual product saved event
                        if self.analytics:
                            self.analytics.track_product_saved(
                                source='soleretriever',
                                product_title=product.get('title'),
                                brand=product.get('brand'),
                                price=product.get('price')
                            )
                    
                    # Rate limiting
                    time.sleep(self.delay)
                    
                except Exception as e:
                    logger.error(f"Error scraping product {i+1}: {e}")
                    self.stats['errors'] += 1
                    if self.analytics:
                        self.analytics.track_scraper_error(
                            source='soleretriever',
                            error_type='product_scraping',
                            error_message=str(e)
                        )
            
            self.stats['end_time'] = time.time()
            return products
            
        except Exception as e:
            logger.error(f"Error scraping collection: {e}")
            self.stats['errors'] += 1
            self.stats['end_time'] = time.time()
            if self.analytics:
                self.analytics.track_scraper_error(
                    source='soleretriever',
                    error_type='collection_scraping',
                    error_message=str(e)
                )
            return []
    
    def _scrape_product_page(self, url: str) -> Optional[Dict]:
        """
        Scrape individual product page.
        
        Args:
            url: Product page URL
            
        Returns:
            Product dictionary or None if failed
        """
        try:
            response = requests.get(
                url,
                headers={'User-Agent': self.user_agent},
                timeout=30
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Extract product data (adjust selectors as needed)
            product = {
                'url': url,
                'source': 'soleretriever',
                'scraped_at': datetime.now().isoformat()
            }
            
            # Title
            title_elem = soup.find('h1')
            product['title'] = title_elem.get_text(strip=True) if title_elem else None
            
            # Brand (extract from title or URL)
            if product['title']:
                for brand in ['Jordan', 'Nike', 'Adidas', 'Yeezy', 'New Balance']:
                    if brand.lower() in product['title'].lower():
                        product['brand'] = brand
                        break
            
            # Price
            price_elem = soup.find('span', class_='price') or soup.find(text=lambda x: x and '$' in x)
            product['price'] = price_elem.get_text(strip=True) if price_elem else None
            
            # Release date
            date_elem = soup.find('time') or soup.find(class_='release-date')
            product['release_date'] = date_elem.get('datetime') if date_elem and date_elem.get('datetime') else None
            
            # SKU/Style code
            sku_elem = soup.find(text=lambda x: x and 'sku' in x.lower())
            product['sku'] = sku_elem.strip() if sku_elem else None
            
            # Status
            status_elem = soup.find(class_='status')
            product['status'] = status_elem.get_text(strip=True) if status_elem else 'upcoming'
            
            # Image
            img_elem = soup.find('img', class_='product-image') or soup.find('img')
            product['image_url'] = img_elem.get('src') if img_elem else None
            
            return product
            
        except Exception as e:
            logger.error(f"Error scraping product page {url}: {e}")
            return None
    
    def run(self, collection: str = 'jordan', limit: int = None, 
            firestore_collection: str = 'sneakers_canonical') -> Dict:
        """
        Run complete scraping workflow with Firestore save and analytics tracking.
        
        Args:
            collection: Collection name to scrape
            limit: Maximum number of products
            firestore_collection: Firestore collection name to save to
            
        Returns:
            Statistics dictionary
        """
        logger.info(f"Starting Sole Retriever scraper (collection: {collection}, limit: {limit})")
        
        # Use analytics context manager if available
        if self.analytics:
            with ScraperRunContext(self.analytics, 'soleretriever', collection=collection) as ctx:
                products = self.scrape_collection(collection, limit)
                
                if products:
                    saved = self.firestore.save_products(products, firestore_collection)
                    logger.info(f"Saved {saved}/{len(products)} products to Firestore")
                    ctx.products_scraped = saved
                else:
                    logger.warning("No products scraped")
                
                ctx.errors = self.stats['errors']
        else:
            # No analytics tracking
            products = self.scrape_collection(collection, limit)
            
            if products:
                saved = self.firestore.save_products(products, firestore_collection)
                logger.info(f"Saved {saved}/{len(products)} products to Firestore")
        
        # Calculate final stats
        if self.stats['start_time'] and self.stats['end_time']:
            self.stats['duration_seconds'] = self.stats['end_time'] - self.stats['start_time']
        
        return self.stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Sole Retriever Scraper with Firestore + GA')
    parser.add_argument('--collection', default='jordan', 
                       choices=['jordan', 'nike', 'adidas', 'yeezy', 'newbalance', 'all'],
                       help='Collection to scrape')
    parser.add_argument('--limit', type=int, help='Maximum number of products to scrape')
    parser.add_argument('--firestore-collection', default='sneakers_canonical',
                       help='Firestore collection name')
    parser.add_argument('--service-account', help='Path to Firebase service account JSON')
    parser.add_argument('--no-analytics', action='store_true', help='Disable Google Analytics tracking')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize Firestore adapter
    try:
        firestore = FirestoreAdapter(service_account_path=args.service_account)
    except Exception as e:
        logger.error(f"Failed to initialize Firestore: {e}")
        logger.error("Make sure FIREBASE_SERVICE_ACCOUNT env var is set or use --service-account")
        sys.exit(1)
    
    # Initialize Analytics tracker (optional)
    analytics = None
    if not args.no_analytics:
        try:
            analytics = AnalyticsTracker()
            logger.info("Google Analytics tracking enabled")
        except Exception as e:
            logger.warning(f"Google Analytics not available: {e}")
            logger.warning("Set GA_MEASUREMENT_ID and GA_API_SECRET env vars to enable")
    
    # Run scraper
    scraper = SoleRetrieverScraperFirebase(firestore, analytics)
    stats = scraper.run(
        collection=args.collection,
        limit=args.limit,
        firestore_collection=args.firestore_collection
    )
    
    # Print results
    print("\n=== Scraping Results ===")
    print(f"Products scraped: {stats['products_scraped']}")
    print(f"Errors: {stats['errors']}")
    print(f"Blocked by robots.txt: {stats['blocked_by_robots']}")
    if stats.get('duration_seconds'):
        print(f"Duration: {stats['duration_seconds']:.2f}s")
    print(f"Firestore stats: {firestore.get_stats()}")


if __name__ == '__main__':
    main()
