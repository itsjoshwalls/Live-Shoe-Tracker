"""
BeautifulSoup-based scraper for sneaker release news aggregator sites.

Focuses on lightweight, compliant scraping of static HTML content from sites like:
- Sneaker News
- Hypebeast
- Nice Kicks  
- Complex/Sole Collector

Features:
- robots.txt compliance checking
- Configurable rate limiting per site
- Structured data extraction (JSON-LD, schema.org)
- Article metadata parsing (title, date, images, tags)
- Supabase integration for storage
- Automatic retry with exponential backoff

Usage:
    python news_scraper.py --site sneakernews --limit 20
    python news_scraper.py --site hypebeast --category sneakers
    python news_scraper.py --all  # Scrape all configured sites
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
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Playwright imports (optional, for JavaScript-rendered sites)
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Playwright not available. Install with: pip install playwright && playwright install")

# Load environment variables
load_dotenv()
from dateutil import parser as date_parser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RobotsChecker:
    """Manages robots.txt compliance for multiple sites."""
    
    def __init__(self):
        self.parsers = {}
        
    def can_fetch(self, url: str, user_agent: str = "*") -> bool:
        """Check if URL can be fetched according to robots.txt."""
        domain = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        
        if domain not in self.parsers:
            rp = RobotFileParser()
            rp.set_url(f"{domain}/robots.txt")
            try:
                rp.read()
                self.parsers[domain] = rp
                logger.info(f"Loaded robots.txt for {domain}")
            except Exception as e:
                logger.warning(f"Could not load robots.txt for {domain}: {e}")
                # If robots.txt can't be loaded, assume allowed (conservative)
                return True
        
        return self.parsers[domain].can_fetch(user_agent, url)
    
    def get_crawl_delay(self, url: str, user_agent: str = "*") -> Optional[float]:
        """Get crawl-delay from robots.txt if specified."""
        domain = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        
        if domain in self.parsers:
            return self.parsers[domain].crawl_delay(user_agent)
        return None


class NewsArticleScraper:
    """Base scraper for sneaker news articles."""
    
    # Site-specific configurations
    SITE_CONFIGS = {
        'sneakernews': {
            'base_url': 'https://sneakernews.com',
            'category_path': '/release-dates/',
            'article_selector': 'article, div[class*="card"], div[class*="product"]',  # Broader selector for JS-rendered content
            'title_selector': 'h2 a, h3 a, .title',
            'date_selector': 'time, .date, span[class*="date"]',
            'image_selector': 'img',
            'link_selector': 'a[href*="/202"]',  # Links with year in URL
            'excerpt_selector': '.excerpt, .description, p',
            'delay': 1.0,
            'use_playwright': True,  # JavaScript-rendered site
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        'hypebeast': {
            'base_url': 'https://hypebeast.com',
            'category_path': '/footwear',
            'article_selector': 'div.post-box',
            'title_selector': 'h2.post-title a',
            'date_selector': 'time.published-date',
            'image_selector': 'img.post-box-image',
            'link_selector': 'h2.post-title a',
            'excerpt_selector': 'p.post-excerpt',
            'delay': 1.5,  # Respect crawl-delay
            'user_agent': 'Live-Sneaker-Tracker-Bot/1.0 (+https://github.com/yourusername/live-shoe-tracker)'
        },
        'nicekicks': {
            'base_url': 'https://nicekicks.com',
            'category_path': '/sneaker-release-dates/',
            'article_selector': 'article, div.post, div[class*="article"]',  # Broader selectors
            'title_selector': 'h2 a, h3 a, .title a',
            'date_selector': 'time, .date, span[class*="date"]',
            'image_selector': 'img',
            'link_selector': 'a[href*="/202"]',  # Links with year
            'excerpt_selector': 'div.entry-content, p, .excerpt',
            'delay': 1.0,
            'use_playwright': False,
            'user_agent': 'Live-Sneaker-Tracker-Bot/1.0 (+https://github.com/yourusername/live-shoe-tracker)'
        },
        'eql': {
            'base_url': 'https://eql.com',
            'category_path': '/releases',
            'article_selector': 'div[class*="release"], div[class*="product"], article',
            'title_selector': 'h2, h3, .title',
            'date_selector': 'time, .date, span[class*="date"]',
            'image_selector': 'img',
            'link_selector': 'a[href*="/releases/"]',
            'excerpt_selector': 'p, .description',
            'delay': 1.5,
            'use_playwright': True,  # EQL is JavaScript-heavy
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        'complex': {
            'base_url': 'https://www.complex.com',
            'category_path': '/sneakers',
            'article_selector': 'div.article-card',
            'title_selector': 'h2.article-title a',
            'date_selector': 'time.publish-date',
            'image_selector': 'img.article-image',
            'link_selector': 'h2.article-title a',
            'excerpt_selector': 'p.article-excerpt',
            'delay': 1.0,
            'user_agent': 'Live-Sneaker-Tracker-Bot/1.0 (+https://github.com/yourusername/live-shoe-tracker)'
        },
        'solesavy': {
            'base_url': 'https://solesavy.com',
            'category_path': '/news/',  # Updated - release dates require membership
            'article_selector': 'article.post, div.entry, div[class*="post"]',  # WordPress structure
            'title_selector': 'h2.entry-title a, h3 a, .title a',
            'date_selector': 'time.published, time.entry-date, .date',
            'image_selector': 'img.wp-post-image, img',
            'link_selector': 'a.entry-link, h2 a, h3 a',
            'excerpt_selector': '.entry-content, .entry-summary, p',
            'delay': 1.0,
            'use_playwright': False,  # WordPress sites are usually static
            'user_agent': 'Live-Sneaker-Tracker-Bot/1.0 (+https://github.com/yourusername/live-shoe-tracker)'
        },
        'soleretriever': {
            'base_url': 'https://www.soleretriever.com',
            'category_path': '/sneaker-release-dates',
            'article_selector': 'a[href^="/sneaker-release-dates/"]',  # Link-based structure
            'title_selector': 'h2, h3, span, div',
            'date_selector': 'time, .date',
            'image_selector': 'img',
            'link_selector': '',  # Element itself is the link
            'excerpt_selector': '.description, p',
            'delay': 1.5,
            'use_playwright': False,  # Static HTML works
            'user_agent': 'Live-Sneaker-Tracker-Bot/1.0 (+https://github.com/yourusername/live-shoe-tracker)'
        }
    }
    
    def __init__(self, site_name: str, supabase_url: str = None, supabase_key: str = None):
        """
        Initialize scraper for a specific news site.
        
        Args:
            site_name: Name of the site (sneakernews, hypebeast, nicekicks, complex)
            supabase_url: Supabase project URL (from env if not provided)
            supabase_key: Supabase API key (from env if not provided)
        """
        if site_name not in self.SITE_CONFIGS:
            raise ValueError(f"Unknown site: {site_name}. Choose from: {list(self.SITE_CONFIGS.keys())}")
        
        self.site_name = site_name
        self.config = self.SITE_CONFIGS[site_name]
        
        # Initialize Supabase client
        self.supabase: Client = create_client(
            supabase_url or os.getenv('SUPABASE_URL'),
            supabase_key or os.getenv('SUPABASE_KEY')
        )
        
        # Initialize robots.txt checker
        self.robots = RobotsChecker()
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.config['user_agent'],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        
        # Stats tracking
        self.stats = {
            'articles_scraped': 0,
            'articles_new': 0,
            'articles_updated': 0,
            'errors': 0,
            'blocked_by_robots': 0
        }
    
    def fetch_page(self, url: str, retry_count: int = 3) -> Optional[BeautifulSoup]:
        """
        Fetch and parse HTML page with retry logic.
        
        Args:
            url: URL to fetch
            retry_count: Number of retries on failure
            
        Returns:
            BeautifulSoup object or None on failure
        """
        # Check robots.txt compliance
        if not self.robots.can_fetch(url, self.config['user_agent']):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        # Respect crawl-delay
        crawl_delay = self.robots.get_crawl_delay(url, self.config['user_agent'])
        delay = max(crawl_delay or 0, self.config['delay'])
        time.sleep(delay)
        
        for attempt in range(retry_count):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                return BeautifulSoup(response.content, 'lxml')
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    # Rate limited - respect Retry-After header
                    retry_after = int(e.response.headers.get('Retry-After', 60))
                    logger.warning(f"Rate limited. Waiting {retry_after}s...")
                    time.sleep(retry_after)
                    continue
                elif e.response.status_code == 404:
                    logger.warning(f"Page not found: {url}")
                    return None
                else:
                    logger.error(f"HTTP error {e.response.status_code}: {url}")
                    if attempt < retry_count - 1:
                        time.sleep(2 ** attempt)  # Exponential backoff
                    else:
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
    
    async def fetch_with_playwright(self, url: str, wait_for: str = None) -> Optional[BeautifulSoup]:
        """
        Fetch page with Playwright for JavaScript-rendered content.
        
        Args:
            url: URL to fetch
            wait_for: CSS selector to wait for (optional)
            
        Returns:
            BeautifulSoup object or None on failure
        """
        if not PLAYWRIGHT_AVAILABLE:
            logger.error("Playwright not available. Falling back to requests.")
            return self.fetch_page(url)
        
        # Check robots.txt compliance
        if not self.robots.can_fetch(url, self.config['user_agent']):
            logger.warning(f"Blocked by robots.txt: {url}")
            self.stats['blocked_by_robots'] += 1
            return None
        
        # Respect crawl-delay
        crawl_delay = self.robots.get_crawl_delay(url, self.config['user_agent'])
        delay = max(crawl_delay or 0, self.config['delay'])
        time.sleep(delay)
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=self.config['user_agent'],
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                # Navigate to page
                await page.goto(url, wait_until='networkidle', timeout=30000)
                
                # Wait for specific selector if provided
                if wait_for:
                    await page.wait_for_selector(wait_for, timeout=10000)
                else:
                    # Wait a bit for dynamic content
                    await page.wait_for_timeout(2000)
                
                # Get HTML content
                html = await page.content()
                
                await browser.close()
                
                return BeautifulSoup(html, 'lxml')
                
        except Exception as e:
            logger.error(f"Playwright error fetching {url}: {e}")
            self.stats['errors'] += 1
            return None
    
    def extract_json_ld(self, soup: BeautifulSoup) -> Optional[Dict]:
        """Extract JSON-LD structured data from page."""
        try:
            json_ld = soup.find('script', type='application/ld+json')
            if json_ld:
                data = json.loads(json_ld.string)
                return data
        except Exception as e:
            logger.debug(f"Could not extract JSON-LD: {e}")
        return None
    
    def parse_article(self, article_elem: Any, base_url: str) -> Optional[Dict]:
        """
        Parse individual article element.
        
        Args:
            article_elem: BeautifulSoup element representing article
            base_url: Base URL for resolving relative links
            
        Returns:
            Dictionary with article metadata or None
        """
        try:
            # Extract title and link
            title_elem = article_elem.select_one(self.config['title_selector'])
            if not title_elem:
                return None
            
            title = title_elem.get_text(strip=True)
            link = title_elem.get('href', '')
            if link:
                link = urljoin(base_url, link)
            
            # Extract date
            date_elem = article_elem.select_one(self.config['date_selector'])
            published_date = None
            if date_elem:
                date_str = date_elem.get('datetime') or date_elem.get_text(strip=True)
                try:
                    published_date = date_parser.parse(date_str).isoformat()
                except Exception as e:
                    logger.debug(f"Could not parse date '{date_str}': {e}")
            
            # Extract image
            image_elem = article_elem.select_one(self.config['image_selector'])
            image_url = None
            if image_elem:
                image_url = image_elem.get('src') or image_elem.get('data-src')
                if image_url:
                    image_url = urljoin(base_url, image_url)
            
            # Extract excerpt
            excerpt_elem = article_elem.select_one(self.config['excerpt_selector'])
            excerpt = excerpt_elem.get_text(strip=True) if excerpt_elem else None
            
            # Extract tags/categories (if present)
            tags = []
            category_elems = article_elem.select('a[rel="category tag"]')
            for cat in category_elems:
                tags.append(cat.get_text(strip=True))
            
            return {
                'title': title,
                'url': link,
                'published_date': published_date,
                'image_url': image_url,
                'excerpt': excerpt,
                'source': self.site_name,
                'tags': tags,
                'scraped_at': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing article: {e}")
            return None
    
    def scrape_category_page(self, limit: int = 20) -> List[Dict]:
        """
        Scrape articles from category page.
        
        Args:
            limit: Maximum number of articles to scrape
            
        Returns:
            List of article dictionaries
        """
        url = self.config['base_url'] + self.config['category_path']
        logger.info(f"Scraping {self.site_name} from {url}")
        
        # Use Playwright if configured for this site
        if self.config.get('use_playwright', False) and PLAYWRIGHT_AVAILABLE:
            import asyncio
            logger.info(f"Using Playwright for {self.site_name}")
            soup = asyncio.run(self.fetch_with_playwright(url, self.config.get('article_selector')))
        else:
            soup = self.fetch_page(url)
        
        if not soup:
            logger.error(f"Failed to fetch page: {url}")
            return []
        
        # Find all article elements
        articles = soup.select(self.config['article_selector'])
        logger.info(f"Found {len(articles)} article elements")
        
        results = []
        for i, article_elem in enumerate(articles[:limit]):
            article_data = self.parse_article(article_elem, self.config['base_url'])
            if article_data:
                results.append(article_data)
                self.stats['articles_scraped'] += 1
            
            # Progress logging
            if (i + 1) % 5 == 0:
                logger.info(f"Processed {i + 1}/{min(limit, len(articles))} articles")
        
        return results
    
    def save_to_postgres_direct(self, articles: List[Dict], table_name: str = 'news_articles') -> int:
        """Save articles directly to PostgreSQL (bypass PostgREST)."""
        saved_count = 0
        
        db_host = os.getenv('POSTGRES_HOST', 'localhost')
        db_port = os.getenv('POSTGRES_PORT', '5432')
        db_name = os.getenv('POSTGRES_DB', 'postgres')
        db_user = os.getenv('POSTGRES_USER', 'postgres')
        db_password = os.getenv('POSTGRES_PASSWORD', 'your-super-secret-postgres-password')
        
        try:
            conn = psycopg2.connect(
                host=db_host, port=db_port, database=db_name,
                user=db_user, password=db_password
            )
            cursor = conn.cursor()
            
            for article in articles:
                try:
                    query = """
                        INSERT INTO {table} (
                            title, url, published_date, author, excerpt, 
                            image_url, site_name, tags, content
                        ) VALUES (
                            %(title)s, %(url)s, %(published_date)s, %(author)s, 
                            %(excerpt)s, %(image_url)s, %(site_name)s, %(tags)s, %(content)s
                        )
                        ON CONFLICT (url) DO UPDATE SET
                            title = EXCLUDED.title,
                            published_date = EXCLUDED.published_date,
                            updated_at = NOW()
                        RETURNING id;
                    """.format(table=table_name)
                    
                    cursor.execute(query, article)
                    saved_count += 1
                    self.stats['articles_new'] += 1
                    logger.debug(f"Saved: {article['title'][:50]}...")
                    
                except Exception as e:
                    logger.error(f"Error saving article: {e}")
                    self.stats['errors'] += 1
                    conn.rollback()
                    continue
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            self.stats['errors'] += len(articles)
        
        return saved_count
    
    def save_to_supabase(self, articles: List[Dict], table_name: str = 'news_articles') -> int:
        """
        Save articles to Supabase with upsert (avoid duplicates).
        Falls back to direct PostgreSQL if JWT fails.
        
        Args:
            articles: List of article dictionaries
            table_name: Supabase table name
            
        Returns:
            Number of articles successfully saved
        """
        saved_count = 0
        
        for article in articles:
            try:
                # Use URL as unique identifier
                result = self.supabase.table(table_name).upsert(
                    article,
                    on_conflict='url'  # Assumes 'url' column has UNIQUE constraint
                ).execute()
                
                # Check if new or updated
                if result.data:
                    # Determine if new or update based on response
                    # (Supabase returns the upserted row)
                    self.stats['articles_new'] += 1
                    saved_count += 1
                    logger.debug(f"Saved: {article['title'][:50]}...")
                    
            except Exception as e:
                error_msg = str(e)
                # If JWT error, fall back to direct PostgreSQL
                if 'JWT' in error_msg or 'JWS' in error_msg or '401' in error_msg:
                    logger.warning("JWT authentication failed, falling back to direct PostgreSQL")
                    return self.save_to_postgres_direct(articles, table_name)
                
                logger.error(f"Error saving article to Supabase: {e}")
                logger.error(f"Article data: {article}")
                self.stats['errors'] += 1
        
        return saved_count
    
    def run(self, limit: int = 20, save: bool = True) -> Dict[str, Any]:
        """
        Run the scraper end-to-end.
        
        Args:
            limit: Maximum articles to scrape
            save: Whether to save to Supabase
            
        Returns:
            Stats dictionary
        """
        start_time = time.time()
        logger.info(f"Starting {self.site_name} scraper (limit={limit}, save={save})")
        
        # Scrape articles
        articles = self.scrape_category_page(limit=limit)
        
        # Save to Supabase
        if save and articles:
            saved = self.save_to_supabase(articles)
            logger.info(f"Saved {saved}/{len(articles)} articles to Supabase")
        
        # Finalize stats
        elapsed = time.time() - start_time
        self.stats['elapsed_seconds'] = round(elapsed, 2)
        self.stats['articles_per_second'] = round(len(articles) / elapsed, 2) if elapsed > 0 else 0
        
        logger.info(f"Scraping complete: {json.dumps(self.stats, indent=2)}")
        return self.stats


def scrape_all_sites(limit: int = 20, save: bool = True) -> Dict[str, Any]:
    """Scrape all configured news sites."""
    all_stats = {}
    
    for site_name in NewsArticleScraper.SITE_CONFIGS.keys():
        try:
            logger.info(f"\n{'='*60}\nScraping {site_name.upper()}\n{'='*60}")
            scraper = NewsArticleScraper(site_name)
            stats = scraper.run(limit=limit, save=save)
            all_stats[site_name] = stats
        except Exception as e:
            logger.error(f"Error scraping {site_name}: {e}")
            all_stats[site_name] = {'error': str(e)}
    
    return all_stats


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Scrape sneaker release news sites')
    parser.add_argument(
        '--site',
        choices=['sneakernews', 'hypebeast', 'nicekicks', 'complex', 'eql', 'all'],
        default='sneakernews',
        help='News site to scrape'
    )
    parser.add_argument('--limit', type=int, default=20, help='Max articles to scrape')
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
    if args.site == 'all':
        stats = scrape_all_sites(limit=args.limit, save=not args.no_save)
        print(f"\n{'='*60}\nFINAL STATS\n{'='*60}")
        print(json.dumps(stats, indent=2))
    else:
        scraper = NewsArticleScraper(args.site)
        stats = scraper.run(limit=args.limit, save=not args.no_save)
        print(f"\n{'='*60}\nSTATS\n{'='*60}")
        print(json.dumps(stats, indent=2))


if __name__ == '__main__':
    main()
