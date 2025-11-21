## Live Shoe Tracker — Quick instructions for AI coding agents

This file contains the concise, high-value facts an AI agent needs to be immediately productive in this workspace.

- **Scope**: This is a unified monorepo for the Live Shoe Tracker application
  - Main project: `sneaker-tracker/` - Production monorepo containing:
    - `apps/web-nextjs` - Next.js web application
    - `apps/api-server` - Express + TypeScript API with Socket.IO
    - `apps/desktop-electron` - Electron desktop app
    - `packages/scrapers/` - All scraping tools (Python, Playwright, Shopify)
    - `packages/firebase-functions/` - Cloud functions
    - `packages/supabase-migrations/` - Database migrations
  - Legacy: `shoe-tracker/` - Old prototype (to be phased out)
  - Helper scripts: `scripts/` - Root-level utilities

- **Big-picture architecture**:
  - Scrapers collect retailer data and write to Supabase PostgreSQL
    - Python scrapers: `packages/scrapers/python/` (Nike, Footlocker, JD Sports, etc.)
    - Shopify scraper: `packages/scrapers/shopify/` with store list
    - Playwright monitor: `packages/scrapers/playwright_monitor/` for JavaScript-heavy sites
  - API Server (`apps/api-server`): Express + TypeScript + Socket.IO
    - Serves REST endpoints (`/api/releases`, `/api/retailers`, etc.)
    - Real-time updates via Socket.IO WebSocket
    - Deployed on Vercel serverless
  - Frontend (`apps/web-nextjs`): Next.js 14 with Supabase integration
    - Real-time UI with Socket.IO client
    - Deployed on Vercel
  - Database: Supabase PostgreSQL
    - Tables: `releases`, `retailers`, `subscriptions`
    - Migrations: `packages/supabase-migrations/`
    - Regional data: `region-data/[REGION]/*.csv`

- **Project-specific conventions**:
  - Environment variables:
    - `SUPABASE_URL` - Supabase project URL
    - `SUPABASE_SERVICE_ROLE_KEY` - For scrapers/migrations (server-side only)
    - `NEXT_PUBLIC_SUPABASE_URL` - Client-side Supabase URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client-side public key
    - `NEXT_PUBLIC_API_URL` - API server URL (http://localhost:4000 local, Vercel URL prod)
  - Database schema:
    - Tables use snake_case: `releases`, `retailers`, `subscriptions`
    - Common fields: `id`, `name`, `sku`, `brand`, `price`, `status`, `date`, `images[]`
    - Timestamps: `created_at`, `updated_at` (auto-managed)
  - Socket.IO events:
    - `releases:updated` - Broadcast full release list update
    - `release:new` - Broadcast single new release

- **Developer workflows** (PowerShell):
  ```powershell
  # One-time setup
  cd sneaker-tracker
  pnpm install

  # Start development servers
  cd apps/api-server
  $env:PORT=4000
  npm run dev  # API + Socket.IO on :4000

  cd ../web-nextjs
  $env:NEXT_PUBLIC_API_URL="http://localhost:4000"
  npm run dev  # Next.js on :3002

  # Run scrapers
  cd ../../packages/scrapers/python
  $env:SUPABASE_URL="https://npvqqzuofwojhbdlozgh.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
  python footlocker_scraper.py
  
  # Shopify scraper
  cd ../shopify
  python shopify_scraper.py
  
  # Playwright monitor
  cd ../playwright_monitor
  npm install
  npm run monitor

  # Database migrations
  cd ../../packages/supabase-migrations
  pnpm run migrate
  ```

- **Integration points & gotchas**:
  - Socket.IO requires HTTP server wrapper (not plain Express `app.listen`)
  - Images field is an array: `images: string[]` (first image = primary)
  - Empty images show placeholder UI (👟 "No image available")
  - All scrapers should write directly to Supabase (no Firebase intermediary)
  - Regional data in `region-data/` is reference data, not live scraping targets
  - Vercel deployments need environment variables set in dashboard

- **Key files for common changes**:
  - Frontend pages: `apps/web-nextjs/pages/*`
  - API routes: `apps/api-server/src/routes/*`
  - Socket.IO server: `apps/api-server/src/server.ts` (exports `io`)
  - Database schema: `packages/supabase-migrations/migrations/*`
  - Scraper configs: 
    - Shopify stores: `packages/scrapers/shopify/shopify_stores.json`
    - Playwright targets: `packages/scrapers/playwright_monitor/targets.json`
  - Scraper implementations: `packages/scrapers/python/*_scraper.py`
  - CI/CD: `.github/workflows/*`
