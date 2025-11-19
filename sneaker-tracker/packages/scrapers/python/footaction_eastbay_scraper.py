"""
Footaction + Eastbay Scraper - Foot Locker Family

Both are owned by Foot Locker Inc and share the same API infrastructure.
This scraper handles both retailers using the same codebase.

robots.txt:
- https://www.footaction.com/robots.txt
- https://www.eastbay.com/robots.txt

Features:
- Launch calendar scraping
- Product details
- Size availability
- Stock status
- Release dates

Usage:
    python footaction_eastbay_scraper.py --retailer footaction --limit 20
    python footaction_eastbay_scraper.py --retailer eastbay --limit 20
    python footaction_eastbay_scraper.py --both --limit 40
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Optional

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('footaction_eastbay_scraper')


RETAILERS = {
    'footaction': {
        'name': 'Footaction',
        'base_url': 'https://www.footaction.com',
        'launch_api': 'https://www.footaction.com/api/launch-calendar',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    'eastbay': {
        'name': 'Eastbay',
        'base_url': 'https://www.eastbay.com',
        'launch_api': 'https://www.eastbay.com/api/launch-calendar',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
}


class FootactionEastbayScraper:
    """Unified scraper for Footaction and Eastbay."""
    
    def __init__(self, retailer: str = 'footaction'):
        if retailer not in RETAILERS:
            raise ValueError(f"Retailer must be 'footaction' or 'eastbay', got: {retailer}")
        
        self.retailer = retailer
        self.config = RETAILERS[retailer]
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.config['user_agent'],
            'Accept': 'application/json, text/html',
            'Accept-Language': 'en-US,en;q=0.9'
        })
    
    def scrape_launches(self, limit: int = 50) -> List[Dict]:
        """
        Scrape launch calendar releases.
        
        Args:
            limit: Maximum number of releases to fetch
        
        Returns:
            List of release dictionaries
        """
        logger.info(f"Scraping {self.config['name']} launches (limit={limit})")
        
        releases = []
        
        # Try API endpoint first
        try:
            response = self.session.get(self.config['launch_api'], timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                releases = self._parse_api_response(data)
                logger.info(f"Got {len(releases)} releases from API")
        except Exception as e:
            logger.warning(f"API request failed: {e}, trying HTML scraping")
        
        # Fallback to HTML scraping
        if not releases:
            releases = self._scrape_html_calendar(limit)
        
        logger.info(f"Scraped {len(releases)} releases from {self.config['name']}")
        return releases[:limit]
    
    def _parse_api_response(self, data: Dict) -> List[Dict]:
        """Parse API response into release dictionaries."""
        releases = []
        
        # Foot Locker family APIs typically return: {"products": [...]}
        products = data.get('products', data.get('releases', []))
        
        for product in products:
            try:
                release = {
                    'name': product.get('name', product.get('title', 'Unknown')),
                    'sku': product.get('sku', product.get('styleId')),
                    'price': product.get('price', {}).get('value') or product.get('retailPrice'),
                    'release_date': product.get('releaseDate', product.get('launchDate')),
                    'image_url': product.get('imageUrl', product.get('image')),
                    'product_url': self._build_product_url(product.get('productId') or product.get('id')),
                    'status': product.get('status', 'upcoming'),
                    'retailer': self.config['name'],
                    'source': self.config['base_url'],
                    'scraped_at': datetime.now(timezone.utc).isoformat()
                }
                
                releases.append(release)
            except Exception as e:
                logger.error(f"Error parsing product: {e}")
                continue
        
        return releases
    
    def _scrape_html_calendar(self, limit: int) -> List[Dict]:
        """Scrape launch calendar from HTML page."""
        releases = []
        
        calendar_url = f"{self.config['base_url']}/release-dates"
        
        try:
            response = self.session.get(calendar_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find product cards (adjust selectors based on actual HTML)
            product_cards = soup.find_all('div', class_='product-card') or \
                           soup.find_all('article', class_='product') or \
                           soup.find_all('div', {'data-product': True})
            
            logger.info(f"Found {len(product_cards)} product cards in HTML")
            
            for card in product_cards[:limit]:
                release = self._parse_product_card(card)
                if release:
                    releases.append(release)
                    
        except Exception as e:
            logger.error(f"HTML scraping failed: {e}")
        
        return releases
    
    def _parse_product_card(self, card) -> Optional[Dict]:
        """Parse a product card element."""
        try:
            name_elem = card.find('h3') or card.find(class_='product-name')
            name = name_elem.get_text(strip=True) if name_elem else 'Unknown'
            
            price_elem = card.find(class_='price')
            price = price_elem.get_text(strip=True) if price_elem else None
            
            img_elem = card.find('img')
            image_url = img_elem.get('src') or img_elem.get('data-src') if img_elem else None
            
            link_elem = card.find('a')
            product_url = link_elem.get('href') if link_elem else None
            if product_url and not product_url.startswith('http'):
                product_url = self.config['base_url'] + product_url
            
            return {
                'name': name,
                'price': price,
                'image_url': image_url,
                'product_url': product_url,
                'retailer': self.config['name'],
                'source': self.config['base_url'],
                'status': 'upcoming',
                'scraped_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing product card: {e}")
            return None
    
    def _build_product_url(self, product_id: str) -> str:
        """Build product URL from ID."""
        if not product_id:
            return None
        return f"{self.config['base_url']}/product/{product_id}"


def main():
    """Main execution."""
    parser = argparse.ArgumentParser(description='Footaction/Eastbay Scraper')
    parser.add_argument('--retailer', type=str, choices=['footaction', 'eastbay'], 
                       default='footaction', help='Retailer to scrape')
    parser.add_argument('--both', action='store_true', help='Scrape both retailers')
    parser.add_argument('--limit', type=int, default=50, help='Maximum releases per retailer')
    parser.add_argument('--output', type=str, default='releases.json', help='Output file')
    
    args = parser.parse_args()
    
    all_releases = []
    retailers_to_scrape = ['footaction', 'eastbay'] if args.both else [args.retailer]
    
    for retailer in retailers_to_scrape:
        scraper = FootactionEastbayScraper(retailer)
        releases = scraper.scrape_launches(limit=args.limit)
        all_releases.extend(releases)
    
    # Save to JSON
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(all_releases, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved {len(all_releases)} releases to {args.output}")
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Footaction/Eastbay Scraper - Summary")
    print(f"{'='*60}")
    print(f"Total releases: {len(all_releases)}")
    print(f"Retailers scraped: {', '.join(retailers_to_scrape)}")
    print(f"Output file: {args.output}")
    print(f"{'='*60}\n")
    
    # Show sample
    if all_releases:
        print("Sample release:")
        print(json.dumps(all_releases[0], indent=2))


if __name__ == '__main__':
    main()
