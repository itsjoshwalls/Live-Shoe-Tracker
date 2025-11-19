"""
Base Playwright Scraper for Sneaker Releases
Provides foundation for all Playwright-Python scrapers
"""

import asyncio
import os
from typing import List, Dict, Optional, Any
from datetime import datetime
from abc import ABC, abstractmethod

from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from dotenv import load_dotenv
from supabase import create_client, Client
from fake_useragent import UserAgent
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class BaseSneakerScraper(ABC):
    """
    Abstract base class for all sneaker scrapers
    
    Features:
    - Playwright browser automation with stealth
    - Supabase database integration
    - Rate limiting & retry logic
    - Structured logging
    - Anti-detection measures
    """
    
    def __init__(
        self,
        scraper_name: str,
        base_url: str,
        supabase_table: str = "sneaker_releases",
        headless: bool = True
    ):
        self.scraper_name = scraper_name
        self.base_url = base_url
        self.supabase_table = supabase_table
        self.headless = headless
        
        # Initialize logger
        self.logger = logging.getLogger(scraper_name)
        
        # Supabase client
        self.supabase: Optional[Client] = self._init_supabase()
        
        # User agent rotation
        self.ua = UserAgent()
        
        # Scraping stats
        self.stats = {
            "started_at": datetime.utcnow().isoformat(),
            "releases_found": 0,
            "releases_inserted": 0,
            "errors": 0
        }
    
    def _init_supabase(self) -> Optional[Client]:
        """Initialize Supabase client"""
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        
        if not url or not key:
            self.logger.warning("Supabase credentials not found. Database writes disabled.")
            return None
        
        try:
            client = create_client(url, key)
            self.logger.info("Supabase client initialized")
            return client
        except Exception as e:
            self.logger.error(f"Supabase init failed: {e}")
            return None
    
    async def launch_browser(self) -> tuple[Browser, BrowserContext]:
        """Launch Playwright browser with anti-detection measures"""
        playwright = await async_playwright().start()
        
        browser_args = [
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
        
        # Add proxy if configured
        proxy_config = None
        if os.getenv("PROXY_SERVER"):
            proxy_config = {
                "server": os.getenv("PROXY_SERVER"),
                "username": os.getenv("PROXY_USERNAME"),
                "password": os.getenv("PROXY_PASSWORD")
            }
        
        browser = await playwright.chromium.launch(
            headless=self.headless,
            args=browser_args,
            proxy=proxy_config
        )
        
        context = await browser.new_context(
            user_agent=self.ua.random,
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="America/New_York"
        )
        
        # Anti-detection script injection
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => false});
            window.chrome = {runtime: {}};
            Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
            Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
        """)
        
        self.logger.info(f"Browser launched (headless={self.headless})")
        return browser, context
    
    async def create_page(self, context: BrowserContext) -> Page:
        """Create a new page with standard configuration"""
        page = await context.new_page()
        
        # Set extra headers
        await page.set_extra_http_headers({
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1"
        })
        
        return page
    
    @abstractmethod
    async def scrape_releases(self, page: Page) -> List[Dict[str, Any]]:
        """
        Main scraping logic - must be implemented by subclasses
        
        Returns:
            List of release dictionaries with schema:
            {
                "shoe_name": str,
                "release_date": str (ISO format or parseable),
                "retail_price": float,
                "style_code": str,
                "image_url": str,
                "product_url": str,
                "brand": str,
                "status": str ("available", "sold_out", "upcoming"),
                "scraped_url": str
            }
        """
        pass
    
    def normalize_release(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize raw scrape data to standard schema
        Override this method for custom normalization
        """
        return {
            "shoe_name": raw_data.get("shoe_name", "").strip(),
            "release_date": raw_data.get("release_date"),
            "retail_price": self._parse_price(raw_data.get("retail_price")),
            "style_code": raw_data.get("style_code"),
            "image_url": raw_data.get("image_url"),
            "product_url": raw_data.get("product_url"),
            "brand": raw_data.get("brand", "Unknown"),
            "status": raw_data.get("status", "upcoming"),
            "scraped_url": raw_data.get("scraped_url", self.base_url),
            "scraper_name": self.scraper_name,
            "scraped_at": datetime.utcnow().isoformat()
        }
    
    def _parse_price(self, price_str: Any) -> Optional[float]:
        """Parse price string to float"""
        if price_str is None:
            return None
        
        if isinstance(price_str, (int, float)):
            return float(price_str)
        
        # Remove currency symbols and whitespace
        cleaned = str(price_str).replace('$', '').replace(',', '').replace('€', '').replace('£', '').strip()
        
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None
    
    async def insert_to_supabase(self, releases: List[Dict[str, Any]]) -> int:
        """
        Insert releases to Supabase with upsert logic
        
        Returns:
            Number of successfully inserted/updated records
        """
        if not self.supabase:
            self.logger.warning("Supabase not configured. Skipping database writes.")
            return 0
        
        if not releases:
            self.logger.info("No releases to insert")
            return 0
        
        # Normalize all releases
        normalized = [self.normalize_release(r) for r in releases]
        
        try:
            # Upsert with conflict resolution on (shoe_name, style_code)
            response = self.supabase.table(self.supabase_table).upsert(
                normalized,
                on_conflict="shoe_name,style_code"
            ).execute()
            
            count = len(response.data) if response.data else 0
            self.logger.info(f"Inserted/updated {count} records to Supabase")
            return count
            
        except Exception as e:
            self.logger.error(f"Supabase insert failed: {e}")
            self.stats["errors"] += 1
            return 0
    
    async def run(self) -> Dict[str, Any]:
        """
        Main execution method
        
        Returns:
            Stats dictionary with execution metrics
        """
        self.logger.info(f"Starting scraper: {self.scraper_name}")
        
        browser = None
        context = None
        
        try:
            browser, context = await self.launch_browser()
            page = await self.create_page(context)
            
            # Navigate to base URL
            self.logger.info(f"Navigating to {self.base_url}")
            await page.goto(self.base_url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait for network idle
            await page.wait_for_load_state("networkidle", timeout=10000)
            
            # Execute scraping logic
            releases = await self.scrape_releases(page)
            self.stats["releases_found"] = len(releases)
            
            # Insert to database
            inserted = await self.insert_to_supabase(releases)
            self.stats["releases_inserted"] = inserted
            
        except Exception as e:
            self.logger.error(f"Scraper failed: {e}", exc_info=True)
            self.stats["errors"] += 1
            
        finally:
            if context:
                await context.close()
            if browser:
                await browser.close()
            
            self.stats["completed_at"] = datetime.utcnow().isoformat()
            self.logger.info(f"Scraper completed: {self.stats}")
        
        return self.stats
    
    async def wait_random(self, min_ms: int = 500, max_ms: int = 2000):
        """Random wait to avoid detection"""
        import random
        delay = random.randint(min_ms, max_ms) / 1000
        await asyncio.sleep(delay)


# Example implementation
class ShopifyScraper(BaseSneakerScraper):
    """
    Generic Shopify store scraper using products.json API
    """
    
    def __init__(self, store_name: str, store_url: str, collections: List[str] = None):
        super().__init__(
            scraper_name=f"shopify_{store_name}",
            base_url=store_url
        )
        self.collections = collections or ["footwear", "new-arrivals", "sneakers"]
    
    async def scrape_releases(self, page: Page) -> List[Dict[str, Any]]:
        """Scrape releases using Shopify's products.json API"""
        releases = []
        
        for collection in self.collections:
            try:
                api_url = f"{self.base_url}/collections/{collection}/products.json?limit=250"
                self.logger.info(f"Fetching {api_url}")
                
                response = await page.goto(api_url, wait_until="domcontentloaded")
                
                if response.ok:
                    data = await response.json()
                    
                    if "products" in data:
                        for product in data["products"]:
                            # Filter for sneakers
                            if self._is_sneaker(product):
                                release = {
                                    "shoe_name": product["title"],
                                    "style_code": product.get("variants", [{}])[0].get("sku") or str(product["id"]),
                                    "retail_price": product.get("variants", [{}])[0].get("price"),
                                    "image_url": product.get("images", [{}])[0].get("src"),
                                    "product_url": f"{self.base_url}/products/{product['handle']}",
                                    "brand": self._detect_brand(product["title"], product.get("vendor")),
                                    "status": "available" if any(v.get("available") for v in product.get("variants", [])) else "sold_out",
                                    "scraped_url": api_url
                                }
                                releases.append(release)
                
                await self.wait_random(1000, 3000)
                
            except Exception as e:
                self.logger.error(f"Collection {collection} failed: {e}")
        
        return releases
    
    def _is_sneaker(self, product: Dict) -> bool:
        """Check if product is a sneaker"""
        text = f"{product.get('title', '')} {product.get('product_type', '')} {product.get('vendor', '')}".lower()
        keywords = ["sneaker", "shoe", "trainer", "runner", "boot", "jordan", "nike", "adidas", "yeezy", "new balance", "asics"]
        return any(kw in text for kw in keywords)
    
    def _detect_brand(self, title: str, vendor: str = None) -> str:
        """Detect brand from title/vendor"""
        text = f"{title} {vendor or ''}".lower()
        
        brands = {
            "Nike": ["nike", "air jordan", "jordan"],
            "Adidas": ["adidas", "yeezy"],
            "New Balance": ["new balance"],
            "ASICS": ["asics"],
            "Reebok": ["reebok"],
            "Puma": ["puma"],
            "Vans": ["vans"],
            "Converse": ["converse"]
        }
        
        for brand, keywords in brands.items():
            if any(kw in text for kw in keywords):
                return brand
        
        return vendor or "Unknown"


# CLI Entry Point
async def main():
    """Example usage"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python base_scraper.py <store_name> [store_url]")
        print("Example: python base_scraper.py undefeated https://undefeated.com")
        sys.exit(1)
    
    store_name = sys.argv[1]
    store_url = sys.argv[2] if len(sys.argv) > 2 else f"https://{store_name}.com"
    
    scraper = ShopifyScraper(store_name, store_url)
    stats = await scraper.run()
    
    print(f"\n✅ Scraping Complete!")
    print(f"Releases Found: {stats['releases_found']}")
    print(f"Releases Inserted: {stats['releases_inserted']}")
    print(f"Errors: {stats['errors']}")


if __name__ == "__main__":
    asyncio.run(main())
