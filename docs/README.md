# Live Shoe Tracker - Documentation Hub

**Last Updated:** November 18, 2025

This directory contains consolidated documentation for all Live Shoe Tracker projects.

## 📁 Project Structure

This workspace contains THREE main projects:

1. **`shoe-tracker/`** - Firebase + Vite prototype (Python scrapers + Playwright monitor)
2. **`sneaker-tracker/`** - Production monorepo (Next.js web + Electron desktop + API server + scrapers)
3. **Root documentation** - Cross-project guides

## 🚀 Quick Start

**New to the project?** Start here:

1. **Setup**: See `SETUP-GUIDE.md` in project root
2. **Firebase Integration**: `../sneaker-tracker/FIREBASE-SETUP.md`
3. **Deployment**: `../sneaker-tracker/DEPLOYMENT-GUIDE.md`

## 📚 Core Documentation

### Setup & Configuration
- **`../SETUP-GUIDE.md`** - Comprehensive local development setup
- **`../QUICK-START.md`** - Fast-track setup (< 10 min)
- **`../sneaker-tracker/FIREBASE-SETUP.md`** - Firebase + Firestore configuration
- **`../sneaker-tracker/INTEGRATION-GUIDE.md`** - Connect all services (Firebase, Supabase, GA, Docker)

### Deployment
- **`../DEPLOYMENT-CHECKLIST.md`** - Production deployment steps
- **`../sneaker-tracker/DEPLOYMENT-GUIDE.md`** - Vercel + Docker deployment
- **`../sneaker-tracker/VERCEL-DEPLOYMENT.md`** - Complete Vercel setup guide
- **`../sneaker-tracker/LAUNCH-READINESS.md`** - Pre-launch verification

### Architecture & Design
- **`../ARCHITECTURE.md`** - System architecture overview
- **`../sneaker-tracker/docs/architecture.md`** - Monorepo architecture
- **`../CONNECTION-ARCHITECTURE.md`** - Service integration map
- **`../FEATURE-COMPARISON.md`** - Feature matrix

### Data & Scraping
- **`../shoe-tracker/scripts/README-PLAYWRIGHT.md`** - Playwright monitor (12 targets)
- **`../sneaker-tracker/packages/scrapers/COMPLETE-SETUP-GUIDE.md`** - Scraper ecosystem (38 stores)
- **`../sneaker-tracker/packages/scrapers/python/QUICKSTART.md`** - Python scrapers (5-min setup)
- **`../sneaker-tracker/docs/dataset_schema.md`** - Data model reference

## 🎯 Project-Specific Docs

### shoe-tracker/ (Prototype)
- `README.md` - Project overview
- `README-WORKER.md` - Orchestration worker
- `scripts/ingest.py` - Data normalization pipeline

### sneaker-tracker/ (Production Monorepo)
- `README.md` - Monorepo overview
- `QUICK-REFERENCE.md` - Command cheat sheet
- `apps/web-nextjs/README-FEATURES.md` - Frontend features
- `apps/api-server/README-ENV.md` - API environment setup
- `packages/scrapers/ECOSYSTEM-MAP.md` - Complete scraper inventory

## 🗑️ Deprecated / Archived

The following docs are **outdated** or **superseded** by the guides above:

- `IMPLEMENTATION-COMPLETE.md` → See `DEPLOYMENT-CHECKLIST.md`
- `GETTING-STARTED.md` → See `QUICK-START.md`
- `DISCORD-SETUP.md` → Webhooks covered in `INTEGRATION-GUIDE.md`
- Multiple `SETUP-COMPLETE.md` files → See `LAUNCH-READINESS.md`

## 🆘 Troubleshooting

**Common issues:**

| Problem | Solution |
|---------|----------|
| Firebase not connecting | Check `FIREBASE_SERVICE_ACCOUNT` env var (see `sneaker-tracker/FIREBASE-SETUP.md`) |
| Supabase 401 errors | Verify `SUPABASE_SERVICE_ROLE_KEY` (see `INTEGRATION-GUIDE.md`) |
| Playwright browser errors | Run `npx playwright install chromium` in `shoe-tracker/` |
| Next.js build errors | Delete `.next/` folder and rebuild |

**Full troubleshooting:** See `SETUP-GUIDE.md` section 5

## 💡 Best Practices

1. **Environment variables**: Always use `.env` files (never commit secrets)
2. **Python scrapers**: Run from correct directory (check copilot-instructions.md)
3. **Database writes**: Prefer Supabase for production, Firebase for prototyping
4. **Migrations**: Apply via Supabase SQL Editor (see `packages/supabase-migrations/APPLY-MIGRATION.md`)

## 📞 Need Help?

- Check the **Quick Reference** in each project's README
- Review `.github/copilot-instructions.md` for project conventions
- See `sneaker-tracker/VERIFICATION-COMPLETE.md` for system health checks
