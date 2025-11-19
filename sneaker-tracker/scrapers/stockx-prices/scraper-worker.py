#!/usr/bin/env python3
"""
StockX Price Points Scraper - Populates price_points table for ML forecasting
Uses sneaks-api wrapper to fetch resale prices from StockX, GOAT, FlightClub, StadiumGoods
"""

import os
import sys
import time
import json
import logging
import subprocess
from datetime import datetime, timezone
from typing import List, Dict

try:
    from supabase import create_client
except ImportError:
    print("ERROR: supabase-py not installed")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('stockx_prices')

# Path to stockx_prices.cjs Node script
STOCKX_SCRIPT = "/app/stockx_prices.cjs"

class PriceScraper:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)
    
    def fetch_trending_skus(self, limit=50):
        """Fetch trending/recent SKUs from shoe_releases table."""
        try:
            response = self.supabase.table('shoe_releases') \
                .select('sku,name') \
                .not_.is_('sku', 'null') \
                .order('release_date', desc=True) \
                .limit(limit) \
                .execute()
            
            skus = [(r['sku'], r['name']) for r in response.data if r.get('sku')]
            logger.info(f"Fetched {len(skus)} SKUs for price tracking")
            return skus
        except Exception as e:
            logger.error(f"Error fetching SKUs: {e}")
            return []
    
    def fetch_prices_for_sku(self, sku, name):
        """Call Node.js sneaks-api script to get prices."""
        try:
            result = subprocess.run(
                ['node', STOCKX_SCRIPT, sku],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                logger.error(f"Error fetching prices for {sku}: {result.stderr}")
                return []
            
            data = json.loads(result.stdout)
            
            # Parse prices from sneaks-api response
            prices = []
            timestamp = datetime.now(timezone.utc).isoformat()
            
            platforms = {
                'stockX': 'StockX',
                'goat': 'GOAT',
                'flightClub': 'Flight Club',
                'stadiumGoods': 'Stadium Goods'
            }
            
            for key, platform in platforms.items():
                price_val = data.get('lowestResellPrice', {}).get(key)
                if price_val and price_val > 0:
                    prices.append({
                        'sku': sku,
                        'platform': platform,
                        'price': float(price_val),
                        'currency': 'USD',
                        'timestamp': timestamp,
                        'sneaker_name': name,
                        'condition': 'new'
                    })
            
            return prices
        except Exception as e:
            logger.error(f"Error fetching prices for {sku}: {e}")
            return []
    
    def upsert_prices(self, prices):
        """Upsert price points to Supabase."""
        if not prices:
            return
        
        try:
            response = self.supabase.table('price_points').insert(prices).execute()
            logger.info(f"Inserted {len(prices)} price points")
        except Exception as e:
            logger.error(f"Upsert error: {e}")
    
    def run(self):
        """Run price scraper."""
        logger.info("Starting price scraper run...")
        
        skus = self.fetch_trending_skus(limit=50)
        all_prices = []
        
        for sku, name in skus:
            logger.info(f"Fetching prices for {sku} ({name[:40]}...)")
            prices = self.fetch_prices_for_sku(sku, name)
            all_prices.extend(prices)
            time.sleep(2)  # Rate limit
        
        self.upsert_prices(all_prices)
        logger.info(f"Price scraper run complete. Collected {len(all_prices)} prices.")


def main():
    """Main worker loop."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    interval = int(os.getenv("SCRAPE_INTERVAL", "3600"))  # 1 hour default
    
    if not supabase_url or not supabase_key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        sys.exit(1)
    
    scraper = PriceScraper(supabase_url, supabase_key)
    logger.info(f"StockX price scraper started (interval: {interval}s)")
    
    while True:
        try:
            scraper.run()
        except Exception as e:
            logger.error(f"Scraper run failed: {e}")
        
        logger.info(f"Sleeping {interval}s...")
        time.sleep(interval)


if __name__ == "__main__":
    main()
