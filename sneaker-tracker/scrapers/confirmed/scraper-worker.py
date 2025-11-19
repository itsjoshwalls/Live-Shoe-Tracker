#!/usr/bin/env python3
"""
adidas Confirmed Scraper - Monitors adidas Confirmed app releases
"""

import os
import sys
import time
import logging
import requests
from datetime import datetime

try:
    from supabase import create_client
except ImportError:
    print("ERROR: supabase-py not installed")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('confirmed_scraper')

# adidas Confirmed API endpoint (may require reverse engineering app traffic)
CONFIRMED_API = "https://www.adidas.com/api/search/product"

class ConfirmedScraper:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
        })
    
    def scrape_confirmed(self):
        """Scrape adidas Confirmed releases."""
        releases = []
        try:
            logger.info("Scraping adidas Confirmed...")
            
            # Example query for upcoming releases (adjust based on actual API)
            params = {
                'query': 'yeezy',
                'start': 0,
                'count': 48
            }
            
            res = self.session.get(CONFIRMED_API, params=params, timeout=15)
            
            if res.status_code != 200:
                logger.warning(f"Confirmed API returned {res.status_code}")
                return releases
            
            data = res.json()
            products = data.get('itemList', {}).get('items', [])
            
            for product in products:
                releases.append({
                    'name': product.get('displayName', 'Unknown'),
                    'sku': product.get('productId'),
                    'release_date': product.get('launchDate'),
                    'retailer': 'adidas Confirmed',
                    'price': float(product.get('price', 0)),
                    'product_url': f"https://www.adidas.com/{product.get('link', '')}",
                    'image_url': product.get('image', {}).get('src'),
                    'status': 'upcoming'
                })
            
            logger.info(f"Found {len(releases)} Confirmed releases")
        except Exception as e:
            logger.error(f"Error scraping Confirmed: {e}")
        
        return releases
    
    def upsert_releases(self, releases):
        """Upsert releases to Supabase."""
        if not releases:
            return
        
        try:
            response = self.supabase.table('shoe_releases').upsert(
                releases,
                on_conflict='retailer,sku'
            ).execute()
            
            logger.info(f"Upserted {len(releases)} releases")
        except Exception as e:
            logger.error(f"Upsert error: {e}")
    
    def run(self):
        """Run scraper."""
        releases = self.scrape_confirmed()
        self.upsert_releases(releases)


def main():
    """Main worker loop."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    interval = int(os.getenv("SCRAPE_INTERVAL", "180"))
    
    if not supabase_url or not supabase_key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        sys.exit(1)
    
    scraper = ConfirmedScraper(supabase_url, supabase_key)
    logger.info(f"Confirmed scraper started (interval: {interval}s)")
    
    while True:
        try:
            scraper.run()
        except Exception as e:
            logger.error(f"Scraper run failed: {e}")
        
        logger.info(f"Sleeping {interval}s...")
        time.sleep(interval)


if __name__ == "__main__":
    main()
