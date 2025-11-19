# Deployment Next Steps

## Current Status ✅
- ✅ API serverless function structure created (`api/index.ts`)
- ✅ API deployed to Vercel (latest: `sneaker-tracker-b5cp5n1ou-joshua-walls-projects.vercel.app`)
- ✅ Frontend deployed to Vercel (latest: `sneaker-tracker-launch-2myoeldop-joshua-walls-projects.vercel.app`)
- ✅ Environment variables configured for both projects
- ✅ Supabase connection ready (production database)
- ✅ Firebase config available (production & staging)

## Remaining Steps 🔧

### 1. Disable Deployment Protection (CRITICAL)
Both projects currently have authentication enabled on deployments. You need to disable this in Vercel:

**For Frontend (`sneaker-tracker-launch`):**
1. Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-launch/settings/deployment-protection
2. Disable "Vercel Authentication"
3. Set deployment protection to "Standard Protection" (free tier) or "No Protection"

**For API (`sneaker-tracker-api`):**
1. Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-api/settings/deployment-protection
2. Disable "Vercel Authentication"
3. Set deployment protection to "Standard Protection" (free tier) or "No Protection"

### 2. Add API URL to Frontend Environment
Add the API base URL to your frontend environment variables:

```bash
cd sneaker-tracker/apps/web-nextjs
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://sneaker-tracker-api.vercel.app
```

Then add to your local `.env.local`:
```
NEXT_PUBLIC_API_URL=https://sneaker-tracker-api.vercel.app
```

### 3. Test Endpoints
Once protection is disabled, test these URLs in your browser:

**API Endpoints:**
- https://sneaker-tracker-api.vercel.app/api/health
- https://sneaker-tracker-api.vercel.app/api/releases
- https://sneaker-tracker-api.vercel.app/api/retailers

**Frontend:**
- https://sneaker-tracker-launch.vercel.app

### 4. Update Frontend to Use API
The frontend needs to be configured to fetch data from the API instead of directly from Supabase.

**Key files to update:**
- `apps/web-nextjs/pages/index.tsx` - Update to fetch from API
- `apps/web-nextjs/lib/clientUtils.ts` - Add API client functions

Example API client code:
```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchReleases() {
  const response = await fetch(`${API_BASE_URL}/api/releases`);
  if (!response.ok) throw new Error('Failed to fetch releases');
  return response.json();
}

export async function fetchRetailers() {
  const response = await fetch(`${API_BASE_URL}/api/retailers`);
  if (!response.ok) throw new Error('Failed to fetch retailers');
  return response.json();
}
```

## Production URLs

### Current Deployments
- **Frontend:** https://sneaker-tracker-launch.vercel.app (authentication enabled)
- **API:** https://sneaker-tracker-api.vercel.app (authentication enabled)

### Supabase Database
- **URL:** https://npvqqzuofwojhbdlozgh.supabase.co
- **Tables:** `raffles`, `news_articles`, `retailers`, `price_points`
- **Sample Data:** 
  - 8 raffles from Extra Butter
  - 27 news articles from Hypebeast & SneakerNews

## Quick Commands

### Deploy Frontend
```powershell
cd sneaker-tracker/apps/web-nextjs
vercel --prod
```

### Deploy API
```powershell
cd sneaker-tracker/apps/api-server
vercel --prod
```

### Test Local API
```powershell
cd sneaker-tracker/apps/api-server
pnpm run build
node dist/server.js
# Visit http://localhost:3000/api/health
```

### Test Local Frontend
```powershell
cd sneaker-tracker/apps/web-nextjs
pnpm run dev
# Visit http://localhost:3000
```

## Troubleshooting

### API Returns 500 Error
- Check Vercel function logs: `vercel logs sneaker-tracker-api.vercel.app --follow`
- Verify environment variables are set: `vercel env ls`
- Check Supabase connection in logs

### Frontend Shows Authentication Page
- Disable deployment protection in Vercel settings
- Or add your team members to the project

### Data Not Loading
- Verify Supabase tables have data (run scrapers if needed)
- Check API endpoints return data
- Check browser console for CORS errors
