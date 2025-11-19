"""
JD Sports Scraper - Multi-Region (US + UK)

JD Sports is a tier-1 global sneaker retailer with 200+ locations.
Major presence in UK, US, and EU markets with exclusive releases.

robots.txt: https://www.jdsports.com/robots.txt
Status: ✅ Check compliance per region

Supported Regions:
- US: https://www.jdsports.com/us/
- UK: https://www.jdsports.co.uk/
- EU: Various country-specific domains

Features:
- Launch calendar (upcoming releases)
- Raffle system integration
- Size availability tracking
- Multi-region pricing

Usage:
    python jdsports_scraper.py --region us --limit 50
    python jdsports_scraper.py --region uk --limit 50
    python jdsports_scraper.py --region all
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from urllib.robotparser import RobotFileParser

load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('jdsports_scraper')


def safe_request(method: str, url: str, **kwargs) -> Optional[requests.Response]:
    """Make a safe HTTP request with error handling."""
    try:
        kwargs.setdefault('timeout', 30)
        kwargs.setdefault('headers', {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response = requests.request(method, url, **kwargs)
        response.raise_for_status()
        return response
    except Exception as e:
        logger.error(f"Request failed for {url}: {e}")
        return None


def respect_robots_txt(base_url: str, path: str) -> bool:
    """Check if path is allowed by robots.txt."""
    try:
        robots_url = urljoin(base_url, '/robots.txt')
        rp = RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        return rp.can_fetch('*', path)
    except Exception as e:
        logger.warning(f"Could not read robots.txt: {e}")
        return True  # Allow if robots.txt not accessible

# Region-specific configurations
REGIONS = {
    'us': {
        'base_url': 'https://www.jdsports.com/us/',
        'launches_url': 'https://www.jdsports.com/us/product/launches/',
        'api_endpoint': 'https://www.jdsports.com/api/products/launches',
        'country_code': 'US',
        'currency': 'USD'
    },
    'uk': {
        'base_url': 'https://www.jdsports.co.uk/',
        'launches_url': 'https://www.jdsports.co.uk/product/launches/',
        'api_endpoint': 'https://www.jdsports.co.uk/api/products/launches',
        'country_code': 'GB',
        'currency': 'GBP'
    }
}


class JDSportsScraper:
    """Scraper for JD Sports releases and inventory."""
    
    def __init__(self, region: str = 'us', supabase_url: str = None, supabase_key: str = None):
        """Initialize scraper with region configuration."""
        if region not in REGIONS:
            raise ValueError(f"Region '{region}' not supported. Choose from: {list(REGIONS.keys())}")
        
        self.region = region
        self.config = REGIONS[region]
        self.base_url = self.config['base_url']
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        logger.info(f"Initialized JD Sports scraper for region: {region.upper()}")
    
    def scrape_launches(self, limit: int = 50) -> List[Dict]:
        """
        Scrape upcoming launches from JD Sports.
        
        Args:
            limit: Maximum number of releases to fetch
        
        Returns:
            List of release dictionaries
        """
        logger.info(f"Scraping JD Sports {self.region.upper()} launches (limit={limit})")
        
        # Check robots.txt compliance
        if not respect_robots_txt(self.base_url, self.config['launches_url']):
            logger.error(f"robots.txt blocks access to {self.config['launches_url']}")
            return []
        
        releases = []
        
        # Try API endpoint first (faster and more reliable)
        try:
            api_data = self._fetch_api_launches(limit)
            if api_data:
                releases = api_data
                logger.info(f"Fetched {len(releases)} releases from API")
                return releases
        except Exception as e:
            logger.warning(f"API fetch failed: {e}. Falling back to HTML scraping.")
        
        # Fallback to HTML scraping
        try:
            html_data = self._scrape_html_launches(limit)
            releases = html_data
            logger.info(f"Scraped {len(releases)} releases from HTML")
        except Exception as e:
            logger.error(f"HTML scraping failed: {e}")
        
        return releases
    
    def _fetch_api_launches(self, limit: int) -> List[Dict]:
        """Fetch launches from JD Sports API (if available)."""
        api_url = self.config['api_endpoint']
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
        
        params = {
            'limit': limit,
            'offset': 0
        }
        
        response = safe_request('GET', api_url, headers=headers, params=params)
        
        if not response:
            raise Exception("API request failed")
        
        data = response.json()
        releases = []
        
        # Parse API response (adjust structure based on actual API)
        products = data.get('products', []) or data.get('data', [])
        
        for product in products[:limit]:
            release = self._parse_api_product(product)
            if release:
                releases.append(release)
        
        return releases
    
    def _scrape_html_launches(self, limit: int) -> List[Dict]:
        """Scrape launches from HTML page."""
        url = self.config['launches_url']
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = safe_request('GET', url, headers=headers)
        
        if not response:
            raise Exception("HTML request failed")
        
        soup = BeautifulSoup(response.content, 'html.parser')
        releases = []
        
        # Find product cards (adjust selectors based on actual HTML structure)
        product_cards = soup.find_all('div', class_='productListItem') or \
                       soup.find_all('article', class_='product') or \
                       soup.find_all('div', {'data-productid': True})
        
        for card in product_cards[:limit]:
            release = self._parse_html_product(card)
            if release:
                releases.append(release)
        
        return releases
    
    def _parse_api_product(self, product: Dict) -> Optional[Dict]:
        """Parse product data from API response."""
        try:
            return {
                'name': product.get('name', 'Unknown'),
                'brand': product.get('brand', 'Unknown'),
                'sku': product.get('sku') or product.get('styleCode', 'N/A'),
                'price': float(product.get('price', {}).get('value', 0)),
                'currency': self.config['currency'],
                'release_date': product.get('releaseDate') or product.get('launchDate'),
                'image_url': product.get('imageUrl') or product.get('image'),
                'product_url': urljoin(self.base_url, product.get('url', '')),
                'retailer': f"JD Sports {self.region.upper()}",
                'region': self.config['country_code'],
                'status': self._determine_status(product),
                'sizes_available': product.get('sizes', []),
                'source': 'jdsports_api',
                'scraped_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing API product: {e}")
            return None
    
    def _parse_html_product(self, card) -> Optional[Dict]:
        """Parse product data from HTML element."""
        try:
            # Extract name
            name_elem = card.find('h3') or card.find(class_='productTitle') or card.find(class_='title')
            name = name_elem.get_text(strip=True) if name_elem else 'Unknown'
            
            # Extract price
            price_elem = card.find(class_='price') or card.find(class_='productPrice')
            price_text = price_elem.get_text(strip=True) if price_elem else '0'
            price = float(''.join(filter(str.isdigit, price_text.split('.')[0]))) if price_text else 0
            
            # Extract image
            img_elem = card.find('img')
            image_url = img_elem.get('src') or img_elem.get('data-src') if img_elem else None
            
            # Extract product URL
            link_elem = card.find('a')
            product_url = urljoin(self.base_url, link_elem.get('href')) if link_elem else None
            
            # Extract SKU from URL or data attribute
            sku = card.get('data-productid') or card.get('data-sku') or 'N/A'
            
            return {
                'name': name,
                'brand': self._extract_brand(name),
                'sku': sku,
                'price': price,
                'currency': self.config['currency'],
                'release_date': None,  # Extract from page if available
                'image_url': image_url,
                'product_url': product_url,
                'retailer': f"JD Sports {self.region.upper()}",
                'region': self.config['country_code'],
                'status': 'upcoming',
                'sizes_available': [],
                'source': 'jdsports_html',
                'scraped_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing HTML product: {e}")
            return None
    
    def _extract_brand(self, name: str) -> str:
        """Extract brand from product name."""
        brands = ['Nike', 'Jordan', 'Adidas', 'Yeezy', 'New Balance', 'Puma', 'Reebok', 'Asics']
        name_upper = name.upper()
        
        for brand in brands:
            if brand.upper() in name_upper:
                return brand
        
        return 'Unknown'
    
    def _determine_status(self, product: Dict) -> str:
        """Determine release status from product data."""
        status = product.get('status', '').lower()
        
        if 'available' in status or 'in stock' in status:
            return 'available'
        elif 'coming soon' in status or 'upcoming' in status:
            return 'upcoming'
        elif 'sold out' in status or 'out of stock' in status:
            return 'sold_out'
        else:
            return 'upcoming'


def main():
    """Main scraper execution."""
    parser = argparse.ArgumentParser(description='JD Sports Scraper')
    parser.add_argument('--region', type=str, default='us', choices=['us', 'uk', 'all'],
                       help='Region to scrape (us, uk, or all)')
    parser.add_argument('--limit', type=int, default=50,
                       help='Maximum number of releases to fetch')
    parser.add_argument('--output', type=str, default='jdsports_releases.json',
                       help='Output JSON file')
    
    args = parser.parse_args()
    
    all_releases = []
    regions = ['us', 'uk'] if args.region == 'all' else [args.region]
    
    for region in regions:
        scraper = JDSportsScraper(region=region)
        releases = scraper.scrape_launches(limit=args.limit)
        all_releases.extend(releases)
        
        logger.info(f"Region {region.upper()}: {len(releases)} releases")
    
    # Save to JSON
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(all_releases, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved {len(all_releases)} total releases to {args.output}")
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"JD Sports Scraper - Summary")
    print(f"{'='*60}")
    print(f"Regions scraped: {', '.join([r.upper() for r in regions])}")
    print(f"Total releases: {len(all_releases)}")
    print(f"Output file: {args.output}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
