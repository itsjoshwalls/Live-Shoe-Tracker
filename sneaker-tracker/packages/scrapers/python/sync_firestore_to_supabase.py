import os
import json
import time
import logging
from typing import Any, Dict, Iterable
from urllib.parse import quote
from datetime import datetime

import requests

# Optional Postgres direct write
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PG_AVAILABLE = True
except Exception:
    PG_AVAILABLE = False

# Firebase Admin
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    raise SystemExit("firebase-admin is required. pip install firebase-admin requests python-dateutil")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("sync-firestore-to-supabase")


def _init_firestore() -> Any:
    """Initialize Firestore using FIREBASE_SERVICE_ACCOUNT env or exit."""
    try:
        firebase_admin.get_app()
    except ValueError:
        svc_json = os.getenv('FIREBASE_SERVICE_ACCOUNT')
        svc_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        if svc_json:
            cred = credentials.Certificate(json.loads(svc_json))
        elif svc_path and os.path.exists(svc_path):
            cred = credentials.Certificate(svc_path)
        else:
            raise SystemExit("No service account provided. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_PATH.")
        firebase_admin.initialize_app(cred)
    return firestore.client()


def _to_iso(value: Any) -> Any:
    try:
        # Firestore Timestamp has to_datetime method
        if hasattr(value, 'to_datetime'):
            return value.to_datetime().isoformat()
        if hasattr(value, 'toDate'):
            return value.toDate().isoformat()
        if hasattr(value, 'isoformat'):
            return value.isoformat()
        return value
    except Exception:
        return str(value)


def _normalize_row(d: Dict[str, Any]) -> Dict[str, Any]:
    """Map Firestore doc to Supabase row for soleretriever_data."""
    title = d.get('title') or d.get('name') or d.get('productName')
    url = d.get('url')
    if not url:
        return {}

    # Coerce price
    price = d.get('price')
    if isinstance(price, str):
        try:
            price = float(price.replace('$', '').replace(',', '').strip())
        except Exception:
            pass

    row = {
        'title': title,
        'url': url,
        'brand': d.get('brand'),
        'sku': d.get('sku'),
        'style_code': d.get('style_code'),
        'colorway': d.get('colorway'),
        'price': price,
        'currency': d.get('currency') or 'USD',
        'release_date': _to_iso(d.get('release_date')) if d.get('release_date') else None,
        'status': d.get('status'),
        'has_raffle': d.get('has_raffle') if isinstance(d.get('has_raffle'), bool) else False,
        'raffle_retailers': d.get('raffle_retailers'),
        'image_url': d.get('image_url'),
        'images': d.get('images'),
        'collection': d.get('collection'),
        'category': d.get('category'),
        'description': d.get('description'),
        'tags': d.get('tags'),
        'source': d.get('source') or 'firestore-sync',
        'scraped_at': _to_iso(d.get('scraped_at')) if d.get('scraped_at') else None,
        'created_at': _to_iso(d.get('created_at')) if d.get('created_at') else None,
        'updated_at': _to_iso(d.get('updated_at')) if d.get('updated_at') else None,
    }
    # Remove None values to keep payload small
    return {k: v for k, v in row.items() if v is not None}


def _iter_docs(db: Any, collection: str) -> Iterable[Dict[str, Any]]:
    # Stream all docs from collection
    for doc in db.collection(collection).stream():
        data = doc.to_dict() or {}
        data['id'] = doc.id
        yield data


