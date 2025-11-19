"""
Firestore Adapter for Python Scrapers

Connects scrapers to Firebase Firestore instead of PostgreSQL/Supabase.
Features:
- Batch writes for performance
- Duplicate prevention using document IDs
- Automatic timestamp management
- Error handling and retries

Usage:
    from firestore_adapter import FirestoreAdapter
    
    adapter = FirestoreAdapter(service_account_path='path/to/service-account.json')
    adapter.save_products(products, collection='sneakers_canonical')
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logging.warning("Firebase Admin SDK not available. Install with: pip install firebase-admin")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class FirestoreAdapter:
    """Adapter for saving scraper data to Firestore."""
    
    def __init__(self, service_account_path: str = None, service_account_json: str = None):
        """
        Initialize Firestore adapter.
        
        Args:
            service_account_path: Path to service account JSON file
            service_account_json: Service account JSON as string (from env var)
        """
        if not FIREBASE_AVAILABLE:
            raise ImportError("Firebase Admin SDK not installed")
        
        # Initialize Firebase Admin SDK
        try:
            # Check if already initialized
            firebase_admin.get_app()
            logger.info("Using existing Firebase app")
        except ValueError:
            # Not initialized yet
            if service_account_json:
                # Parse JSON string (from environment variable)
                cred_dict = json.loads(service_account_json)
                cred = credentials.Certificate(cred_dict)
            elif service_account_path:
                # Load from file
                cred = credentials.Certificate(service_account_path)
            elif os.getenv('FIREBASE_SERVICE_ACCOUNT'):
                # Try environment variable
                cred_dict = json.loads(os.getenv('FIREBASE_SERVICE_ACCOUNT'))
                cred = credentials.Certificate(cred_dict)
            else:
                raise ValueError("No service account credentials provided")
            
            firebase_admin.initialize_app(cred)
            logger.info("Initialized Firebase Admin SDK")
        
        self.db = firestore.client()
        self.stats = {
            'saved': 0,
            'updated': 0,
            'errors': 0,
            'skipped': 0
        }
    
    def _generate_doc_id(self, product: Dict) -> str:
        """
        Generate document ID from product data.
        Uses URL hash or SKU to ensure uniqueness.
        
        Args:
            product: Product dictionary
            
        Returns:
            Document ID string
        """
        # Try URL first (most reliable for deduplication)
        if product.get('url'):
            # Use last part of URL as ID (cleaned)
            url = product['url']
            doc_id = url.rstrip('/').split('/')[-1]
            # Clean ID (Firestore document IDs can't contain certain characters)
            doc_id = doc_id.replace('?', '_').replace('&', '_').replace('=', '_')
            return doc_id[:1500]  # Firestore limit
        
        # Fallback to SKU
        if product.get('sku'):
            return str(product['sku']).replace('/', '_')[:1500]
        
        # Last resort: hash of title
        if product.get('title'):
            import hashlib
            return hashlib.md5(product['title'].encode()).hexdigest()
        
        raise ValueError("Product must have url, sku, or title for ID generation")
    
    def _prepare_product(self, product: Dict) -> Dict:
        """
        Prepare product data for Firestore.
        Converts timestamps, handles None values, etc.
        
        Args:
            product: Raw product dictionary
            
        Returns:
            Cleaned product dictionary
        """
        cleaned = {}
        
        for key, value in product.items():
            # Skip None values
            if value is None:
                continue
            
            # Convert datetime strings to Firestore timestamps
            if key in ['release_date', 'published_date', 'scraped_at', 'created_at', 'updated_at']:
                if isinstance(value, str):
                    try:
                        from dateutil import parser as date_parser
                        dt = date_parser.parse(value)
                        cleaned[key] = dt
                    except:
                        cleaned[key] = value
                else:
                    cleaned[key] = value
            else:
                cleaned[key] = value
        
        # Add timestamps if not present
        now = datetime.now(timezone.utc)
        if 'scraped_at' not in cleaned:
            cleaned['scraped_at'] = now
        if 'updated_at' not in cleaned:
            cleaned['updated_at'] = now
        
        return cleaned
    
    def save_product(self, product: Dict, collection: str = 'sneakers') -> bool:
        """
        Save single product to Firestore.
        
        Args:
            product: Product dictionary
            collection: Firestore collection name
            
        Returns:
            True if successful, False otherwise
        """
        try:
            doc_id = self._generate_doc_id(product)
            cleaned = self._prepare_product(product)
            
            # Check if document exists
            doc_ref = self.db.collection(collection).document(doc_id)
            doc = doc_ref.get()
            
            if doc.exists:
                # Update existing document
                cleaned['updated_at'] = datetime.now(timezone.utc)
                doc_ref.update(cleaned)
                self.stats['updated'] += 1
                logger.debug(f"Updated: {product.get('title', doc_id)[:50]}")
            else:
                # Create new document
                cleaned['created_at'] = datetime.now(timezone.utc)
                doc_ref.set(cleaned)
                self.stats['saved'] += 1
                logger.debug(f"Saved: {product.get('title', doc_id)[:50]}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving product: {e}")
            logger.error(f"Product data: {json.dumps(product, default=str)[:200]}")
            self.stats['errors'] += 1
            return False
    
    def save_products_batch(self, products: List[Dict], collection: str = 'sneakers') -> int:
        """
        Save multiple products using batch writes (faster).
        Firestore allows up to 500 operations per batch.
        
        Args:
            products: List of product dictionaries
            collection: Firestore collection name
            
        Returns:
            Number of products saved
        """
        saved_count = 0
        batch_size = 500  # Firestore limit
        
        for i in range(0, len(products), batch_size):
            batch_products = products[i:i + batch_size]
            batch = self.db.batch()
            
            for product in batch_products:
                try:
                    doc_id = self._generate_doc_id(product)
                    cleaned = self._prepare_product(product)
                    
                    doc_ref = self.db.collection(collection).document(doc_id)
                    
                    # Batch set (will overwrite existing docs)
                    batch.set(doc_ref, cleaned, merge=True)
                    saved_count += 1
                    
                except Exception as e:
                    logger.error(f"Error preparing product for batch: {e}")
                    self.stats['errors'] += 1
            
            try:
                # Commit batch
                batch.commit()
                logger.info(f"Committed batch of {len(batch_products)} products")
                self.stats['saved'] += len(batch_products)
            except Exception as e:
                logger.error(f"Error committing batch: {e}")
                self.stats['errors'] += len(batch_products)
        
        return saved_count
    
    def save_products(self, products: List[Dict], collection: str = 'sneakers', 
                     use_batch: bool = True) -> int:
        """
        Save products to Firestore (uses batch by default for performance).
        
        Args:
            products: List of product dictionaries
            collection: Firestore collection name
            use_batch: Use batch writes (faster) vs individual writes
            
        Returns:
            Number of products saved
        """
        if use_batch:
            return self.save_products_batch(products, collection)
        else:
            saved = 0
            for product in products:
                if self.save_product(product, collection):
                    saved += 1
            return saved
    
    def get_stats(self) -> Dict[str, int]:
        """Get save statistics."""
        return self.stats.copy()
    
    def query_products(self, collection: str = 'sneakers', 
                      filters: Dict = None, limit: int = 100) -> List[Dict]:
        """
        Query products from Firestore.
        
        Args:
            collection: Collection name
            filters: Dictionary of filters (e.g., {'brand': 'Nike', 'status': 'upcoming'})
            limit: Maximum number of results
            
        Returns:
            List of product dictionaries
        """
        query = self.db.collection(collection)
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                query = query.where(field, '==', value)
        
        # Apply limit
        query = query.limit(limit)
        
        # Execute query
        docs = query.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(data)
        
        return results


def migrate_postgres_to_firestore(postgres_conn_string: str, 
                                  firestore_adapter: FirestoreAdapter,
                                  table: str = 'soleretriever_data',
                                  collection: str = 'sneakers_canonical',
                                  batch_size: int = 500):
    """
    Migrate data from PostgreSQL to Firestore.
    
    Args:
        postgres_conn_string: PostgreSQL connection string
        firestore_adapter: Initialized FirestoreAdapter
        table: PostgreSQL table name
        collection: Firestore collection name
        batch_size: Number of rows to process at a time
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor
    
    logger.info(f"Starting migration from {table} to {collection}")
    
    # Connect to PostgreSQL
    conn = psycopg2.connect(postgres_conn_string)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get total count
    cursor.execute(f"SELECT COUNT(*) as total FROM {table}")
    total = cursor.fetchone()['total']
    logger.info(f"Total rows to migrate: {total}")
    
    # Migrate in batches
    offset = 0
    migrated = 0
    
    while offset < total:
        cursor.execute(f"SELECT * FROM {table} LIMIT {batch_size} OFFSET {offset}")
        rows = cursor.fetchall()
        
        if not rows:
            break
        
        # Convert to list of dicts
        products = [dict(row) for row in rows]
        
        # Save to Firestore
        saved = firestore_adapter.save_products(products, collection, use_batch=True)
        migrated += saved
        offset += len(rows)
        
        logger.info(f"Migrated {migrated}/{total} rows ({(migrated/total)*100:.1f}%)")
    
    cursor.close()
    conn.close()
    
    logger.info(f"Migration complete: {migrated} rows migrated")
    return migrated


