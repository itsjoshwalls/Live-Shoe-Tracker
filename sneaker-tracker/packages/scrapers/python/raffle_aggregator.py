"""
Raffle Aggregator - Scrape raffle-sneakers.com

Aggregates sneaker raffles from 500+ shops worldwide.
Provides entry deadlines, regions, and direct links.

robots.txt: https://www.raffle-sneakers.com/robots.txt
Status: ✅ Check compliance

Features:
- Active raffles list (500+ shops)
- Entry deadlines and timezones
- Region filtering (US, EU, UK, Asia)
- Store information
- Direct raffle entry links

Usage:
    python raffle_aggregator.py --limit 50
    python raffle_aggregator.py --region US --limit 20
    python raffle_aggregator.py --brand Nike
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

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('raffle_aggregator')


class RaffleAggregator:
    """Scraper for raffle-sneakers.com raffle listings."""
    
    def __init__(self):
        self.base_url = 'https://www.raffle-sneakers.com'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def scrape_raffles(self, limit: int = 50, region: str = None, brand: str = None) -> List[Dict]:
        """
        Scrape active raffles.
        
        Args:
            limit: Maximum number of raffles to fetch
            region: Filter by region (US, EU, UK, Asia)
            brand: Filter by brand (Nike, Adidas, Jordan, etc.)
        
        Returns:
            List of raffle dictionaries
        """
        logger.info(f"Scraping raffles (limit={limit}, region={region}, brand={brand})")
        
        raffles = []
        
        # Try multiple endpoints
        endpoints = [
            '/raffles',
            '/en/raffles',
            '/',  # Homepage often has active raffles
        ]
        
        for endpoint in endpoints:
            url = urljoin(self.base_url, endpoint)
            
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find raffle cards (adjust selectors based on actual HTML)
                raffle_cards = soup.find_all('div', class_='raffle-card') or \
                              soup.find_all('article', class_='raffle') or \
                              soup.find_all('div', {'data-raffle': True})
                
                if not raffle_cards:
                    # Try alternative structure
                    raffle_cards = soup.find_all('div', class_='product-card') or \
                                  soup.find_all('li', class_='raffle-item')
                
                logger.info(f"Found {len(raffle_cards)} raffle cards on {endpoint}")
                
                for card in raffle_cards[:limit]:
                    raffle = self._parse_raffle_card(card)
                    
                    if raffle:
                        # Apply filters
                        if region and raffle.get('region') != region:
                            continue
                        if brand and brand.lower() not in raffle.get('name', '').lower():
                            continue
                        
                        raffles.append(raffle)
                
                if raffles:
                    break  # Found raffles, no need to try other endpoints
                    
            except Exception as e:
                logger.error(f"Error scraping {url}: {e}")
                continue
        
        logger.info(f"Scraped {len(raffles)} raffles")
        return raffles[:limit]
    
    def _parse_raffle_card(self, card) -> Optional[Dict]:
        """Parse a raffle card element into structured data."""
        try:
            # Extract sneaker name
            name_elem = card.find('h3') or card.find(class_='raffle-title') or card.find(class_='product-name')
            name = name_elem.get_text(strip=True) if name_elem else 'Unknown'
            
            # Extract store name
            store_elem = card.find(class_='store-name') or card.find(class_='retailer')
            store = store_elem.get_text(strip=True) if store_elem else 'Unknown'
            
            # Extract deadline
            deadline_elem = card.find(class_='deadline') or card.find(class_='end-date')
            deadline = deadline_elem.get_text(strip=True) if deadline_elem else None
            
            # Extract raffle URL
            link_elem = card.find('a')
            raffle_url = link_elem.get('href') if link_elem else None
            if raffle_url and not raffle_url.startswith('http'):
                raffle_url = urljoin(self.base_url, raffle_url)
            
            # Extract image
            img_elem = card.find('img')
            image_url = img_elem.get('src') or img_elem.get('data-src') if img_elem else None
            
            # Extract region
            region_elem = card.find(class_='region') or card.find(class_='country')
            region = region_elem.get_text(strip=True) if region_elem else 'Global'
            
            # Extract price
            price_elem = card.find(class_='price')
            price_text = price_elem.get_text(strip=True) if price_elem else '0'
            
            return {
                'name': name,
                'store': store,
                'deadline': deadline,
                'raffle_url': raffle_url,
                'image_url': image_url,
                'region': region,
                'price': price_text,
                'type': 'raffle',
                'source': 'raffle-sneakers.com',
                'scraped_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing raffle card: {e}")
            return None


def main():
    """Main execution."""
    parser = argparse.ArgumentParser(description='Raffle Aggregator')
    parser.add_argument('--limit', type=int, default=50, help='Maximum raffles to fetch')
    parser.add_argument('--region', type=str, help='Filter by region (US, EU, UK, Asia)')
    parser.add_argument('--brand', type=str, help='Filter by brand (Nike, Adidas, Jordan)')
    parser.add_argument('--output', type=str, default='raffles.json', help='Output file')
    
    args = parser.parse_args()
    
    scraper = RaffleAggregator()
    raffles = scraper.scrape_raffles(
        limit=args.limit,
        region=args.region,
        brand=args.brand
    )
    
    # Save to JSON
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(raffles, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved {len(raffles)} raffles to {args.output}")
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Raffle Aggregator - Summary")
    print(f"{'='*60}")
    print(f"Total raffles: {len(raffles)}")
    if args.region:
        print(f"Region filter: {args.region}")
    if args.brand:
        print(f"Brand filter: {args.brand}")
    print(f"Output file: {args.output}")
    print(f"{'='*60}\n")
    
    # Show sample
    if raffles:
        print("Sample raffle:")
        print(json.dumps(raffles[0], indent=2))


if __name__ == '__main__':
    main()
