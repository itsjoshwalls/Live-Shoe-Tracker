"""
Seed Firestore with sample sneaker documents for local testing.

Requires FIREBASE_SERVICE_ACCOUNT env var (same service account JSON used by worker).

Run:
  python scripts/seed_firestore.py
"""
import os
import json
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


def seed():
    db = init_firebase()
    col = db.collection("sneakers")
    samples = [
        {"name": "Air Jordan 4 'Bred Reimagined'", "date": "2025-11-10", "price": "$210", "mileage": 0},
        {"name": "Yeezy Boost 350 V3 'Mono Clay'", "date": "2025-12-02", "price": "$230", "mileage": 0},
        {"name": "Nike SB Dunk Low 'Tiffany 2.0'", "date": "2025-12-18", "price": "$120", "mileage": 0},
    ]
    for s in samples:
        doc_ref = col.document()
        doc_ref.set(s)
        print("Created", doc_ref.id)


if __name__ == "__main__":
    seed()
