"""
News Aggregator - RSS Feed Integration

Aggregates sneaker news from multiple sources:
- Sole Collector
- Hypebeast
- Highsnobiety
- Nice Kicks
- Complex Sneakers
- SneakerNews
- Kicks On Fire

Usage:
    python news_aggregator.py --limit 50
    python news_aggregator.py --source hypebeast --limit 10
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Optional

import feedparser
import requests
from dotenv import load_dotenv

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    create_client = None  # Avoid undefined error

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('news_aggregator')


NEWS_SOURCES = {
    'complex_sneakers': {
        'name': 'Complex Sneakers',
        'rss': 'https://www.complex.com/feeds/channel/sneakers',
        'category': 'pop_culture',
        'weight': 0.9
    },
    'hypebeast_sneakers': {
        'name': 'Hypebeast Sneakers',
        'rss': 'https://hypebeast.com/feed',
        'category': 'streetwear',
        'weight': 0.9
    },
    'highsnobiety': {
        'name': 'Highsnobiety Sneakers',
        'rss': 'https://www.highsnobiety.com/feed/',
        'category': 'fashion',
        'weight': 0.8
    },
    'nice_kicks': {
        'name': 'Nice Kicks',
        'rss': 'https://www.nicekicks.com/feed/',
        'category': 'sneaker_news',
        'weight': 1.0
    },
    'complex_sneakers': {
        'name': 'Complex Sneakers',
        'rss': 'https://www.complex.com/sneakers/rss',
        'category': 'pop_culture',
        'weight': 0.9
    },
    'sneaker_news': {
        'name': 'SneakerNews',
        'rss': 'https://sneakernews.com/feed/',
        'category': 'sneaker_news',
        'weight': 1.0
    },
    'kicks_on_fire': {
        'name': 'Kicks On Fire',
        'rss': 'https://www.kicksonfire.com/feed/',
        'category': 'sneaker_news',
        'weight': 0.8
    }
}


class NewsAggregator:
    """RSS news feed aggregator for sneaker news."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def fetch_all_news(self, limit: int = 50, source: str = None) -> List[Dict]:
        """
        Fetch news from all sources or specific source.
        
        Args:
            limit: Maximum articles per source
            source: Specific source to fetch from (optional)
        
        Returns:
            List of news article dictionaries
        """
        logger.info(f"Fetching news (source={source}, limit={limit})")
        
        all_articles = []
        sources_to_fetch = {source: NEWS_SOURCES[source]} if source and source in NEWS_SOURCES else NEWS_SOURCES
        
        for source_id, config in sources_to_fetch.items():
            try:
                articles = self._fetch_rss_feed(config, limit)
                all_articles.extend(articles)
                logger.info(f"Fetched {len(articles)} articles from {config['name']}")
            except Exception as e:
                logger.error(f"Error fetching {config['name']}: {e}")
                continue
        
        # Sort by publish date (newest first)
        all_articles.sort(key=lambda x: x.get('published_at', ''), reverse=True)
        
        logger.info(f"Total articles fetched: {len(all_articles)}")
        return all_articles
    
    def _fetch_rss_feed(self, config: Dict, limit: int) -> List[Dict]:
        """Fetch and parse RSS feed."""
        articles = []
        
        try:
            logger.info(f"Fetching RSS feed: {config['rss']}")
            feed = feedparser.parse(config['rss'])
            
            for entry in feed.entries[:limit]:
                article = {
                    'title': entry.get('title', 'Untitled'),
                    'link': entry.get('link'),
                    'summary': entry.get('summary', entry.get('description', '')),
                    'published_at': self._parse_date(entry.get('published', entry.get('pubDate'))),
                    'author': entry.get('author', config['name']),
                    'source': config['name'],
                    'category': config['category'],
                    'weight': config['weight'],
                    'image_url': self._extract_image(entry),
                    'tags': self._extract_tags(entry),
                    'scraped_at': datetime.now(timezone.utc).isoformat()
                }
                
                articles.append(article)
                
        except Exception as e:
            logger.error(f"Error parsing RSS feed {config['rss']}: {e}")
        
        return articles
    
    def _parse_date(self, date_str: str) -> str:
        """Parse various date formats to ISO format."""
        if not date_str:
            return datetime.now(timezone.utc).isoformat()
        
        try:
            from dateutil import parser
            dt = parser.parse(date_str)
            return dt.isoformat()
        except:
            return date_str
    
    def _extract_image(self, entry: Dict) -> Optional[str]:
        """Extract image URL from RSS entry."""
        # Try multiple fields
        if hasattr(entry, 'media_content') and entry.media_content:
            return entry.media_content[0].get('url')
        
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            return entry.media_thumbnail[0].get('url')
        
        if hasattr(entry, 'enclosures') and entry.enclosures:
            for enc in entry.enclosures:
                if 'image' in enc.get('type', ''):
                    return enc.get('href')
        
        # Parse from summary HTML
        if hasattr(entry, 'summary'):
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(entry.summary, 'html.parser')
            img = soup.find('img')
            if img:
                return img.get('src')
        
        return None
    
    def _extract_tags(self, entry: Dict) -> List[str]:
        """Extract tags from RSS entry."""
        tags = []
        
        if hasattr(entry, 'tags'):
            tags = [tag.get('term', tag.get('label', '')) for tag in entry.tags]
        
        if hasattr(entry, 'category'):
            if isinstance(entry.category, list):
                tags.extend(entry.category)
            else:
                tags.append(entry.category)
        
        return [t for t in tags if t]  # Filter empty tags


def main():
    """Main execution."""
    parser = argparse.ArgumentParser(description='Sneaker News Aggregator')
    parser.add_argument('--source', type=str, choices=list(NEWS_SOURCES.keys()),
                       help='Specific news source to fetch')
    parser.add_argument('--limit', type=int, default=50, help='Maximum articles per source')
    parser.add_argument('--output', type=str, default='news.json', help='Output file')
    parser.add_argument('--supabase', action='store_true', help='Write to Supabase instead of JSON')
    
    args = parser.parse_args()
    
    aggregator = NewsAggregator()
    articles = aggregator.fetch_all_news(limit=args.limit, source=args.source)
    
    # Save to Supabase if requested
    if args.supabase and SUPABASE_AVAILABLE:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if supabase_url and supabase_key:
            try:
                supabase = create_client(supabase_url, supabase_key)
                response = supabase.table('news_articles').upsert(articles, on_conflict='link').execute()
                logger.info(f"Upserted {len(articles)} articles to Supabase")
            except Exception as e:
                logger.error(f"Supabase upsert error: {e}")
        else:
            logger.warning("SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Skipping Supabase write.")
    
    # Save to JSON
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved {len(articles)} articles to {args.output}")
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"News Aggregator - Summary")
    print(f"{'='*60}")
    print(f"Total articles: {len(articles)}")
    if args.source:
        print(f"Source filter: {args.source}")
    print(f"Output file: {args.output}")
    
    # Category breakdown
    categories = {}
    for article in articles:
        cat = article.get('category', 'unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"\nArticles by category:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")
    
    print(f"{'='*60}\n")
    
    # Show sample
    if articles:
        print("Latest article:")
        sample = articles[0]
        print(f"  Title: {sample['title']}")
        print(f"  Source: {sample['source']}")
        print(f"  Published: {sample['published_at']}")
        print(f"  Link: {sample['link']}")


if __name__ == '__main__':
    main()
