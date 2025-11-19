Playwright monitor
==================

This monitor visits configured targets, extracts structured data and heuristics (raffle/release), and writes snapshots into Firestore for later ingestion.

Setup
-----
1) Install Node dependencies (from project root):

```powershell
npm install
npx playwright install
```

2) Set your Firebase Admin service account JSON into an env var (PowerShell):

```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw
$env:FIRESTORE_COLLECTION = 'sneakers'
```

3) Run the monitor (single run across targets):

```powershell
npm run monitor
```

Notes
-----
- Playwright usage can trigger bot defenses. For production-scale monitoring use Playwright with a pool of proxies and consider residential IPs.
- The monitor currently writes snapshots to the `sneakers` collection (or the collection you set in `FIRESTORE_COLLECTION`). Later these snapshots are normalized by `scripts/ingest.py`.
