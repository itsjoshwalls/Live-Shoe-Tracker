#!/usr/bin/env python3
"""Quick Firestore check script"""
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

sa_json = os.getenv('FIREBASE_SERVICE_ACCOUNT')
sa = json.loads(sa_json)
firebase_admin.initialize_app(credentials.Certificate(sa))
db = firestore.client()

# Check sneakers collection
sneakers_docs = list(db.collection('sneakers').limit(10).stream())
print(f"Sneakers collection sample: {len(sneakers_docs)} docs")
for d in sneakers_docs[:5]:
    data = d.to_dict()
    print(f"  {d.id}: {data.get('name', 'N/A')[:60]}")

# Count total (estimate via query)
all_sneakers = db.collection('sneakers').limit(100).stream()
count = sum(1 for _ in all_sneakers)
print(f"\nTotal sneakers (first 100): {count}")