if __name__ == '__main__':
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description='Firestore Adapter Test')
    parser.add_argument('--service-account', help='Path to service account JSON')
    parser.add_argument('--collection', default='sneakers_test', help='Collection name')
    parser.add_argument('--test-save', action='store_true', help='Test saving products')
    parser.add_argument('--test-query', action='store_true', help='Test querying products')
    parser.add_argument('--migrate', action='store_true', help='Migrate from PostgreSQL')
    
    args = parser.parse_args()
    
    # Initialize adapter
    adapter = FirestoreAdapter(service_account_path=args.service_account)
    
    if args.test_save:
        # Test saving products
        test_products = [
            {
                'title': 'Test Jordan 1',
                'url': 'https://example.com/test-jordan-1',
                'brand': 'Jordan',
                'price': '180',
                'status': 'upcoming',
                'source': 'test'
            },
            {
                'title': 'Test Nike Dunk',
                'url': 'https://example.com/test-nike-dunk',
                'brand': 'Nike',
                'price': '110',
                'status': 'released',
                'source': 'test'
            }
        ]
        
        saved = adapter.save_products(test_products, args.collection)
        print(f"Saved {saved}/{len(test_products)} products")
        print(f"Stats: {adapter.get_stats()}")
    
    if args.test_query:
        # Test querying
        products = adapter.query_products(args.collection, limit=10)
        print(f"Found {len(products)} products:")
        for p in products:
            print(f"  - {p.get('title')} ({p.get('brand')})")
    
    if args.migrate:
        # Migrate from PostgreSQL
        conn_string = f"host={os.getenv('POSTGRES_HOST', 'localhost')} " \
                     f"port={os.getenv('POSTGRES_PORT', '5432')} " \
                     f"dbname={os.getenv('POSTGRES_DB', 'postgres')} " \
                     f"user={os.getenv('POSTGRES_USER', 'postgres')} " \
                     f"password={os.getenv('POSTGRES_PASSWORD', 'your-super-secret-postgres-password')}"
        
        migrated = migrate_postgres_to_firestore(
            conn_string, adapter,
            table='soleretriever_data',
            collection='sneakers_canonical'
        )
        print(f"Migrated {migrated} rows")
