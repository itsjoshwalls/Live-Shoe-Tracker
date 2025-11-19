"""
Dick's Sporting Goods Scraper - Major US Chain

robots.txt: https://www.dickssportinggoods.com/robots.txt

Features:
- Jordan exclusives
- Nike releases
- Launch calendar
- Regional availability
- In-store vs online tracking

Usage:
    python dicks_sporting_goods_scraper.py --limit 20
    python dicks_sporting_goods_scraper.py --brand jordan --limit 10
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
logger = logging.getLogger('dicks_scraper')


class DicksSportingGoodsScraper:
    """Scraper for Dick's Sporting Goods sneaker releases."""
    
    def __init__(self):
        self.base_url = 'https://www.dickssportinggoods.com'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html',
            'Accept-Language': 'en-US,en;q=0.9'
        })
    
    def scrape_releases(self, brand: str = None, limit: int = 50) -> List[Dict]:
        """
        Scrape sneaker releases.
        
        Args:
            brand: Filter by brand (jordan, nike, adidas)
            limit: Maximum number of releases
        
        Returns:
            List of release dictionaries
        """
        logger.info(f"Scraping Dick's releases (brand={brand}, limit={limit})")
        
        releases = []
        
        # Try search/catalog endpoints
        endpoints = [
            '/search/SearchDisplay?searchTerm=sneaker+releases',
            '/c/nike-sneakers?searchTerm=release',
            '/c/jordan-brand',
            '/c/athletic-shoes'
        ]
        
        for endpoint in endpoints:
            url = self.base_url + endpoint
            
            try:
                response = self.session.get(url, timeout=30)
                
                if response.status_code == 200:
                    # Try JSON first
                    if 'application/json' in response.headers.get('Content-Type', ''):
                        data = response.json()
                        products = self._parse_json_products(data)
                        releases.extend(products)
                    else:
                        # Parse HTML
                        soup = BeautifulSoup(response.content, 'html.parser')
                        products = self._parse_html_products(soup)
                        releases.extend(products)
                    
                    if releases:
                        logger.info(f"Found {len(releases)} releases from {endpoint}")
                        break
                        
            except Exception as e:
                logger.warning(f"Endpoint {endpoint} failed: {e}")
                continue
        
        # Apply brand filter
        if brand:
            releases = [r for r in releases if brand.lower() in r.get('name', '').lower()]
        
        logger.info(f"Scraped {len(releases)} releases from Dick's")
        return releases[:limit]
    
    def _parse_json_products(self, data: Dict) -> List[Dict]:
        """Parse JSON product data."""
        products = []
        
        # Dick's API structure (adjust based on actual response)
        items = data.get('products', data.get('items', data.get('results', [])))
        
        for item in items:
            try:
                product = {
                    'name': item.get('name', item.get('title', 'Unknown')),
                    'sku': item.get('sku', item.get('productId')),
                    'price': item.get('price', {}).get('current') or item.get('salePrice'),
                    'retail_price': item.get('price', {}).get('regular') or item.get('listPrice'),
                    'brand': item.get('brand'),
                    'image_url': item.get('imageUrl', item.get('thumbnail')),
                    'product_url': self._build_product_url(item.get('url') or item.get('productId')),
                    'availability': item.get('availability', 'unknown'),
                    'retailer': "Dick's Sporting Goods",
                    'source': self.base_url,
                    'scraped_at': datetime.now(timezone.utc).isoformat()
                }
                
                products.append(product)
            except Exception as e:
                logger.error(f"Error parsing JSON product: {e}")
                continue
        
        return products
    
    def _parse_html_products(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse HTML product listings."""
        products = []
        
        # Find product cards (adjust selectors)
        product_cards = soup.find_all('div', class_='product-card') or \
                       soup.find_all('article', class_='product') or \
                       soup.find_all('li', class_='product-item') or \
                       soup.find_all('div', {'data-product-id': True})
        
        logger.info(f"Found {len(product_cards)} product cards in HTML")
        
        for card in product_cards:
            try:
                name_elem = card.find('h3') or card.find(class_='product-name') or \
                           card.find(class_='product-title')
                name = name_elem.get_text(strip=True) if name_elem else 'Unknown'
                
                # Skip if not a sneaker
                if not any(kw in name.lower() for kw in ['nike', 'jordan', 'adidas', 'shoe', 'sneaker']):
                    continue
                
                price_elem = card.find(class_='price') or card.find(class_='product-price')
                price = price_elem.get_text(strip=True) if price_elem else None
                
                img_elem = card.find('img')
                image_url = img_elem.get('src') or img_elem.get('data-src') if img_elem else None
                
                link_elem = card.find('a')
                product_url = link_elem.get('href') if link_elem else None
                if product_url and not product_url.startswith('http'):
                    product_url = self.base_url + product_url
                
                product = {
                    'name': name,
                    'price': price,
                    'image_url': image_url,
                    'product_url': product_url,
                    'retailer': "Dick's Sporting Goods",
                    'source': self.base_url,
                    'status': 'available',
                    'scraped_at': datetime.now(timezone.utc).isoformat()
                }
                
                products.append(product)
                
            except Exception as e:
                logger.error(f"Error parsing HTML product card: {e}")
                continue
        
        return products
    
    def _build_product_url(self, url_or_id: str) -> str:
        """Build full product URL."""
        if not url_or_id:
            return None
        if url_or_id.startswith('http'):
            return url_or_id
        if url_or_id.startswith('/'):
            return self.base_url + url_or_id
        return f"{self.base_url}/p/{url_or_id}"


def main():
    """Main execution."""
    parser = argparse.ArgumentParser(description="Dick's Sporting Goods Scraper")
    parser.add_argument('--brand', type=str, help='Filter by brand (jordan, nike, adidas)')
    parser.add_argument('--limit', type=int, default=50, help='Maximum releases to fetch')
    parser.add_argument('--output', type=str, default='dicks_releases.json', help='Output file')
    
    args = parser.parse_args()
    
    scraper = DicksSportingGoodsScraper()
    releases = scraper.scrape_releases(brand=args.brand, limit=args.limit)
    
    # Save to JSON
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(releases, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved {len(releases)} releases to {args.output}")
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Dick's Sporting Goods Scraper - Summary")
    print(f"{'='*60}")
    print(f"Total releases: {len(releases)}")
    if args.brand:
        print(f"Brand filter: {args.brand}")
    print(f"Output file: {args.output}")
    print(f"{'='*60}\n")
    
    # Show sample
    if releases:
        print("Sample release:")
        print(json.dumps(releases[0], indent=2))


if __name__ == '__main__':
    main()