def _patch_by_url(base_url: str, service_key: str, table: str, row: Dict[str, Any], anon_key: str = None, use_auth: bool = True) -> int:
    url_val = quote(row['url'], safe='')
    base = base_url.rstrip('/')
    url = f"{base}/{table}?url=eq.{url_val}"
    headers = {
        'apikey': (anon_key or service_key) if (anon_key or service_key) else '',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    if use_auth and service_key:
        headers['Authorization'] = f"Bearer {service_key}"
    r = requests.patch(url, headers=headers, json=row, timeout=20)
    if r.status_code in (200, 204):
        try:
            data = r.json()
            return len(data) if isinstance(data, list) else 0
        except Exception:
            # 204 No Content
            return 1
    elif r.status_code == 404:
        return 0
    else:
        logger.warning(f"PATCH failed {r.status_code}: {r.text[:200]}")
        return 0


def _insert_row(base_url: str, service_key: str, table: str, row: Dict[str, Any], anon_key: str = None, use_auth: bool = True) -> bool:
    base = base_url.rstrip('/')
    url = f"{base}/{table}"
    headers = {
        'apikey': (anon_key or service_key) if (anon_key or service_key) else '',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    if use_auth and service_key:
        headers['Authorization'] = f"Bearer {service_key}"
    r = requests.post(url, headers=headers, json=row, timeout=20)
    if r.status_code in (200, 201):
        return True
    logger.error(f"INSERT failed {r.status_code}: {r.text[:200]}")
    return False


def sync_once(collection: str = 'sneakers_canonical', table: str = 'soleretriever_data', base_url: str = None) -> Dict[str, int]:
    base_url = base_url or os.getenv('SUPABASE_URL', 'http://localhost:8000')
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    anon_key = os.getenv('SUPABASE_ANON_KEY')
    use_auth = os.getenv('SUPABASE_USE_AUTH', '1') == '1'
    if not service_key:
        raise SystemExit('SUPABASE_SERVICE_ROLE_KEY is required for writes')

    db = _init_firestore()
    stats = {'processed': 0, 'upserts': 0, 'updates': 0, 'inserts': 0, 'skipped': 0, 'errors': 0}

    logger.info(f"Syncing Firestore '{collection}' → Supabase '{table}' via {base_url}")

    for doc in _iter_docs(db, collection):
        stats['processed'] += 1
        row = _normalize_row(doc)
        if not row:
            stats['skipped'] += 1
            continue
        try:
            updated = _patch_by_url(base_url, service_key, table, row, anon_key, use_auth)
            if updated:
                stats['updates'] += 1
                stats['upserts'] += 1
            else:
                if _insert_row(base_url, service_key, table, row, anon_key, use_auth):
                    stats['inserts'] += 1
                    stats['upserts'] += 1
                else:
                    stats['errors'] += 1
        except Exception as e:
            logger.exception(f"Upsert error for URL {row.get('url')}: {e}")
            stats['errors'] += 1

        if stats['processed'] % 50 == 0:
            logger.info(f"Progress: {stats['processed']} processed • {stats['upserts']} upserts")

    logger.info(f"Sync complete: {stats}")
    return stats


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Sync Firestore → Supabase (PostgREST)')
    parser.add_argument('--source', default='sneakers_canonical', help='Firestore collection name')
    parser.add_argument('--table', default='soleretriever_data', help='Supabase/Postgres table name')
    parser.add_argument('--supabase-url', default=os.getenv('SUPABASE_URL', 'http://localhost:8000'))
    parser.add_argument('--direct-pg', action='store_true', help='Write directly to PostgreSQL instead of REST')
    args = parser.parse_args()

    if args.direct_pg:
        if not PG_AVAILABLE:
            raise SystemExit('psycopg2 is required for --direct-pg. pip install psycopg2-binary')

        # Build PG connection from env or fallback to api-server/.env
        host = os.getenv('POSTGRES_HOST', 'localhost')
        port = int(os.getenv('POSTGRES_PORT', '5432'))
        db = os.getenv('POSTGRES_DB', 'postgres')
        user = os.getenv('POSTGRES_USER', 'postgres')
        password = os.getenv('POSTGRES_PASSWORD', '')

        # Fallback: read from apps/api-server/.env
        if not password:
            env_path = os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'api-server', '.env')
            env_path = os.path.abspath(env_path)
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('POSTGRES_HOST='):
                            host = line.split('=',1)[1]
                        elif line.startswith('POSTGRES_PORT='):
                            port = int(line.split('=',1)[1])
                        elif line.startswith('POSTGRES_DB='):
                            db = line.split('=',1)[1]
                        elif line.startswith('POSTGRES_USER='):
                            user = line.split('=',1)[1]
                        elif line.startswith('POSTGRES_PASSWORD='):
                            password = line.split('=',1)[1]
            except Exception:
                pass

        conn = psycopg2.connect(host=host, port=port, dbname=db, user=user, password=password)
        cur = conn.cursor()

        db_fs = _init_firestore()
        stats = {'processed': 0, 'updates': 0, 'inserts': 0, 'skipped': 0, 'errors': 0}
        logger.info(f"Direct PG sync Firestore '{args.source}' → table '{args.table}' at {host}:{port}/{db}")

        for doc in _iter_docs(db_fs, args.source):
            stats['processed'] += 1
            row = _normalize_row(doc)
            if not row or 'url' not in row:
                stats['skipped'] += 1
                continue

            try:
                # Check existence by URL
                cur.execute(f"SELECT id FROM {args.table} WHERE url = %s LIMIT 1", (row['url'],))
                existing = cur.fetchone()

                # Build columns and values
                cols = list(row.keys())
                vals = [row[c] for c in cols]

                if existing:
                    # Update set
                    set_clause = ', '.join([f"{c} = %s" for c in cols])
                    cur.execute(f"UPDATE {args.table} SET {set_clause} WHERE id = %s", vals + [existing[0]])
                    stats['updates'] += 1
                else:
                    placeholders = ','.join(['%s'] * len(cols))
                    col_names = ','.join(cols)
                    cur.execute(f"INSERT INTO {args.table} ({col_names}) VALUES ({placeholders})", vals)
                    stats['inserts'] += 1

                if stats['processed'] % 50 == 0:
                    conn.commit()
                    logger.info(f"Progress: {stats['processed']} processed • {stats['updates']} updates • {stats['inserts']} inserts")
            except Exception as e:
                conn.rollback()
                stats['errors'] += 1
                logger.exception(f"Upsert failed for URL {row.get('url')}: {e}")

        conn.commit()
        cur.close()
        conn.close()
        print(json.dumps(stats))
    else:
        stats = sync_once(args.source, args.table, args.supabase_url)
        print(json.dumps(stats))
