# ML Demand Forecasting Module

Predicts sneaker demand and pricing trends using historical price data.

## Features

- **Price momentum**: 7-day and 30-day moving averages
- **Volatility**: Rolling standard deviation of price changes
- **Resale spread**: Average resale price vs retail
- **Recency**: Days since release
- **Baseline model**: Linear regression (expandable to XGBoost/LSTM)

## Installation

```powershell
pip install firebase-admin scikit-learn pandas numpy scipy
```

## Usage

### 1. Set Firebase credentials

```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'path\to\service-account.json' -Raw
```

### 2. Run forecasting

```powershell
python demand-forecasting.py --collection price_points --limit 5000
```

**Options:**
- `--collection`: Firestore collection for price history (default: `price_points`)
- `--limit`: Max price points to fetch (default: `5000`)
- `--output`: Save trained model to pickle file (optional)

### 3. Example output

```
Fetching up to 5000 price points from 'price_points'...
Loaded 4523 price points.
Computed features: price_ma_7d, price_ma_30d, price_volatility_7d, days_since_release, resale_spread

Baseline Model Metrics:
  MAE:  $12.34
  RMSE: $18.56
  R²:   0.782

Feature Coefficients:
  price_ma_7d              : +0.4521
  price_ma_30d             : +0.3218
  price_volatility_7d      : -0.0234
  days_since_release       : -0.0012
  resale_spread            : +0.1987
```

## Data Schema

Expected Firestore `price_points` collection schema:

```json
{
  "sku": "ABC123",
  "platform": "StockX",
  "price": 250.0,
  "timestamp": "2025-11-18T10:30:00Z",
  "sneaker_name": "Air Jordan 1 Retro High OG"
}
```

## Next Steps

- **Advanced models**: Replace LinearRegression with XGBoost or LSTM for time-series
- **Real-time predictions**: Expose via API endpoint for web/desktop apps
- **Feature expansion**: Add social media mentions, search trends, hype scores
- **Backtesting**: Validate predictions against historical releases
