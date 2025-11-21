#!/usr/bin/env python3
"""
Supabase Image Scraper - No Firebase Required

Fetches product data from Shopify stores and writes images directly to Supabase.
Uses the Supabase REST API with service role key.

Usage:
    # Set environment variables
    $env:SUPABASE_URL = "https://npvqqzuofwojhbdlozgh.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
    
    python scripts/supabase_image_scraper.py --stores shoe-tracker/scripts/shopify_stores.json

What it does:
    - Reads Shopify store domains from JSON config
    - Fetches /products.json from each store
    - Extracts image URLs from product data
    - Updates existing Supabase releases table with images
    - Creates new records if SKU/name matches
"""
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import List, Dict, Optional

import requests

# Supabase configuration from environment
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: Missing required environment variables:")
    print("  SUPABASE_URL")
    print("  SUPABASE_SERVICE_ROLE_KEY")
    print("\nSet them in PowerShell:")
    print('  $env:SUPABASE_URL = "https://your-project.supabase.co"')
    print('  $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"')
    sys.exit(1)

USER_AGENT = "LiveShoeTracker/2.0 (+https://github.com/itsjoshwalls/Live-Shoe-Tracker)"


def fetch_products_json(domain: str, timeout: int = 15) -> Optional[Dict]:
    """Fetch Shopify products.json endpoint."""
    urls_to_try = [
        f"https://{domain}/products.json?limit=250",
        f"https://{domain}/products.json",
    ]
    headers = {"User-Agent": USER_AGENT}
    
    for url in urls_to_try:
        try:
            resp = requests.get(url, headers=headers, timeout=timeout)
            if resp.status_code == 200:
                return resp.json()
            logging.debug(f"{url} returned {resp.status_code}")
        except Exception as e:
            logging.debug(f"Error fetching {url}: {e}")
    
    return None


def extract_images(product: Dict) -> List[str]:
    """Extract and normalize image URLs from Shopify product."""
    images = []
    
    # Get images from product.images array
    for img in product.get("images", []):
        src = img.get("src")
        if src:
            # Remove query params for deduplication
            clean_url = src.split("?")[0]
            if clean_url not in images:
                images.append(clean_url)
    
    # Also check variants for additional images
    for variant in product.get("variants", []):
        if variant.get("image_id"):
            # Variant references an image ID; already captured above
            continue
    
    return images[:10]  # Cap at 10 images per product


def update_supabase_release(
    product: Dict,
    domain: str,
    images: List[str],
    dry_run: bool = False
) -> bool:
    """Update or insert release record in Supabase with images."""
    title = product.get("title")
    product_id = product.get("id")
    handle = product.get("handle")
    
    if not title:
        logging.warning(f"Skipping product with no title from {domain}")
        return False
    
    # Try to extract SKU
    sku = None
    variants = product.get("variants", [])
    if variants:
        sku = variants[0].get("sku") or variants[0].get("barcode")
    
    # Build the data payload
    payload = {
        "name": title,
        "images": images,
        "retailer": domain,
        "url": f"https://{domain}/products/{handle}" if handle else f"https://{domain}",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if sku:
        payload["sku"] = sku
    
    # Prepare Supabase API request
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    
    endpoint = f"{SUPABASE_URL}/rest/v1/releases"
    
    if dry_run:
        logging.info(f"[DRY RUN] Would upsert: {title} with {len(images)} images")
        return True
    
    try:
        # Use upsert with on_conflict for name or sku
        params = {"on_conflict": "name"}
        response = requests.post(
            endpoint,
            headers=headers,
            json=payload,
            params=params,
            timeout=10
        )
        
        if response.status_code in (200, 201):
            logging.info(f"✓ Updated {title} ({len(images)} images)")
            return True
        else:
            logging.error(f"Failed to update {title}: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logging.error(f"Error updating {title}: {e}")
        return False


def run_scraper(config_path: str, dry_run: bool = False, pause: float = 1.0):
    """Main scraper loop."""
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    
    stores = cfg.get("stores", [])
    if not stores:
        logging.error("No stores found in config")
        return
    
    total_updated = 0
    total_images = 0
    
    for domain in stores:
        logging.info(f"Processing {domain}...")
        
        products_data = fetch_products_json(domain)
        if not products_data:
            logging.info(f"  No products.json available for {domain} (consider Playwright for JS-heavy sites)")
            time.sleep(pause)
            continue
        
        products = products_data.get("products", [])
        logging.info(f"  Found {len(products)} products")
        
        for product in products:
            images = extract_images(product)
            if not images:
                continue
            
            success = update_supabase_release(product, domain, images, dry_run=dry_run)
            if success:
                total_updated += 1
                total_images += len(images)
        
        time.sleep(pause)
    
    logging.info(f"\n{'[DRY RUN] ' if dry_run else ''}Summary:")
    logging.info(f"  Updated {total_updated} releases")
    logging.info(f"  Total images collected: {total_images}")


def main():
    parser = argparse.ArgumentParser(description="Scrape Shopify stores and update Supabase with images")
    parser.add_argument(
        "--stores",
        default="shoe-tracker/scripts/shopify_stores.json",
        help="Path to stores JSON config"
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing")
    parser.add_argument("--pause", type=float, default=1.0, help="Pause between stores (seconds)")
    args = parser.parse_args()
    
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S"
    )
    
    run_scraper(args.stores, dry_run=args.dry_run, pause=args.pause)


if __name__ == "__main__":
    main()
