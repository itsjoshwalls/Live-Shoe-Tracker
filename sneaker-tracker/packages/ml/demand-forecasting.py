#!/usr/bin/env python3
"""
ML Demand Forecasting Module
Predicts future demand/pricing trends for sneaker releases using historical data.

Features computed:
- Price momentum (7-day, 30-day moving averages)
- Volatility (standard deviation of price changes)
- Resale spread (avg resale price vs retail)
- Release recency (days since release)
- Historical sales velocity proxy (view count trends, if available)

Model: Baseline linear regression; can expand to XGBoost/LSTM for time-series.
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

# Firebase Admin for Firestore data retrieval
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("ERROR: firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)

# ML libraries
try:
    from sklearn.model_selection import train_test_split
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
except ImportError:
    print("ERROR: scikit-learn not installed. Run: pip install scikit-learn")
    sys.exit(1)

try:
    from scipy import stats
except ImportError:
    print("WARN: scipy not installed (optional for advanced stats). Run: pip install scipy")
    stats = None


def init_firestore() -> Any:
    """Initialize Firestore client using service account from environment."""
    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    if not sa_json:
        print("ERROR: FIREBASE_SERVICE_ACCOUNT environment variable not set.")
        print("Tip (PowerShell): $env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'path\\to\\service-account.json' -Raw")
        sys.exit(1)
    
    try:
        sa = json.loads(sa_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: FIREBASE_SERVICE_ACCOUNT is not valid JSON: {e}")
        sys.exit(1)
    
    # Initialize if not already
    if not firebase_admin._apps:
        cred = credentials.Certificate(sa)
        firebase_admin.initialize_app(cred)
    
    return firestore.client()


def fetch_price_history(db: Any, collection: str = "price_points", limit: int = 5000) -> pd.DataFrame:
    """
    Fetch historical price points from Firestore.
    Expected schema: {sku, platform, price, timestamp, sneaker_name, ...}
    """
    print(f"Fetching up to {limit} price points from '{collection}'...")
    docs = db.collection(collection).order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
    
    records = []
    for doc in docs:
        data = doc.to_dict()
        records.append({
            "sku": data.get("sku"),
            "platform": data.get("platform"),
            "price": data.get("price"),
            "timestamp": data.get("timestamp"),
            "sneaker_name": data.get("sneaker_name"),
        })
    
    df = pd.DataFrame(records)
    if df.empty:
        print("WARN: No price points found. Ensure price_points collection is populated.")
        return df
    
    # Convert Firestore timestamp to datetime
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    
    print(f"Loaded {len(df)} price points.")
    return df


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute features for demand forecasting:
    - price_ma_7d, price_ma_30d: moving averages
    - price_volatility_7d: rolling std dev
    - days_since_release: proxy for recency
    - resale_spread: difference from assumed retail (if available)
    
    Returns augmented DataFrame with feature columns.
    """
    if df.empty:
        return df
    
    # Sort by SKU and timestamp
    df = df.sort_values(by=["sku", "timestamp"]).reset_index(drop=True)
    
    # Group by SKU for rolling calculations
    df["price_ma_7d"] = df.groupby("sku")["price"].transform(lambda x: x.rolling(7, min_periods=1).mean())
    df["price_ma_30d"] = df.groupby("sku")["price"].transform(lambda x: x.rolling(30, min_periods=1).mean())
    df["price_volatility_7d"] = df.groupby("sku")["price"].transform(lambda x: x.rolling(7, min_periods=1).std().fillna(0))
    
    # Compute days since earliest timestamp per SKU (proxy for release recency)
    df["min_timestamp"] = df.groupby("sku")["timestamp"].transform("min")
    df["days_since_release"] = (df["timestamp"] - df["min_timestamp"]).dt.days
    
    # Placeholder: resale_spread (requires retail price; for now, use price deviation from SKU mean)
    df["sku_mean_price"] = df.groupby("sku")["price"].transform("mean")
    df["resale_spread"] = df["price"] - df["sku_mean_price"]
    
    # Drop helper columns
    df = df.drop(columns=["min_timestamp", "sku_mean_price"], errors="ignore")
    
    print("Computed features: price_ma_7d, price_ma_30d, price_volatility_7d, days_since_release, resale_spread")
    return df


def build_baseline_model(df: pd.DataFrame, target_col: str = "price") -> Dict[str, Any]:
    """
    Train a baseline linear regression model to predict future price.
    Features: price_ma_7d, price_ma_30d, price_volatility_7d, days_since_release, resale_spread
    Target: price (next period)
    
    Returns dict with model, metrics, and feature importance.
    """
    feature_cols = ["price_ma_7d", "price_ma_30d", "price_volatility_7d", "days_since_release", "resale_spread"]
    
    # Drop rows with missing features or target
    df_clean = df.dropna(subset=feature_cols + [target_col])
    
    if len(df_clean) < 50:
        print(f"WARN: Only {len(df_clean)} clean samples; model may be unreliable.")
    
    X = df_clean[feature_cols].values
    y = df_clean[target_col].values
    
    # Train/test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train linear regression
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nBaseline Model Metrics:")
    print(f"  MAE:  ${mae:.2f}")
    print(f"  RMSE: ${rmse:.2f}")
    print(f"  R²:   {r2:.3f}")
    
    # Feature importance (coefficients)
    importance = dict(zip(feature_cols, model.coef_))
    print(f"\nFeature Coefficients:")
    for feat, coef in importance.items():
        print(f"  {feat:25s}: {coef:+.4f}")
    
    return {
        "model": model,
        "feature_cols": feature_cols,
        "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
        "importance": importance,
        "intercept": model.intercept_
    }


def predict_demand(model_info: Dict[str, Any], new_data: pd.DataFrame) -> np.ndarray:
    """
    Use trained model to predict prices for new data.
    new_data must contain feature columns.
    """
    model = model_info["model"]
    feature_cols = model_info["feature_cols"]
    
    X_new = new_data[feature_cols].values
    predictions = model.predict(X_new)
    
    return predictions


def main():
    parser = argparse.ArgumentParser(description="ML Demand Forecasting for Sneaker Releases")
    parser.add_argument("--collection", default="price_points", help="Firestore collection for price history")
    parser.add_argument("--limit", type=int, default=5000, help="Max price points to fetch")
    parser.add_argument("--output", help="Optional: save trained model to file (pickle)")
    args = parser.parse_args()
    
    print("=" * 60)
    print("ML Demand Forecasting Module")
    print("=" * 60)
    
    # Initialize Firestore
    db = init_firestore()
    
    # Fetch price history
    df = fetch_price_history(db, collection=args.collection, limit=args.limit)
    if df.empty:
        print("No data to train on. Exiting.")
        sys.exit(1)
    
    # Compute features
    df = compute_features(df)
    
    # Build baseline model
    model_info = build_baseline_model(df)
    
    # Optional: save model
    if args.output:
        import pickle
        with open(args.output, "wb") as f:
            pickle.dump(model_info, f)
        print(f"\nModel saved to {args.output}")
    
    print("\n" + "=" * 60)
    print("Forecasting module ready. Use predict_demand() for new predictions.")
    print("=" * 60)


if __name__ == "__main__":
    main()
