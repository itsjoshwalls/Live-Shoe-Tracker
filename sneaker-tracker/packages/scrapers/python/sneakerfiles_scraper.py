"""
Sneaker Files Scraper - BeautifulSoup + Playwright hybrid

Scrapes release information from sneakerfiles.com
Features: robots.txt compliance, upsert logic, PostgreSQL fallback

Usage:
    python sneakerfiles_scraper.py --limit 20
    python sneakerfiles_scraper.py --category upcoming --no-save
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

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class SneakerFilesScraper:
    """Scraper for sneakerfiles.com"""
    
    BASE_URL = 'https://www.sneakerfiles.com'
    USER_AGENT = 'Live-Sneaker-Tracker-Bot/1.0'
    
    CATEGORIES = {
        'all': '/',
        'releases': '/category/release-dates/',
        'news': '/category/sneaker-news/',
        'jordan': '/category/air-jordan/',
        'nike': '/category/nike/',
        'adidas': '/category/adidas/',
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
            'articles_scraped': 0,
            'articles_saved': 0,
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
    
    def parse_article(self, article_elem: Any) -> Optional[Dict]:
        """Parse article element."""
        try:
            # Title and URL
            title_elem = article_elem.select_one('h2 a, h3 a, .entry-title a')
            if not title_elem:
                return None
            
            title = title_elem.get_text(strip=True)
            link = title_elem.get('href')
            if not link:
                return None
            
            # Date
            date_elem = article_elem.select_one('time, .published, .entry-date')
            published_date = None
            if date_elem:
                date_str = date_elem.get('datetime') or date_elem.get_text(strip=True)
                try:
                    from dateutil import parser as date_parser
                    published_date = date_parser.parse(date_str).isoformat()
                except:
                    pass
            
            # Image
            image_elem = article_elem.select_one('img')
            image_url = None
            if image_elem:
                image_url = image_elem.get('src') or image_elem.get('data-src')
            
            # Excerpt
            excerpt_elem = article_elem.select_one('.entry-content, p, .excerpt')
            excerpt = excerpt_elem.get_text(strip=True)[:500] if excerpt_elem else None
            
            return {
                'title': title,
                'url': link,
                'published_date': published_date,
                'image_url': image_url,
                'excerpt': excerpt,
                'site_name': 'sneakerfiles',
                'source': 'sneakerfiles'
            }
            
        except Exception as e:
            logger.error(f"Error parsing article: {e}")
            return None
    
    def scrape_category(self, category: str = 'all', limit: int = 20) -> List[Dict]:
        """Scrape articles from category."""
        category_path = self.CATEGORIES.get(category, self.CATEGORIES['all'])
        url = f"{self.BASE_URL}{category_path}"
        
        logger.info(f"Scraping {category} from {url}")
        
        soup = self.fetch_page(url)
        if not soup:
            return []
        
        # Find article elements - Sneaker Files uses WordPress structure
        articles = soup.select('article, div.post, div[class*="article"]')
        logger.info(f"Found {len(articles)} articles")
        
        results = []
        for article in articles[:limit]:
            article_data = self.parse_article(article)
            if article_data:
                results.append(article_data)
                self.stats['articles_scraped'] += 1
        
        return results
    
    def save_to_postgres_direct(self, articles: List[Dict], table_name: str = 'news_articles') -> int:
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
            
            for article in articles:
                try:
                    query = """
                        INSERT INTO {table} (
                            title, url, published_date, image_url, excerpt, site_name, source
                        ) VALUES (
                            %(title)s, %(url)s, %(published_date)s, %(image_url)s, 
                            %(excerpt)s, %(site_name)s, %(source)s
                        )
                        ON CONFLICT (url) DO UPDATE SET
                            title = EXCLUDED.title,
                            published_date = EXCLUDED.published_date,
                            updated_at = NOW()
                        RETURNING id;
                    """.format(table=table_name)
                    
                    cursor.execute(query, article)
                    saved_count += 1
                    self.stats['articles_saved'] += 1
                    
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
        """Save to Supabase with PostgreSQL fallback."""
        for article in articles:
            try:
                result = self.supabase.table(table_name).upsert(article, on_conflict='url').execute()
                if result.data:
                    self.stats['articles_saved'] += 1
            except Exception as e:
                error_msg = str(e)
                if 'JWT' in error_msg or 'JWS' in error_msg or '401' in error_msg:
                    logger.warning("JWT authentication failed, falling back to direct PostgreSQL")
                    return self.save_to_postgres_direct(articles, table_name)
                logger.error(f"Error saving: {e}")
                self.stats['errors'] += 1
        
        return self.stats['articles_saved']
    
    def run(self, category: str = 'all', limit: int = 20, save: bool = True) -> Dict[str, Any]:
        """Run scraper."""
        start_time = time.time()
        
        articles = self.scrape_category(category, limit)
        
        if save and articles:
            saved = self.save_to_supabase(articles)
            logger.info(f"Saved {saved}/{len(articles)} articles")
        
        self.stats['elapsed_seconds'] = round(time.time() - start_time, 2)
        return self.stats


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape Sneaker Files')
    parser.add_argument('--category', default='all', help='Category to scrape')
    parser.add_argument('--limit', type=int, default=20, help='Max articles')
    parser.add_argument('--no-save', action='store_true', help='Dry run')
    
    args = parser.parse_args()
    
    scraper = SneakerFilesScraper()
    stats = scraper.run(category=args.category, limit=args.limit, save=not args.no_save)
    
    print(f"\n{'='*60}\nSTATS\n{'='*60}")
    print(json.dumps(stats, indent=2))
