#!/usr/bin/env python3
"""
Shopify scraper (server-side)

Usage:
  # set FIREBASE_SERVICE_ACCOUNT env var to the JSON content
  python scripts/shopify_scraper.py --config scripts/shopify_stores.json

What it does:
  - Reads a list of store domains from a JSON config
  - Tries to fetch each store's /products.json (Shopify public endpoint) and parses products
  - Applies heuristics to detect upcoming releases / drops
  - Normalizes product data and upserts a document into Firestore (collection configurable via FIRESTORE_COLLECTION)

Notes / limitations:
  - Many stores are not pure Shopify or may block requests; for JavaScript-heavy sites use a Playwright monitor instead.
  - This scraper is best used server-side with your service account and behind a proxy if needed.
"""
import argparse
import json
import logging
import os
import time
from datetime import datetime, timezone

import requests
from dateutil import parser as dateparser

from firebase_admin import credentials, initialize_app, firestore as fa_firestore


USER_AGENT = "LiveShoeTracker/1.0 (+https://example.com)"
DEFAULT_COLLECTION = os.environ.get("FIRESTORE_COLLECTION", "sneakers")


def init_firebase():
    """Initialize Firebase Admin and return Firestore client (compat layer).

    Uses firebase_admin.firestore client directly to avoid google.auth default
    credential discovery errors when explicit service account JSON is provided.
    """
    sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT") or os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not sa_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT environment variable is not set")
    # If a path is provided instead of raw JSON load file contents
    if os.path.isfile(sa_json):
        with open(sa_json, "r", encoding="utf-8") as f:
            sa_json = f.read()
    try:
        sa = json.loads(sa_json)
    except Exception as e:
        raise RuntimeError(f"FIREBASE_SERVICE_ACCOUNT invalid JSON: {e}")

    cred = credentials.Certificate(sa)
    try:
        initialize_app(cred)
    except ValueError:
        # Already initialized
        pass
    return fa_firestore.client()


def fetch_products_json(domain, timeout=15):
    """Attempt to fetch a Shopify products.json endpoint.

    Returns parsed JSON dict or None on failure.
    """
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
            else:
                logging.debug("%s returned %s", url, resp.status_code)
        except Exception as e:
            logging.debug("Error fetching %s: %s", url, e)
    return None


def detect_release(product):
    """Heuristic to detect if a Shopify product represents a release / drop.

    Returns a dict with normalized fields: status, release_type, is_raffle, release_date
    """
    tags = [t.lower() for t in (product.get("tags") or [])]
    title = (product.get("title") or "").lower()
    body = (product.get("body_html") or "").lower()

    is_raffle = any(k in body for k in ("raffle", "entry", "draw")) or any(
        k in tags for k in ("raffle", "giveaway")
    )

    release_type = "unknown"
    if "in-store" in tags or "in store" in body:
        release_type = "in-store"
    if "online" in tags or "online" in body:
        release_type = "online"
    if is_raffle:
        release_type = "raffle"

    # published_at can indicate when it went live; some shops set future publish dates
    published_at = product.get("published_at")
    release_date = None
    status = "announced"
    try:
        if published_at:
            dt = dateparser.parse(published_at)
            release_date = dt.astimezone(timezone.utc)
            now = datetime.now(timezone.utc)
            if release_date > now:
                status = "upcoming"
            else:
                status = "live"
    except Exception:
        release_date = None

    # Additional heuristics
    if "coming soon" in title or "coming soon" in body or "release" in tags:
        status = "upcoming"

    return {"status": status, "release_type": release_type, "is_raffle": is_raffle, "release_date": release_date}


def normalize_product(domain, product):
    pid = product.get("id")
    handle = product.get("handle")
    url = f"https://{domain}/products/{handle}" if handle else f"https://{domain}"
    detected = detect_release(product)

    # try to get a SKU/style code from variants
    style_code = None
    variants = product.get("variants") or []
    if variants:
        first = variants[0]
        style_code = first.get("sku") or first.get("barcode") or first.get("id")

    images = [i.get("src") for i in (product.get("images") or []) if i.get("src")]

    doc = {
        "name": product.get("title"),
        "brand": None,
        "description": product.get("body_html"),
        "sku": style_code,
        "price": None,
        "currency": None,
        "images": images,
        "release_date": detected.get("release_date"),
        "release_type": detected.get("release_type"),
        "is_raffle": detected.get("is_raffle"),
        "status": detected.get("status"),
        "locations": [{
            "storeId": domain,
            "storeName": domain,
            "url": url,
            "entry_method": detected.get("release_type"),
        }],
        "sources": [{"name": domain, "url": url, "fetchedAt": datetime.now(timezone.utc)}],
        "metadata": {"raw": product},
        "last_seen": datetime.now(timezone.utc),
    }

    # price: use first variant price if present
    if variants:
        v = variants[0]
        try:
            doc["price"] = float(v.get("price")) if v.get("price") else None
        except Exception:
            doc["price"] = None

    return pid, doc


def upsert_product(db, domain, product, collection_name=DEFAULT_COLLECTION):
    pid, doc = normalize_product(domain, product)
    if not pid:
        logging.warning("Skipping product with no id from %s", domain)
        return False
    # use a stable ID combining domain and product id
    doc_id = f"{domain}::{pid}"
    ref = db.collection(collection_name).document(doc_id)
    data_to_write = doc.copy()
    # Firestore cannot store datetime with tzinfo other than UTC; ensure release_date is RFC
    if data_to_write.get("release_date"):
        data_to_write["release_date"] = data_to_write["release_date"].replace(tzinfo=timezone.utc)
    # transform fetchedAt / last_seen
    for s in data_to_write.get("sources", []):
        if isinstance(s.get("fetchedAt"), datetime):
            s["fetchedAt"] = s["fetchedAt"].replace(tzinfo=timezone.utc)
    if isinstance(data_to_write.get("last_seen"), datetime):
        data_to_write["last_seen"] = data_to_write["last_seen"].replace(tzinfo=timezone.utc)

    # Merge strategy: set fields and merge to preserve manual edits
    try:
        ref.set(data_to_write, merge=True)
        logging.info("Upserted %s -> %s", doc_id, data_to_write.get("name"))
        return True
    except Exception as e:
        logging.error("Failed to write %s: %s", doc_id, e)
        return False


def run_scraper(config_path, pause=1.0):
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    stores = cfg.get("stores", [])
    if not stores:
        logging.error("No stores found in config")
        return

    db = init_firebase()

    for domain in stores:
        logging.info("Processing %s", domain)
        pj = fetch_products_json(domain)
        if not pj:
            logging.info("No products.json for %s (skipping). Consider Playwright for dynamic sites.", domain)
            time.sleep(pause)
            continue
        products = pj.get("products") or []
        logging.info("Found %s products on %s", len(products), domain)
        for p in products:
            upsert_product(db, domain, p)
        # small pause between stores to be polite
        time.sleep(pause)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="scripts/shopify_stores.json", help="path to stores JSON")
    parser.add_argument("--pause", type=float, default=1.0, help="pause between stores (seconds)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run_scraper(args.config, pause=args.pause)


if __name__ == "__main__":
    main()
