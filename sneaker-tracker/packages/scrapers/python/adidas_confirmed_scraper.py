"""
adidas Confirmed App Scraper
Scrapes exclusive releases from adidas Confirmed (web version)
WARNING: Requires account authentication for full data access
"""

import asyncio
from typing import List, Dict, Any
from datetime import datetime
import json

from base_scraper import BaseSneakerScraper
from playwright.async_api import Page

class AdidasConfirmedScraper(BaseSneakerScraper):
    """
    Adidas Confirmed scraper for exclusive releases (Yeezy, limited collabs)
    
    Features:
    - Raffle detection
    - Release calendar scraping
    - Size availability tracking
    - Multi-region support (US, EU, Asia)
    """
    
    REGIONS = {
        "US": "https://www.adidas.com/us/confirmed-app-releases",
        "EU": "https://www.adidas.com/gb/confirmed-app-releases",
        "DE": "https://www.adidas.com/de/confirmed-app-releases"
    }
    
    def __init__(self, region: str = "US"):
        self.region = region
        base_url = self.REGIONS.get(region, self.REGIONS["US"])
        
        super().__init__(
            scraper_name=f"adidas_confirmed_{region.lower()}",
            base_url=base_url,
            supabase_table="sneaker_releases",
            headless=True
        )
    
    async def scrape_releases(self, page: Page) -> List[Dict[str, Any]]:
        """Scrape Confirmed app releases"""
        releases = []
        
        try:
            # Navigate to Confirmed releases page
            self.logger.info(f"Loading Confirmed releases for {self.region}")
            await page.goto(self.base_url, wait_until="networkidle", timeout=30000)
            
            # Wait for product grid
            await page.wait_for_selector('[data-auto-id="product-card"]', timeout=10000)
            
            # Extract product cards
            products = await page.query_selector_all('[data-auto-id="product-card"]')
            self.logger.info(f"Found {len(products)} product cards")
            
            for product in products:
                try:
                    release_data = await self._extract_product_data(page, product)
                    if release_data:
                        releases.append(release_data)
                        
                except Exception as e:
                    self.logger.warning(f"Failed to extract product: {e}")
                    continue
            
            # Alternative: Try API endpoint
            if len(releases) == 0:
                self.logger.info("Trying API endpoint...")
                releases = await self._fetch_via_api(page)
            
        except Exception as e:
            self.logger.error(f"Confirmed scraping failed: {e}")
        
        return releases
    
    async def _extract_product_data(self, page: Page, product_el) -> Dict[str, Any]:
        """Extract data from a single product card"""
        # Product name
        name_el = await product_el.query_selector('[data-auto-id="product-name"]')
        name = await name_el.inner_text() if name_el else None
        
        if not name:
            return None
        
        # Price
        price_el = await product_el.query_selector('[data-auto-id="product-price"]')
        price_text = await price_el.inner_text() if price_el else None
        
        # Image
        image_el = await product_el.query_selector('img')
        image_url = await image_el.get_attribute('src') if image_el else None
        
        # Product link
        link_el = await product_el.query_selector('a')
        product_url = await link_el.get_attribute('href') if link_el else None
        
        # Release type (raffle, FCFS, etc.)
        release_type_el = await product_el.query_selector('[data-auto-id="release-type"]')
        release_type = await release_type_el.inner_text() if release_type_el else "unknown"
        
        # Release date
        date_el = await product_el.query_selector('[data-auto-id="release-date"]')
        date_text = await date_el.inner_text() if date_el else None
        
        # Extract style code from URL or name
        style_code = self._extract_style_code(product_url, name)
        
        return {
            "shoe_name": name.strip(),
            "style_code": style_code,
            "retail_price": self._parse_price(price_text),
            "image_url": image_url,
            "product_url": f"https://www.adidas.com{product_url}" if product_url and product_url.startswith('/') else product_url,
            "brand": "Adidas",
            "status": self._determine_status(release_type, date_text),
            "scraped_url": self.base_url,
            "release_type": release_type.lower(),
            "release_date": self._parse_date(date_text),
            "region": self.region,
            "is_raffle": "raffle" in release_type.lower() or "draw" in release_type.lower()
        }
    
    async def _fetch_via_api(self, page: Page) -> List[Dict[str, Any]]:
        """
        Fallback: Try to fetch releases via adidas API
        Note: May require authentication
        """
        releases = []
        
        try:
            # Intercept API calls
            api_data = await page.evaluate("""
                () => {
                    // Look for window.__INITIAL_STATE__ or similar
                    if (window.__INITIAL_STATE__) {
                        return window.__INITIAL_STATE__;
                    }
                    return null;
                }
            """)
            
            if api_data and "products" in api_data:
                for product in api_data["products"]:
                    releases.append({
                        "shoe_name": product.get("name"),
                        "style_code": product.get("productCode") or product.get("sku"),
                        "retail_price": product.get("price"),
                        "image_url": product.get("image"),
                        "product_url": product.get("url"),
                        "brand": "Adidas",
                        "status": product.get("availabilityStatus", "upcoming"),
                        "scraped_url": self.base_url
                    })
        
        except Exception as e:
            self.logger.warning(f"API fetch failed: {e}")
        
        return releases
    
    def _extract_style_code(self, url: str, name: str) -> str:
        """Extract style code from URL or name"""
        # Try URL first
        if url:
            parts = url.split('/')
            for part in parts:
                if part and len(part) > 5 and any(c.isdigit() for c in part):
                    return part
        
        # Try to find in name (format: NAME - CODE)
        if ' - ' in name:
            potential_code = name.split(' - ')[-1].strip()
            if len(potential_code) < 20:  # Reasonable style code length
                return potential_code
        
        return None
    
    def _determine_status(self, release_type: str, date_text: str) -> str:
        """Determine release status from type and date"""
        if not release_type:
            return "upcoming"
        
        release_type_lower = release_type.lower()
        
        if "available now" in release_type_lower or "buy now" in release_type_lower:
            return "available"
        elif "sold out" in release_type_lower or "closed" in release_type_lower:
            return "sold_out"
        else:
            return "upcoming"
    
    def _parse_date(self, date_text: str) -> str:
        """Parse release date to ISO format"""
        if not date_text:
            return None
        
        # Adidas uses formats like "Dec 15" or "Available Now"
        # This would need proper date parsing logic
        # For now, return as-is
        return date_text
    
    def normalize_release(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Override to add Confirmed-specific fields"""
        normalized = super().normalize_release(raw_data)
        
        # Add Confirmed-specific fields
        normalized["release_type"] = raw_data.get("release_type", "standard")
        normalized["is_raffle"] = raw_data.get("is_raffle", False)
        normalized["region"] = raw_data.get("region", self.region)
        
        return normalized


# Multi-region scraper
async def scrape_all_regions():
    """Scrape all Confirmed regions"""
    all_stats = {}
    
    for region in ["US", "EU", "DE"]:
        print(f"\n🌍 Scraping {region} region...")
        scraper = AdidasConfirmedScraper(region=region)
        stats = await scraper.run()
        all_stats[region] = stats
        
        # Delay between regions
        await asyncio.sleep(5)
    
    # Print summary
    print(f"\n✅ All Regions Complete!")
    for region, stats in all_stats.items():
        print(f"{region}: {stats['releases_found']} found, {stats['releases_inserted']} inserted")


# Example usage
async def main():
    import sys
    
    region = sys.argv[1].upper() if len(sys.argv) > 1 else "US"
    
    if region == "ALL":
        await scrape_all_regions()
    else:
        scraper = AdidasConfirmedScraper(region=region)
        stats = await scraper.run()
        
        print(f"\n✅ adidas Confirmed ({region}) Scraping Complete!")
        print(f"Releases Found: {stats['releases_found']}")
        print(f"Releases Inserted: {stats['releases_inserted']}")
        print(f"Errors: {stats['errors']}")


if __name__ == "__main__":
    asyncio.run(main())
