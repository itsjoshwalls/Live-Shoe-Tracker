## Live Shoe Tracker — Quick instructions for AI coding agents

This file contains the concise, high-value facts an AI agent needs to be immediately productive across this multi-project workspace.

- Scope: this repo contains multiple related projects:
  - `live-shoe-tracker/` (root frontend prototype),
  - `shoe-tracker/` (React + Vite frontend + Python scrapers/workers), and
  - `sneaker-tracker/` (monorepo with apps: `apps/web-nextjs`, `apps/api-server`, `apps/desktop-electron`, plus `packages/`).

- Big-picture architecture:                                                                                                                                                                                                                
  - Scrapers (Python under `shoe-tracker/scripts/` and `sneaker-tracker/packages/scrapers`) collect retailer data and write to Firestore/Supabase
  - Ingestion workers (`scripts/ingest.py`, `orchestration_worker.py`) normalize/dedupe and write canonical records (defaults: `sneakers` -> `sneakers_canonical`)
  - Frontend components:
    - `shoe-tracker/`: React + Vite frontend reads Firestore canonical collections
    - `sneaker-tracker/apps/web-nextjs`: Next.js web app with Supabase integration 
    - `sneaker-tracker/apps/desktop-electron`: Electron app for offline-capable native experience
    - `sneaker-tracker/apps/api-server`: TypeScript backend with Express serving both web/desktop apps
    - Shared data shape: all frontends expect fields like `name`, `status`, `locations`, `mileage`
  - Data storage:
    - Firebase: Used by `shoe-tracker` prototype with collections like `sneakers`, `sneakers_canonical`
    - Supabase: Main DB for monorepo apps, handling auth, real-time updates, SQL storage

- Project-specific conventions (do not assume standard defaults):
  - Environment variables contain JSON strings (not only scalar values):
    - `VITE_FIREBASE_CONFIG_JSON` — stringified Firebase client config for `src/firebase.js`
    - `FIREBASE_SERVICE_ACCOUNT` — stringified service account JSON for Python/Node scripts
    - `ML_API_KEY`/`ML_API_URL` — optional ML service config for demand forecasting
  - Collection/table naming conventions:
    - Firebase: Python scripts use `--source`/`--dest` (defaults: `sneakers`/`sneakers_canonical`)
    - Supabase: Migrations in `packages/supabase-migrations/`, regional data in `region-data/[REGION]/*.csv`
  - Frontend assumptions:
    - Firebase: `listenCollection()` uses `orderBy('name')`, expects specific fields
    - Next.js: Pages under `apps/web-nextjs/pages/` follow standard routing
    - All UIs may fail silently on missing env vars - verify configuration first

- Developer workflows (PowerShell context):
  - Firebase prototype (`shoe-tracker/`):
    ```powershell
    # Frontend setup
    npm install
    $env:VITE_FIREBASE_CONFIG_JSON = Get-Content 'C:\path\to\firebase-client-config.json' -Raw
    $env:VITE_FIRESTORE_COLLECTION = 'sneakers'
    npm run dev  # Dev server
    npm run build && npm start  # Production preview (uses --strictPort)

    # Scraping/ingestion
    npx playwright install  # First time only
    $env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw
    npm run monitor  # Run Playwright scraper
    python scripts/ingest.py --source sneakers --dest sneakers_canonical [--dry-run]
    ```
  - Monorepo (`sneaker-tracker/`):
    ```powershell
    pnpm install  # Install all workspace dependencies
    
    # Start core services
    cd apps/web-nextjs && pnpm run dev  # Web UI on localhost:3000
    cd ../api-server && pnpm run start  # API on localhost:4000
    cd ../desktop-electron && pnpm run start  # Native app
    
    # Database operations
    cd ../../packages/supabase-migrations
    pnpm run migrate  # Run pending migrations
    pnpm run seed  # Populate initial data
    ```

- Integration points & gotchas:
  - Environment vars:
    - Missing Firebase config = null client = empty UI with no error
    - Service account must be full JSON string (CI injects directly)
    - Next.js needs Supabase URL/key in `apps/web-nextjs/.env.local`
  - Data validation:
    - Ingestion expects ISO date strings - update parsers for new formats
    - Document/row IDs use specific formats (e.g., `sku::ABC123`)
    - Regional data must match CSV schemas in `region-data/`

- Key files for common changes:
  - Frontend routes: `apps/web-nextjs/pages/*` (Next.js), `shoe-tracker/src/App.jsx` (Vite)
  - API endpoints: `apps/api-server/src/routes/*` (Express)
  - Data layer: 
    - Firebase: `shoe-tracker/src/firebase.js`, `scripts/ingest.py`
    - Supabase: `packages/supabase-migrations/migrations/*`
  - Scraping: 
    - Config: `scripts/shopify_stores.json`, `scripts/playwright_monitor/targets.json`
    - Implementation: `packages/scrapers/*/` (monorepo), `scripts/*_scraper.py` (prototype)
  - CI/Deploy: `.github/workflows/`, `infra/vercel.json`, `infra/docker-compose.yml`
