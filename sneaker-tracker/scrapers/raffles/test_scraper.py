#!/usr/bin/env python3
"""Quick raffle scraper test"""
import os
import sys
import importlib.util

# Load scraper-worker.py dynamically
spec = importlib.util.spec_from_file_location("scraper_worker", "scraper-worker.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

RaffleScraper = module.RaffleScraper

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print(f"URL: {url}")
print(f"Key: {key[:20]}..." if key else "Key: None")

if url and key:
    scraper = RaffleScraper(url, key)
    scraper.run()
else:
    print("ERROR: Missing env vars")
    sys.exit(1)
