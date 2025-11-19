#!/usr/bin/env python3
"""
Expanded Raffle Scraper - Multi-Boutique Coverage
Monitors raffles from END, SNS, Footpatrol, Size?, Offspring, Undefeated, BAIT, Extra Butter
"""

import os
import sys
import time
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('raffle_scraper')


class RaffleScraper:
    """Multi-boutique raffle monitoring scraper."""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def scrape_end_raffles(self) -> List[Dict]:
        """Scrape END Launches raffles."""
        raffles = []
        try:
            logger.info("Scraping END Launches...")
            res = self.session.get("https://launches.endclothing.com/", timeout=15)
            soup = BeautifulSoup(res.text, "html.parser")
            
            # END uses product cards with raffle info
            for card in soup.select(".product-tile, .launch-card"):
                try:
                    title_elem = card.select_one(".product-tile__title, .launch-title, h3")
                    link_elem = card.select_one("a")
                    
                    if not title_elem or not link_elem:
                        continue
                    
                    title = title_elem.text.strip()
                    url = link_elem.get("href", "")
                    if not url.startswith("http"):
                        url = f"https://launches.endclothing.com{url}"
                    
                    # Extract deadline if visible
                    deadline_elem = card.select_one(".countdown, .deadline, time")
                    deadline = deadline_elem.get("datetime") if deadline_elem else None
                    
                    raffles.append({
                        "name": title,
                        "store": "END",
                        "raffle_url": url,
                        "deadline": deadline,
                        "region": "Global",
                        "sku": None
                    })
                except Exception as e:
                    logger.error(f"Error parsing END card: {e}")
                    continue
            
            logger.info(f"Found {len(raffles)} raffles from END")
        except Exception as e:
            logger.error(f"Error scraping END: {e}")
        
        return raffles
    
    def scrape_sns_raffles(self) -> List[Dict]:
        """Scrape SNS (Sneakersnstuff) raffles."""
        raffles = []
        try:
            logger.info("Scraping SNS raffles...")
            res = self.session.get("https://www.sneakersnstuff.com/en/185/raffle", timeout=15)
            soup = BeautifulSoup(res.text, "html.parser")
            
            for card in soup.select(".product-item, .raffle-item"):
                try:
                    title_elem = card.select_one(".product-item__title, .name, h3")
                    link_elem = card.select_one("a")
                    
                    if not title_elem or not link_elem:
                        continue
                    
                    title = title_elem.text.strip()
                    url = link_elem.get("href", "")
                    if not url.startswith("http"):
                        url = f"https://www.sneakersnstuff.com{url}"
                    
                    raffles.append({
                        "name": title,
                        "store": "SNS",
                        "raffle_url": url,
                        "deadline": None,
                        "region": "Global",
                        "sku": None
                    })
                except Exception as e:
                    logger.error(f"Error parsing SNS card: {e}")
                    continue
            
            logger.info(f"Found {len(raffles)} raffles from SNS")
        except Exception as e:
            logger.error(f"Error scraping SNS: {e}")
        
        return raffles
    
    def scrape_footpatrol_raffles(self) -> List[Dict]:
        """Scrape Footpatrol raffles."""
        raffles = []
        try:
            logger.info("Scraping Footpatrol raffles...")
            res = self.session.get("https://www.footpatrol.com/raffles", timeout=15)
            soup = BeautifulSoup(res.text, "html.parser")
            
            for card in soup.select(".product, .raffle-card"):
                try:
                    title_elem = card.select_one(".productTitle, h3, .name")
                    link_elem = card.select_one("a")
                    
                    if not title_elem or not link_elem:
                        continue
                    
                    title = title_elem.text.strip()
                    url = link_elem.get("href", "")
                    if not url.startswith("http"):
                        url = f"https://www.footpatrol.com{url}"
                    
                    raffles.append({
                        "name": title,
                        "store": "Footpatrol",
                        "raffle_url": url,
                        "deadline": None,
                        "region": "UK",
                        "sku": None
                    })
                except Exception as e:
                    logger.error(f"Error parsing Footpatrol card: {e}")
                    continue
            
            logger.info(f"Found {len(raffles)} raffles from Footpatrol")
        except Exception as e:
            logger.error(f"Error scraping Footpatrol: {e}")
        
        return raffles
    
    def scrape_size_raffles(self) -> List[Dict]:
        """Scrape Size? raffles."""
        raffles = []
        try:
            logger.info("Scraping Size? raffles...")
            res = self.session.get("https://www.size.co.uk/launches/", timeout=15)
            soup = BeautifulSoup(res.text, "html.parser")
            
            for card in soup.select(".product, .launch-item"):
                try:
                    title_elem = card.select_one(".productTitle, h3, .title")
                    link_elem = card.select_one("a")
                    
                    if not title_elem or not link_elem:
                        continue
                    
                    title = title_elem.text.strip()
                    url = link_elem.get("href", "")
                    if not url.startswith("http"):
                        url = f"https://www.size.co.uk{url}"
                    
                    raffles.append({
                        "name": title,
                        "store": "Size?",
                        "raffle_url": url,
                        "deadline": None,
                        "region": "UK",
                        "sku": None
                    })
                except Exception as e:
                    logger.error(f"Error parsing Size? card: {e}")
                    continue
            
            logger.info(f"Found {len(raffles)} raffles from Size?")
        except Exception as e:
            logger.error(f"Error scraping Size?: {e}")
        
        return raffles
    
    def scrape_offspring_raffles(self) -> List[Dict]:
        """Scrape Offspring raffles."""
        raffles = []
        try:
            logger.info("Scraping Offspring raffles...")
            res = self.session.get("https://www.offspring.co.uk/view/category/offspring_catalog/launches.htm", timeout=15)
            soup = BeautifulSoup(res.text, "html.parser")
            
            for card in soup.select(".product, .s-productthumbbox"):
                try:
                    title_elem = card.select_one(".productTitle, h3, .product-name")
                    link_elem = card.select_one("a")
                    
                    if not title_elem or not link_elem:
                        continue
                    
                    title = title_elem.text.strip()
                    url = link_elem.get("href", "")
                    if not url.startswith("http"):
                        url = f"https://www.offspring.co.uk{url}"
                    
                    raffles.append({
                        "name": title,
                        "store": "Offspring",
                        "raffle_url": url,
                        "deadline": None,
                        "region": "UK",
                        "sku": None
                    })
                except Exception as e:
                    logger.error(f"Error parsing Offspring card: {e}")
                    continue
            
            logger.info(f"Found {len(raffles)} raffles from Offspring")
        except Exception as e:
            logger.error(f"Error scraping Offspring: {e}")
        
        return raffles
    
    def scrape_undefeated_raffles(self) -> List[Dict]:
        """Scrape Undefeated raffles."""
        raffles = []
        try:
            logger.info("Scraping Undefeated raffles...")
            res = self.session.get("https://undefeated.com/collections/raffle", timeout=15)
            soup = BeautifulSoup(res.text, "html.parser")
            
            for card in soup.select(".product-item, .grid-item"):
                try:
                    title_elem = card.select_one(".product-item__title, h3")
                    link_elem = card.select_one("a")
                    
                    if not title_elem or not link_elem:
                        continue
                    
                    title = title_elem.text.strip()
                    url = link_elem.get("href", "")
                    if not url.startswith("http"):
                        url = f"https://undefeated.com{url}"
                    
                    raffles.append({
                        "name": title,
                        "store": "Undefeated",
                        "raffle_url": url,
                        "deadline": None,
                        "region": "US",
                        "sku": None
                    })
                except Exception as e:
                    logger.error(f"Error parsing Undefeated card: {e}")
                    continue
            
            logger.info(f"Found {len(raffles)} raffles from Undefeated")
        except Exception as e:
            logger.error(f"Error scraping Undefeated: {e}")
        
        return raffles
    
    def scrape_bait_raffles(self) -> List[Dict]:
        """Scrape BAIT raffles."""
        raffles = []
        try:
            logger.info("Scraping BAIT raffles...")
            res = self.session.get("https://www.baitme.com/collections/raffle", timeout=15)
            soup = BeautifulSoup(res.text, "html.parser")
            
            for card in soup.select(".product-card, .grid-item"):
                try:
                    title_elem = card.select_one(".product-card__title, h3")
                    link_elem = card.select_one("a")
                    
                    if not title_elem or not link_elem:
                        continue
                    
                    title = title_elem.text.strip()
                    url = link_elem.get("href", "")
                    if not url.startswith("http"):
                        url = f"https://www.baitme.com{url}"
                    
                    raffles.append({
                        "name": title,
                        "store": "BAIT",
                        "raffle_url": url,
                        "deadline": None,
                        "region": "US",
                        "sku": None
                    })
                except Exception as e:
                    logger.error(f"Error parsing BAIT card: {e}")
                    continue
            
            logger.info(f"Found {len(raffles)} raffles from BAIT")
        except Exception as e:
            logger.error(f"Error scraping BAIT: {e}")
        
        return raffles
    
    def scrape_extra_butter_raffles(self) -> List[Dict]:
        """Scrape Extra Butter raffles."""
        raffles = []
        try:
            logger.info("Scraping Extra Butter raffles...")
            res = self.session.get("https://shop.extrabutterny.com/collections/raffle", timeout=15)
            soup = BeautifulSoup(res.text, "html.parser")
            
            for card in soup.select(".product, .product-card"):
                try:
                    title_elem = card.select_one(".product-title, h3")
                    link_elem = card.select_one("a")
                    
                    if not title_elem or not link_elem:
                        continue
                    
                    title = title_elem.text.strip()
                    url = link_elem.get("href", "")
                    if not url.startswith("http"):
                        url = f"https://shop.extrabutterny.com{url}"
                    
                    raffles.append({
                        "name": title,
                        "store": "Extra Butter",
                        "raffle_url": url,
                        "deadline": None,
                        "region": "US",
                        "sku": None
                    })
                except Exception as e:
                    logger.error(f"Error parsing Extra Butter card: {e}")
                    continue
            
            logger.info(f"Found {len(raffles)} raffles from Extra Butter")
        except Exception as e:
            logger.error(f"Error scraping Extra Butter: {e}")
        
        return raffles
    
    def upsert_raffles(self, raffles: List[Dict]) -> int:
        """Upsert raffles into Supabase."""
        if not raffles:
            return 0
        
        try:
            # Upsert with conflict resolution on (store, raffle_url)
            response = self.supabase.table("raffles").upsert(
                raffles,
                on_conflict="store,raffle_url"
            ).execute()
            
            count = len(response.data) if response.data else 0
            logger.info(f"Upserted {count} raffles to Supabase")
            return count
        except Exception as e:
            logger.error(f"Error upserting raffles: {e}")
            return 0
    
    def run(self):
        """Run all raffle scrapers."""
        logger.info("Starting raffle scraper run...")
        
        all_raffles = []
        all_raffles.extend(self.scrape_end_raffles())
        all_raffles.extend(self.scrape_sns_raffles())
        all_raffles.extend(self.scrape_footpatrol_raffles())
        all_raffles.extend(self.scrape_size_raffles())
        all_raffles.extend(self.scrape_offspring_raffles())
        all_raffles.extend(self.scrape_undefeated_raffles())
        all_raffles.extend(self.scrape_bait_raffles())
        all_raffles.extend(self.scrape_extra_butter_raffles())
        
        logger.info(f"Total raffles collected: {len(all_raffles)}")
        
        upserted = self.upsert_raffles(all_raffles)
        logger.info(f"Scraper run complete. Upserted: {upserted}")


def main():
    """Main worker loop."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    scrape_interval = int(os.getenv("SCRAPE_INTERVAL", "600"))  # 10 minutes default
    
    if not supabase_url or not supabase_key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
        sys.exit(1)
    
    scraper = RaffleScraper(supabase_url, supabase_key)
    
    logger.info(f"Raffle scraper worker started (interval: {scrape_interval}s)")
    
    while True:
        try:
            scraper.run()
        except Exception as e:
            logger.error(f"Scraper run failed: {e}")
        
        logger.info(f"Sleeping for {scrape_interval} seconds...")
        time.sleep(scrape_interval)


if __name__ == "__main__":
    main()
