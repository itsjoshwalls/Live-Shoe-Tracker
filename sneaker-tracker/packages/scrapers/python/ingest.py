"""
Ingestion and normalization service (script)

This script scans the scraped `sneakers` collection (or a configured raw collection),
normalizes and deduplicates entries, and writes merged documents into
`sneakers_canonical` collection. Run it after scraping or on a schedule.

Usage:
  # set FIREBASE_SERVICE_ACCOUNT env var
  python scripts/ingest.py --source sneakers --dest sneakers_canonical

The merge strategy is conservative:
- Group by sku/styleCode when available, otherwise by normalized name.
- Merge arrays (locations, sources) and take the most recent release_date.
- Keep metadata.raw from sources for traceability.
"""
import argparse
import json
import logging
import os
import re
from collections import defaultdict
from datetime import datetime

from firebase_admin import credentials, initialize_app
from google.cloud import firestore


def init_firebase():
    sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not sa_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT environment variable is not set")
    sa = json.loads(sa_json)
    cred = credentials.Certificate(sa)
    try:
        initialize_app(cred)
    except ValueError:
        pass
    return firestore.Client()


def normalize_name(name: str) -> str:
    if not name:
        return ""
    n = name.lower()
    n = re.sub(r"[^a-z0-9]+", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def merge_docs(docs):
    # docs: list of dicts representing scraped documents
    merged = {}
    names = [d.get("name") for d in docs if d.get("name")]
    merged["name"] = names[0] if names else None
    merged["sku"] = next((d.get("sku") for d in docs if d.get("sku")), None)
    merged["brand"] = next((d.get("brand") for d in docs if d.get("brand")), None)
    # merge images (unique, preserve order of first appearance)
    images = []
    for d in docs:
        for img in (d.get("images") or []):
            if img and img not in images:
                images.append(img)
    merged["images"] = images if images else None
    # pick latest release_date
    dates = [d.get("release_date") for d in docs if d.get("release_date")]
    release_date = None
    if dates:
        # dates may be strings or datetimes
        parsed = []
        for dt in dates:
            if isinstance(dt, str):
                try:
                    parsed.append(datetime.fromisoformat(dt))
                except Exception:
                    pass
            else:
                parsed.append(dt)
        if parsed:
            release_date = max(parsed)
    merged["release_date"] = release_date

    # union locations and sources
    locations = []
    sources = []
    for d in docs:
        for loc in d.get("locations") or []:
            if loc not in locations:
                locations.append(loc)
        for s in d.get("sources") or []:
            if s not in sources:
                sources.append(s)
    merged["locations"] = locations
    merged["sources"] = sources

    # status: prefer live > upcoming > announced
    status_priority = {"live": 3, "upcoming": 2, "announced": 1}
    statuses = [d.get("status") for d in docs if d.get("status")]
    merged_status = None
    if statuses:
        merged_status = max(statuses, key=lambda s: status_priority.get(s, 0))
    merged["status"] = merged_status

    # keep raw metadata list for traceability
    merged["raw_sources"] = [d.get("metadata", {}).get("raw") for d in docs if d.get("metadata")]

    merged["last_merged_at"] = datetime.utcnow()
    return merged


def run_ingest(source_collection, dest_collection, dry_run=False):
    db = init_firebase()
    src = db.collection(source_collection)
    docs = list(src.stream())
    logging.info("Read %d documents from %s", len(docs), source_collection)

    groups = defaultdict(list)
    for doc in docs:
        data = doc.to_dict() or {}
        sku = data.get("sku")
        name = data.get("name")
        if sku:
            key = f"sku::{sku}"
        else:
            key = f"name::{normalize_name(name)}"
        groups[key].append(data)

    logging.info("Found %d groups to merge", len(groups))
    dest = db.collection(dest_collection)
    merged_count = 0
    for key, group in groups.items():
        merged = merge_docs(group)
        # create doc id as normalized key
        doc_id = key.replace(" ", "_")
        if dry_run:
            logging.info("Dry run: would write %s -> %s", doc_id, merged.get("name"))
        else:
            dest.document(doc_id).set(merged, merge=True)
            merged_count += 1
    logging.info("Ingestion complete. Merged %d groups.", merged_count)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=os.environ.get("FIRESTORE_SOURCE", "sneakers"))
    parser.add_argument("--dest", default=os.environ.get("FIRESTORE_DEST", "sneakers_canonical"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run_ingest(args.source, args.dest, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
