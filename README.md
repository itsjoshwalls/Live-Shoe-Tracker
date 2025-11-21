# Live Shoe Tracker

**Real-time sneaker release tracking application with automated scraping, Socket.IO live updates, and beautiful UI.**

## 🚀 Quick Start

```powershell
# Install dependencies
cd sneaker-tracker
pnpm install

# Start API server (port 4000)
cd apps/api-server
$env:PORT=4000
npm run dev

# Start web app (port 3002) - in new terminal
cd ../web-nextjs
$env:NEXT_PUBLIC_API_URL="http://localhost:4000"
npm run dev

# Visit: http://localhost:3002/live-releases
```

## 📦 Project Structure

```
sneaker-tracker/           # Main monorepo (USE THIS)
├── apps/
│   ├── api-server/       # Express + TypeScript + Socket.IO API
│   ├── web-nextjs/       # Next.js 14 frontend
│   └── desktop-electron/ # Electron desktop app
├── packages/
│   ├── scrapers/
│   │   ├── python/       # Python scrapers (Nike, Footlocker, etc.)
│   │   ├── shopify/      # Shopify store scraper
│   │   └── playwright_monitor/ # JavaScript-heavy site scraper
│   ├── supabase-migrations/ # Database schema
│   └── firebase-functions/  # Cloud functions
├── region-data/          # Regional retailer CSVs
└── infra/               # Docker, Vercel configs

shoe-tracker/             # Legacy prototype (being phased out)
scripts/                  # Root-level helper scripts
docs/                     # Documentation
```

## 🎯 Features

- ✅ **Real-time Updates** - Socket.IO WebSocket connections
- ✅ **Beautiful UI** - Next.js with responsive cards and live indicators
- ✅ **Multiple Scrapers** - Python, Shopify, Playwright support
- ✅ **PostgreSQL** - Supabase backend with migrations
- ✅ **Production Ready** - Deployed on Vercel
- ✅ **Type Safe** - Full TypeScript coverage

## 🔧 Environment Variables

### API Server (`apps/api-server/.env`)
```bash
PORT=4000
SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Web App (`apps/web-nextjs/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Scrapers (`packages/scrapers/python/.env`)
```bash
SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📡 Socket.IO Events

The API server emits these real-time events:

- `releases:updated` - Full release list update
- `release:new` - Single new release added

Frontend auto-subscribes and updates UI instantly.

## 🗃️ Database Schema

**Supabase PostgreSQL Tables:**

- `releases` - Sneaker releases with images[], SKU, price, status
- `retailers` - Store information (name, region, website)
- `subscriptions` - User email alerts

See: `packages/supabase-migrations/` for schema

## 🕷️ Running Scrapers

### Python Scrapers
```powershell
cd sneaker-tracker/packages/scrapers/python
$env:SUPABASE_URL = "https://npvqqzuofwojhbdlozgh.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your_key"
python footlocker_scraper.py
```

### Shopify Scraper
```powershell
cd sneaker-tracker/packages/scrapers/shopify
python shopify_scraper.py
# Scrapes stores from shopify_stores.json
```

### Playwright Monitor
```powershell
cd sneaker-tracker/packages/scrapers/playwright_monitor
npm install
npm run monitor
# Monitors JavaScript-heavy sites from targets.json
```

## 🚢 Deployment

### API Server
```powershell
cd sneaker-tracker/apps/api-server
vercel --prod
```

### Web App
```powershell
cd sneaker-tracker/apps/web-nextjs
vercel --prod
```

Environment variables must be set in Vercel dashboard.

## 📚 Documentation

- `SOCKET-IO-SETUP-COMPLETE.md` - Socket.IO integration guide
- `ARCHITECTURE.md` - System architecture overview
- `sneaker-tracker/DEPLOYMENT-GUIDE.md` - Full deployment steps
- `.github/copilot-instructions.md` - AI agent quick reference

## 🔗 Live URLs

- **Production API**: https://api-server-git-main-joshua-walls-projects.vercel.app
- **Production Web**: (Deploy from apps/web-nextjs)
- **Local Dev**: http://localhost:3002/live-releases

## 🛠️ Development

### Install All Dependencies
```powershell
npm run install
```

### Start API + Web
```powershell
# Terminal 1 - API
cd sneaker-tracker/apps/api-server
$env:PORT=4000
npm run dev

# Terminal 2 - Web
cd sneaker-tracker/apps/web-nextjs
$env:NEXT_PUBLIC_API_URL="http://localhost:4000"
npm run dev
```

### Run Database Migrations
```powershell
cd sneaker-tracker/packages/supabase-migrations
pnpm run migrate
```

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

**Built with ❤️ for sneakerheads worldwide**
