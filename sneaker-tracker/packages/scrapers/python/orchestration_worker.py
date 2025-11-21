#!/usr/bin/env python3
"""
Orchestration worker for scheduled background tasks.

Environment variables required:
- FIREBASE_SERVICE_ACCOUNT: full JSON content of a Firebase service account (string)
- ML_API_KEY: API key for optional ML service (optional)

This script connects to Firestore via the admin credentials and updates
documents in the `sneakers` collection. It will attempt to call an ML API
to compute an increment per sneaker; if the ML call fails or ML_API_KEY is
missing it will increment by 1 as a safe fallback.

Install dependencies:
  pip install firebase-admin google-cloud-firestore requests
"""
import os
import json
import logging
import requests
from firebase_admin import credentials, initialize_app
from google.cloud import firestore


def init_firebase():
    sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not sa_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT environment variable is not set")
    try:
        sa = json.loads(sa_json)
    except Exception as e:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT does not contain valid JSON: %s" % e)

    cred = credentials.Certificate(sa)
    try:
        initialize_app(cred)
    except ValueError:
        # already initialized in this runtime
        pass
    # The google-cloud-firestore client will use the application default
    # credentials initialized by firebase_admin above.
    return firestore.Client()


def compute_increment_via_ml(ml_api_key, sneaker_doc):
    """Call an ML endpoint to compute the mileage increment.

    This function is intentionally defensive—if the call fails we return 1.
    Replace the URL and payload with your ML provider details.
    """
    # ML endpoint details are read from environment variables so the worker
    # can be configured without changing code.
    ml_api_url = os.environ.get("ML_API_URL")
    ml_timeout = int(os.environ.get("ML_TIMEOUT", "10"))
    if not ml_api_key or not ml_api_url:
        # No ML configured; safe default increment
        return 1
    try:
        payload = {"features": sneaker_doc}
        headers = {"Authorization": f"Bearer {ml_api_key}", "Content-Type": "application/json"}
        resp = requests.post(ml_api_url, json=payload, headers=headers, timeout=ml_timeout)
        resp.raise_for_status()
        data = resp.json()
        # Accept either top-level 'increment' or 'result.increment'
        increment = None
        if isinstance(data, dict):
            increment = data.get("increment")
            if increment is None:
                nested = data.get("result") or {}
                if isinstance(nested, dict):
                    increment = nested.get("increment")
        return int(increment or 1)
    except Exception as e:
        logging.warning("ML API call failed; falling back to 1. Error: %s", e)
        return 1


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logging.info("Starting orchestration worker")
    db = init_firebase()
    ml_api_key = os.environ.get("ML_API_KEY")
    # Optional ML endpoint (URL) - set this if you want ML-driven increments
    ml_api_url = os.environ.get("ML_API_URL")
    # Timeout for ML calls (seconds)
    ml_timeout = int(os.environ.get("ML_TIMEOUT", "10"))

    # allow configurable collection name (default: sneakers)
    collection_name = os.environ.get("FIRESTORE_COLLECTION", "sneakers")
    sneakers_ref = db.collection(collection_name)
    docs = list(sneakers_ref.stream())
    if not docs:
        logging.info("No documents found in `sneakers` collection. Nothing to do.")
        return

    updated = 0
    for doc in docs:
        data = doc.to_dict() or {}
        mileage = data.get("mileage", 0)
        # Use ML to determine increment where available
        inc = compute_increment_via_ml(ml_api_key, data)
        new_mileage = mileage + inc
        try:
            sneakers_ref.document(doc.id).update({
                "mileage": new_mileage,
                "last_updated": firestore.SERVER_TIMESTAMP,
            })
            logging.info("Updated %s: %s -> %s", doc.id, mileage, new_mileage)
            updated += 1
        except Exception as e:
            logging.error("Failed to update %s: %s", doc.id, e)

    logging.info("Orchestration complete. Documents updated: %d", updated)


if __name__ == "__main__":
    main()
