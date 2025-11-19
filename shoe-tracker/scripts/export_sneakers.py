"""
Export sneakers collection to a local JSON file for inspection.

Usage:
  # set FIREBASE_SERVICE_ACCOUNT env var
  python scripts/export_sneakers.py --out exported_sneakers.json

This helps review what the scraper inserted into Firestore.
"""
import os
import json
import argparse
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


def export_collection(collection_name, out_path):
    db = init_firebase()
    col = db.collection(collection_name)
    docs = list(col.stream())
    out = {}
    for d in docs:
        data = d.to_dict()
        # Firestore Timestamps are converted to datetime; convert to ISO
        for k, v in list(data.items()):
            try:
                # attempt to call isoformat if datetime-like
                if hasattr(v, "isoformat"):
                    data[k] = v.isoformat()
            except Exception:
                pass
        out[d.id] = data
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"Exported {len(out)} documents to {out_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", default=os.environ.get("FIRESTORE_COLLECTION", "sneakers"))
    parser.add_argument("--out", default="exported_sneakers.json")
    args = parser.parse_args()
    export_collection(args.collection, args.out)


if __name__ == "__main__":
    main()
