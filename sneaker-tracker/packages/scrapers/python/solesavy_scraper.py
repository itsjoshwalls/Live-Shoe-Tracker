"""
SoleSavy Scraper - Hybrid BeautifulSoup + Playwright

SoleSavy is a premium sneaker membership platform with release calendars,
raffles, and news. Uses BeautifulSoup for static pages and Playwright for
dynamic content (raffle pages, member-only sections).

robots.txt: https://solesavy.com/robots.txt
Status: ✅ Allowed (WordPress-based, only blocks /wp-admin/)

Features:
- Release calendar scraping
- Raffle information (dates, entry links, retailers)
- News articles (buying guides, release info)
- Store directory (retailers with raffle entries)
- Hybrid scraping (BeautifulSoup + Playwright)

Usage:
    python solesavy_scraper.py --mode releases --limit 50
    python solesavy_scraper.py --mode news --limit 20
    python solesavy_scraper.py --mode stores
    python solesavy_scraper.py --mode all
"""

import os
import sys
import time
import json
import logging
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dateutil import parser as date_parser
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Playwright imports (optional, for dynamic content)
try:
    from playwright.async_api import async_playwright, Page, Browser
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logging.warning("Playwright not installed. Some features will be limited.")

import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SoleSavyScraper:
    """Hybrid scraper for SoleSavy platform."""
    
    BASE_URL = "https://solesavy.com"
    USER_AGENT = "Live-Sneaker-Tracker-Bot/1.0 (+https://github.com/yourusername/live-shoe-tracker)"
    
    # Site structure
    URLS = {
        'releases': 'https://solesavy.com/news/',  # Main public news feed (releases previously required membership)
        'news': 'https://solesavy.com/news/',
        'raffles': 'https://solesavy.com/news/',  # Raffle info now in news articles
        'stores': 'https://solesavy.com/news/',
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
            'news_scraped': 0,
            'stores_scraped': 0,
            'errors': 0,
            'blocked_by_robots': 0
        }
    
    def can_fetch(self, url: str) -> bool:
        """Check if URL can be fetched."""
        return self.robot_parser.can_fetch(self.USER_AGENT, url)
    
    def fetch_page(self, url: str, retry_count: int = 3) -> Optional[BeautifulSoup]:
        """Fetch page with BeautifulSoup."""
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        time.sleep(1.0)  # Rate limiting
        
        for attempt in range(retry_count):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return BeautifulSoup(response.content, 'lxml')
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    retry_after = int(e.response.headers.get('Retry-After', 60))
                    logger.warning(f"Rate limited. Waiting {retry_after}s...")
                    time.sleep(retry_after)
                    continue
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
        """Fetch page with Playwright (for dynamic content)."""
        if not PLAYWRIGHT_AVAILABLE:
            logger.error("Playwright not available. Use: pip install playwright && playwright install")
            return None
        
        if not self.can_fetch(url):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        try:
            await page.goto(url, wait_until='networkidle', timeout=30000)
            await page.wait_for_timeout(2000)  # Additional wait for JS
            return await page.content()
        except Exception as e:
            logger.error(f"Playwright error for {url}: {e}")
            self.stats['errors'] += 1
            return None
    
    def scrape_releases(self, limit: int = 50) -> List[Dict]:
        """Scrape release calendar (BeautifulSoup)."""
        logger.info("Scraping release calendar...")
        url = self.URLS['releases']
        soup = self.fetch_page(url)
        
        if not soup:
            return []
        
        releases = []
        
        # SoleSavy uses a grid layout with release cards
        # Adjust selectors based on actual HTML structure
        release_cards = soup.select('div.release-card, article.release, div.product-card')[:limit]
        
        logger.info(f"Found {len(release_cards)} release cards")
        
        for card in release_cards:
            try:
                # Extract title
                title_elem = card.select_one('h2, h3, .title, .product-name')
                title = title_elem.get_text(strip=True) if title_elem else None
                
                # Extract link
                link_elem = card.select_one('a[href]')
                link = urljoin(self.BASE_URL, link_elem['href']) if link_elem else None
                
                # Extract image
                img_elem = card.select_one('img')
                image_url = None
                if img_elem:
                    image_url = img_elem.get('src') or img_elem.get('data-src')
                    if image_url:
                        image_url = urljoin(self.BASE_URL, image_url)
                
                # Extract release date
                date_elem = card.select_one('.release-date, .date, time')
                release_date = None
                if date_elem:
                    date_str = date_elem.get('datetime') or date_elem.get_text(strip=True)
                    try:
                        release_date = date_parser.parse(date_str).isoformat()
                    except:
                        pass
                
                # Extract price
                price_elem = card.select_one('.price, .retail-price')
                price = price_elem.get_text(strip=True) if price_elem else None
                
                # Extract SKU/style code
                sku_elem = card.select_one('.sku, .style-code')
                sku = sku_elem.get_text(strip=True) if sku_elem else None
                
                if title and link:
                    releases.append({
                        'title': title,
                        'url': link,
                        'image_url': image_url,
                        'release_date': release_date,
                        'price': price,
                        'sku': sku,
                        'source': 'solesavy',
                        'type': 'release',
                        'scraped_at': datetime.now(timezone.utc).isoformat()
                    })
                    self.stats['releases_scraped'] += 1
                    
            except Exception as e:
                logger.error(f"Error parsing release card: {e}")
                self.stats['errors'] += 1
        
        return releases
    
    def scrape_news(self, limit: int = 20) -> List[Dict]:
        """Scrape news articles (BeautifulSoup)."""
        logger.info("Scraping news articles...")
        url = self.URLS['news']
        soup = self.fetch_page(url)
        
        if not soup:
            return []
        
        articles = []
        
        # WordPress blog structure
        article_cards = soup.select('article.post, div.article-card, div.post-item')[:limit]
        
        logger.info(f"Found {len(article_cards)} news articles")
        
        for card in article_cards:
            try:
                # Title
                title_elem = card.select_one('h2 a, h3 a, .entry-title a')
                title = title_elem.get_text(strip=True) if title_elem else None
                link = urljoin(self.BASE_URL, title_elem['href']) if title_elem and title_elem.get('href') else None
                
                # Date
                date_elem = card.select_one('time, .posted-on, .entry-date')
                published_date = None
                if date_elem:
                    date_str = date_elem.get('datetime') or date_elem.get_text(strip=True)
                    try:
                        published_date = date_parser.parse(date_str).isoformat()
                    except:
                        pass
                
                # Image
                img_elem = card.select_one('img')
                image_url = None
                if img_elem:
                    image_url = img_elem.get('src') or img_elem.get('data-src')
                    if image_url:
                        image_url = urljoin(self.BASE_URL, image_url)
                
                # Excerpt
                excerpt_elem = card.select_one('.entry-summary, .excerpt, p')
                excerpt = excerpt_elem.get_text(strip=True)[:300] if excerpt_elem else None
                
                # Categories/tags
                tags = []
                tag_elems = card.select('a[rel="tag"], .category a, .tag a')
                for tag in tag_elems:
                    tags.append(tag.get_text(strip=True))
                
                if title and link:
                    articles.append({
                        'title': title,
                        'url': link,
                        'published_date': published_date,
                        'image_url': image_url,
                        'excerpt': excerpt,
                        'tags': tags,
                        'source': 'solesavy',
                        'type': 'news',
                        'scraped_at': datetime.now(timezone.utc).isoformat()
                    })
                    self.stats['news_scraped'] += 1
                    
            except Exception as e:
                logger.error(f"Error parsing news article: {e}")
                self.stats['errors'] += 1
        
        return articles
    
    async def scrape_raffles_playwright(self, limit: int = 30) -> List[Dict]:
        """Scrape raffle information (Playwright for dynamic content)."""
        if not PLAYWRIGHT_AVAILABLE:
            logger.warning("Playwright not available. Skipping raffles.")
            return []
        
        logger.info("Scraping raffles (Playwright)...")
        raffles = []
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            html = await self.fetch_page_playwright(self.URLS['raffles'], page)
            if not html:
                await browser.close()
                return []
            
            soup = BeautifulSoup(html, 'lxml')
            
            # Raffle cards (likely loaded via JS)
            raffle_cards = soup.select('div.raffle-card, div.raffle-item, article.raffle')[:limit]
            
            logger.info(f"Found {len(raffle_cards)} raffles")
            
            for card in raffle_cards:
                try:
                    # Title/product
                    title_elem = card.select_one('h2, h3, .title')
                    title = title_elem.get_text(strip=True) if title_elem else None
                    
                    # Link
                    link_elem = card.select_one('a[href]')
                    link = urljoin(self.BASE_URL, link_elem['href']) if link_elem else None
                    
                    # Entry deadline
                    deadline_elem = card.select_one('.deadline, .entry-date, time')
                    deadline = None
                    if deadline_elem:
                        date_str = deadline_elem.get('datetime') or deadline_elem.get_text(strip=True)
                        try:
                            deadline = date_parser.parse(date_str).isoformat()
                        except:
                            pass
                    
                    # Retailer
                    retailer_elem = card.select_one('.retailer, .store')
                    retailer = retailer_elem.get_text(strip=True) if retailer_elem else None
                    
                    # Status
                    status_elem = card.select_one('.status')
                    status = status_elem.get_text(strip=True) if status_elem else 'active'
                    
                    if title:
                        raffles.append({
                            'title': title,
                            'url': link,
                            'entry_deadline': deadline,
                            'retailer': retailer,
                            'status': status,
                            'source': 'solesavy',
                            'type': 'raffle',
                            'scraped_at': datetime.now(timezone.utc).isoformat()
                        })
                        
                except Exception as e:
                    logger.error(f"Error parsing raffle: {e}")
                    self.stats['errors'] += 1
            
            await browser.close()
        
        return raffles
    
    def save_to_supabase(self, items: List[Dict], table_name: str = 'solesavy_data') -> int:
        """Save items to Supabase."""
        saved_count = 0
        
        for item in items:
            try:
                result = self.supabase.table(table_name).upsert(
                    item,
                    on_conflict='url'
                ).execute()
                
                if result.data:
                    saved_count += 1
                    logger.debug(f"Saved: {item.get('title', '')[:50]}")
                    
            except Exception as e:
                logger.error(f"Error saving to Supabase: {e}")
                self.stats['errors'] += 1
        
        return saved_count
    
    async def run_async(self, mode: str = 'all', limit: int = 50, save: bool = True) -> Dict[str, Any]:
        """Run scraper asynchronously."""
        start_time = time.time()
        logger.info(f"Starting SoleSavy scraper (mode={mode}, limit={limit})")
        
        all_items = []
        
        # Scrape based on mode
        if mode in ('releases', 'all'):
            releases = self.scrape_releases(limit=limit)
            all_items.extend(releases)
            logger.info(f"Scraped {len(releases)} releases")
        
        if mode in ('news', 'all'):
            news = self.scrape_news(limit=limit)
            all_items.extend(news)
            logger.info(f"Scraped {len(news)} news articles")
        
        if mode in ('raffles', 'all') and PLAYWRIGHT_AVAILABLE:
            raffles = await self.scrape_raffles_playwright(limit=limit)
            all_items.extend(raffles)
            logger.info(f"Scraped {len(raffles)} raffles")
        
        # Save to Supabase
        if save and all_items:
            saved = self.save_to_supabase(all_items)
            logger.info(f"Saved {saved}/{len(all_items)} items to Supabase")
        
        # Finalize stats
        elapsed = time.time() - start_time
        self.stats['total_items'] = len(all_items)
        self.stats['elapsed_seconds'] = round(elapsed, 2)
        self.stats['items_per_second'] = round(len(all_items) / elapsed, 2) if elapsed > 0 else 0
        
        logger.info(f"Scraping complete: {json.dumps(self.stats, indent=2)}")
        return self.stats
    
    def run(self, mode: str = 'all', limit: int = 50, save: bool = True) -> Dict[str, Any]:
        """Run scraper synchronously."""
        return asyncio.run(self.run_async(mode=mode, limit=limit, save=save))


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='SoleSavy scraper (hybrid BeautifulSoup + Playwright)')
    parser.add_argument(
        '--mode',
        choices=['releases', 'news', 'raffles', 'all'],
        default='all',
        help='What to scrape'
    )
    parser.add_argument('--limit', type=int, default=50, help='Max items per category')
    parser.add_argument('--no-save', action='store_true', help='Dry run (don\'t save to DB)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate environment
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_KEY'):
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_KEY")
        sys.exit(1)
    
    # Run scraper
    scraper = SoleSavyScraper()
    stats = scraper.run(mode=args.mode, limit=args.limit, save=not args.no_save)
    
    print(f"\n{'='*60}\nSTATS\n{'='*60}")
    print(json.dumps(stats, indent=2))


if __name__ == '__main__':
    main()
