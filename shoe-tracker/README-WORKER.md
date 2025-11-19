Orchestration Worker and CI
==========================

This document explains the orchestration worker (`scripts/orchestration_worker.py`), the scheduled CI workflow (`.github/workflows/scheduler.yml`), and how to configure secrets and deploy.

Files added
- `scripts/orchestration_worker.py` — background worker that updates documents in Firestore.
- `.github/workflows/scheduler.yml` — GitHub Actions workflow to run the worker on a cron schedule and manually.
- `requirements.txt` — Python dependencies used by the worker.

Env / Secrets required
- FIREBASE_SERVICE_ACCOUNT (required) — the entire JSON content of a Firebase Admin Service Account key. Add to GitHub Secrets as `FIREBASE_SERVICE_ACCOUNT`.
- ML_API_KEY (optional) — API key used to authenticate to your ML provider; add as `ML_API_KEY`.
- ML_API_URL (optional) — URL of your ML inference endpoint. Add as `ML_API_URL`.
- FIRESTORE_COLLECTION (optional) — collection name to use (defaults to `sneakers`). Add as `FIRESTORE_COLLECTION` if you want a different collection.

Auth and Firestore Rules (production guidance)
- The frontend supports Google Sign-in. To allow client updates only for admin users, set a custom claim `admin: true` on the user's account in Firebase Authentication (via the Admin SDK).
- Example (set custom claim using Admin SDK):

```python
from firebase_admin import auth
auth.set_custom_user_claims(uid, {"admin": True})
```

- Example Firestore rules (see `firestore.rules` in this repo):
  - Allow reads to authenticated users.
  - Allow client-side updates only if `request.auth.token.admin == true`.
  - The scheduled worker uses the Admin SDK and bypasses these rules.

Local development / run
1) Install dependencies (recommended to use a virtualenv):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Set the `FIREBASE_SERVICE_ACCOUNT` env var in your shell (PowerShell example):

```powershell
# Example: read the downloaded service-account JSON into the env var
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw
```

3) Optionally set ML env vars:

```powershell
$env:ML_API_KEY = 'MySecretMLPass123'
$env:ML_API_URL = 'https://your-ml.example/predict'
```

4) Run the worker locally:

```powershell
python scripts/orchestration_worker.py
```

What the worker expects
- Firestore collection (default `sneakers`) with documents that may include a numeric `mileage` field.
- The worker will call your ML endpoint (if both `ML_API_KEY` and `ML_API_URL` are set) using a payload {"features": <document-data>} and expects a JSON response containing either `increment` or `{ result: { increment: <number> } }`.

GitHub Actions
- The workflow runs on a cron schedule (hourly by default) and can also be triggered manually in the Actions UI.
- Configure the repository secrets under Settings → Secrets & variables → Actions:
  - FIREBASE_SERVICE_ACCOUNT: paste the full admin JSON
  - ML_API_KEY: your ML key (optional)
  - ML_API_URL: your ML endpoint (optional)
  - FIRESTORE_COLLECTION: optional custom collection name

Push / commit steps (run locally)
```powershell
git add .
git commit -m "chore(worker): add orchestration worker, workflow and docs"
git push origin HEAD
```

Manual testing of automation
1) After push and setting secrets, go to GitHub → Actions → Scheduled Orchestration Worker → Run workflow.
2) After the run completes, check Firestore documents or your live app to confirm mileage changed.

Notes / Next steps
- Replace the placeholder ML endpoint URL with your real inference service; ensure the response shape includes an `increment` value.
- Consider limiting the worker's write permissions with a dedicated service account and Firestore security rules.
