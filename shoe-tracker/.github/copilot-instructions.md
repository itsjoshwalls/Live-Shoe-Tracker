## Live Shoe Tracker — quick instructions for AI coding agents

This file contains the minimal, high-value facts an AI agent needs to be immediately productive in this repository.

- Project layout (high level):
  - Frontend: `src/` — React + Vite app. Entry: `src/main.jsx`, top component `src/App.jsx`. Feature component: `src/SneakerReleases`.
  - Firebase client helpers: `src/firebase.js` — modular Firebase v9 APIs (getFirestore, onSnapshot, updateDoc, auth helpers).
  - Scripts & workers: `scripts/` — Python scrapers/workers (e.g. `shopify_scraper.py`, `ingest.py`, `orchestration_worker.py`, `seed_firestore.py`) and a Playwright monitor at `scripts/playwright_monitor/monitor.js`.
  - Config & metadata: `package.json`, `vite.config.js`, `requirements.txt`, `scripts/shopify_stores.json`, `scripts/targets.json` (Playwright targets).

- Big-picture data flow and responsibilities:
  - Scrapers write raw documents into a Firestore collection (default `sneakers`). See `scripts/shopify_scraper.py` and `scripts/playwright_monitor/`.
  - `scripts/ingest.py` reads the raw collection, normalizes and deduplicates documents, and writes merged documents into a canonical collection (`sneakers_canonical` by default). Key function: `merge_docs()`.
  - Frontend reads a Firestore collection (env var `VITE_FIRESTORE_COLLECTION`, default `sneakers`) via `src/firebase.js`'s `listenCollection()` and displays releases. `VITE_FIREBASE_CONFIG_JSON` must contain the Firebase web-app config as a JSON string.
  - Server-side code (scripts) uses `firebase-admin` and expects the service account JSON in the `FIREBASE_SERVICE_ACCOUNT` environment variable (stringified JSON). Do NOT commit credentials.

- Important files to inspect when changing behavior:
  - `src/firebase.js` — client Firestore usage (ordering, atomic increments via `increment()`), auth helpers, and the expected env var formats.
  - `scripts/ingest.py` — canonicalization logic, grouping keys (`sku::...` or `name::...`), merge strategy, and output collection naming.
  - `scripts/playwright_monitor/monitor.js` and `scripts/targets.json` — monitor configuration and targets used by `npm run monitor`.
  - `README.md` and `README-WORKER.md` — setup notes (env vars, examples). They contain the authoritative PowerShell examples for local development.

- Project-specific conventions and patterns (not generic advice):
  - Environment variables sometimes contain JSON strings (not just single values):
    - `VITE_FIREBASE_CONFIG_JSON` — must be the stringified Firebase client config object (used by `src/firebase.js`).
    - `FIREBASE_SERVICE_ACCOUNT` — must be a JSON string of the admin SDK service account for Python workers.
  - Firestore collection names are configurable via env vars in Python scripts: `FIRESTORE_SOURCE` and `FIRESTORE_DEST`. Default values are `sneakers` and `sneakers_canonical`.
  - The ingestion script forms document IDs from normalized keys (e.g. `sku::SKU123` → `sku::SKU123` with spaces replaced). If you change canonical key rules, update both `ingest.py` and any code that assumes those IDs.
  - Frontend listens with `orderBy('name')` in `listenCollection()`; UI assumes `name`, `status`, `locations`, and `mileage` fields exist in documents.

- Common developer workflows (explicit commands & examples)
  - Frontend development (PowerShell):
    - npm install
    - Set client Firebase config (example from README):
      $env:VITE_FIREBASE_CONFIG_JSON = Get-Content 'C:\path\to\firebase-client-config.json' -Raw
      $env:VITE_FIRESTORE_COLLECTION = 'sneakers'
    - Start dev server: `npm run dev` (Vite)
  - Playwright monitor (node): `npm run monitor` (runs `scripts/playwright_monitor/monitor.js`). Check `scripts/playwright_monitor/targets.json` to add targets.
  - Ingestion / workers (Python):
    - Ensure `FIREBASE_SERVICE_ACCOUNT` is set to the service account JSON string (do not commit this file to git).
    - Run ingestion: `python scripts/ingest.py --source sneakers --dest sneakers_canonical` (use `--dry-run` to preview).
    - See `requirements.txt` for Python dependencies.
  - Lint: `npm run lint` (ESLint configuration in repo root)

- Integration notes & gotchas (learned from code):
  - The client `src/firebase.js` will silently return null if `VITE_FIREBASE_CONFIG_JSON` is unset — UI may appear empty instead of failing loudly. When debugging, confirm the env var is set and JSON parses.
  - The ingestion script expects dates in ISO format or datetime objects; it tries `datetime.fromisoformat()` and skips unparsable values. Changing date formats requires updating `ingest.py` parsing logic.
  - The repository uses `firebase-admin` in Python scripts; environment configuration is handled via an env var containing JSON, not a file path. CI workflows should set the variable rather than writing files.

- When editing or adding features, useful quick references:
  - To change how client-side mileage increments work: edit `incrementMileage()` in `src/firebase.js` (uses atomic `increment`).
  - To alter canonicalization/merge rules: edit `merge_docs()` in `scripts/ingest.py`.
  - To add scraper targets: edit `scripts/shopify_stores.json` or `scripts/playwright_monitor/targets.json`.

If anything in this summary is unclear or you'd like me to expand a specific section (e.g., add examples for CI deployment, or merge the content into an existing guidance file), tell me which part to refine. 
