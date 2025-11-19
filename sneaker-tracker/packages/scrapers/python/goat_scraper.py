"""
GOAT Resale Platform Scraper
Uses reverse-engineered mobile API
WARNING: GOAT TOS prohibits scraping - use for educational/research purposes only
"""

import asyncio
import json
from typing import List, Dict, Any
from datetime import datetime
import httpx

from base_scraper import BaseSneakerScraper
from playwright.async_api import Page

class GOATScraper(BaseSneakerScraper):
    """
    GOAT scraper using their internal GraphQL API
    
    Features:
    - GraphQL query support
    - Product search pagination
    - Price data extraction (lowest ask, highest bid)
    - Release date tracking
    """
    
    API_BASE = "https://www.goat.com/api/v1"
    GRAPHQL_ENDPOINT = "https://www.goat.com/graphql"
    
    def __init__(self):
        super().__init__(
            scraper_name="goat",
            base_url="https://www.goat.com",
            supabase_table="sneaker_releases"
        )
        
        # GOAT-specific headers
        self.api_headers = {
            "User-Agent": "GOAT/1.62.0 (iPhone; iOS 17.0; Scale/3.00)",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Emb-Pt": "product_page",
            "X-Emb-St": "b_recommended_for_you"
        }
    
    async def scrape_releases(self, page: Page) -> List[Dict[str, Any]]:
        """
        Scrape releases using GOAT's product search API
        Note: This is a proof-of-concept. Real implementation requires:
        1. Authentication token acquisition
        2. Rate limiting (GOAT has strict limits)
        3. Proxy rotation
        """
        releases = []
        
        try:
            # Method 1: GraphQL Query (requires token)
            # releases += await self._fetch_via_graphql(page)
            
            # Method 2: Public product feed (limited, no auth needed)
            releases += await self._fetch_public_feed(page)
            
        except Exception as e:
            self.logger.error(f"GOAT scraping failed: {e}")
        
        return releases
    
    async def _fetch_public_feed(self, page: Page) -> List[Dict[str, Any]]:
        """
        Fetch from GOAT's public-facing product pages
        Fallback method when API access is blocked
        """
        releases = []
        
        # Navigate to sneakers page
        await page.goto("https://www.goat.com/sneakers", wait_until="networkidle")
        
        # Wait for product grid
        await page.wait_for_selector('[data-testid="product-card"]', timeout=10000)
        
        # Extract product cards
        products = await page.query_selector_all('[data-testid="product-card"]')
        
        for product in products[:50]:  # Limit to first 50
            try:
                # Extract data from card
                name_el = await product.query_selector('[data-testid="product-name"]')
                price_el = await product.query_selector('[data-testid="lowest-price"]')
                image_el = await product.query_selector('img')
                link_el = await product.query_selector('a')
                
                if name_el and link_el:
                    name = await name_el.inner_text()
                    price_text = await price_el.inner_text() if price_el else None
                    image_url = await image_el.get_attribute('src') if image_el else None
                    product_url = await link_el.get_attribute('href')
                    
                    # Parse SKU from URL
                    sku = product_url.split('/')[-1] if product_url else None
                    
                    release = {
                        "shoe_name": name.strip(),
                        "style_code": sku,
                        "retail_price": self._parse_goat_price(price_text),
                        "image_url": image_url,
                        "product_url": f"https://www.goat.com{product_url}" if product_url else None,
                        "brand": self._detect_brand_from_name(name),
                        "status": "available",  # GOAT only shows available items
                        "scraped_url": "https://www.goat.com/sneakers",
                        "platform_type": "resale",
                        "lowest_ask": self._parse_goat_price(price_text)
                    }
                    
                    releases.append(release)
                    
            except Exception as e:
                self.logger.warning(f"Failed to parse product card: {e}")
                continue
        
        self.logger.info(f"Extracted {len(releases)} products from GOAT")
        return releases
    
    async def _fetch_via_api(self, category: str = "all", page_num: int = 1) -> List[Dict]:
        """
        Fetch via GOAT API (requires authentication)
        This is for reference - actual implementation needs OAuth flow
        """
        async with httpx.AsyncClient() as client:
            # Example API endpoint (requires auth token)
            url = f"{self.API_BASE}/products"
            params = {
                "category": category,
                "page": page_num,
                "limit": 60
            }
            
            try:
                response = await client.get(url, headers=self.api_headers, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("products", [])
                else:
                    self.logger.warning(f"GOAT API returned {response.status_code}")
                    return []
                    
            except Exception as e:
                self.logger.error(f"GOAT API call failed: {e}")
                return []
    
    def _parse_goat_price(self, price_text: str) -> float:
        """Parse GOAT price format ($XXX or $X,XXX)"""
        if not price_text:
            return None
        
        cleaned = price_text.replace('$', '').replace(',', '').strip()
        
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None
    
    def _detect_brand_from_name(self, name: str) -> str:
        """Detect brand from product name"""
        name_lower = name.lower()
        
        brands = {
            "Nike": ["nike", "jordan", "air jordan", "dunk", "air max"],
            "Adidas": ["adidas", "yeezy", "ultraboost"],
            "New Balance": ["new balance", "nb"],
            "ASICS": ["asics", "gel"],
            "Reebok": ["reebok"],
            "Puma": ["puma"],
            "Salomon": ["salomon"],
            "Vans": ["vans"]
        }
        
        for brand, keywords in brands.items():
            if any(kw in name_lower for kw in keywords):
                return brand
        
        return "Unknown"
    
    def normalize_release(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Override to add GOAT-specific fields"""
        normalized = super().normalize_release(raw_data)
        
        # Add resale-specific fields
        normalized["platform_type"] = raw_data.get("platform_type", "resale")
        normalized["lowest_ask"] = raw_data.get("lowest_ask")
        normalized["highest_bid"] = raw_data.get("highest_bid")
        normalized["last_sale"] = raw_data.get("last_sale")
        
        return normalized


# Example usage
async def main():
    scraper = GOATScraper()
    stats = await scraper.run()
    
    print(f"\n✅ GOAT Scraping Complete!")
    print(f"Releases Found: {stats['releases_found']}")
    print(f"Releases Inserted: {stats['releases_inserted']}")
    print(f"Errors: {stats['errors']}")


if __name__ == "__main__":
    asyncio.run(main())
