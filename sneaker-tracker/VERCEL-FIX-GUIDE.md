# Vercel Deployment Fix Guide

## Problem
Vercel project settings have `rootDirectory: "sneaker-tracker/apps/api-server"` which causes path duplication when deploying from that directory.

## Solution: Fix via Vercel Dashboard

### Step 1: Update API Server Project Settings
1. Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-api/settings
2. Click **General** tab
3. Scroll to **Root Directory**
4. **IMPORTANT**: Set it to `.` (just a dot) or leave it blank
5. Click **Save**

### Step 2: Update Build & Install Commands
Still in Project Settings:
1. Scroll to **Build & Development Settings**
2. Set these values:
   - **Framework Preset**: Other
   - **Build Command**: `pnpm run build`
   - **Output Directory**: Leave as default or set to `dist`
   - **Install Command**: Override and set to `cd ../.. && pnpm install --no-frozen-lockfile`
   - **Development Command**: `pnpm run dev`
3. Click **Save**

### Step 3: Verify Environment Variables
1. Go to **Environment Variables** tab
2. Ensure these are set for **Production**:
   ```
   SUPABASE_URL = https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = your_actual_service_role_key
   ```
3. Optional but recommended:
   ```
   SUPABASE_ANON_KEY = your_anon_key
   NODE_ENV = production
   ```

### Step 4: Trigger Manual Deployment
1. Go to **Deployments** tab
2. Find the latest commit (`e8254f8 - chore(vercel): switch to pnpm...`)
3. Click the three dots menu `...` next to it
4. Click **Redeploy**
5. Check **Use existing Build Cache** = OFF
6. Click **Redeploy**

### Step 5: Monitor Build
Watch the build logs for:
- ✅ Install command uses `--no-frozen-lockfile`
- ✅ No `ERR_PNPM_OUTDATED_LOCKFILE` error
- ✅ Build completes successfully

---

## Alternative: Redeploy from Monorepo Root

If dashboard method doesn't work, deploy from workspace root:

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker
vercel --cwd apps/api-server --prod --yes
```

---

## Frontend (web-nextjs) - Same Process

### Dashboard Settings
1. Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-launch/settings
2. **Root Directory**: Set to `.` or blank
3. **Build Command**: `pnpm run build`
4. **Install Command**: Override to `cd ../.. && pnpm install --no-frozen-lockfile`
5. **Framework**: Next.js (should auto-detect)

### Environment Variables (Production)
```
NEXT_PUBLIC_SUPABASE_URL = https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
NEXT_PUBLIC_FIREBASE_CONFIG = {...your firebase config JSON...}
NEXT_PUBLIC_API_URL = https://sneaker-tracker-api.vercel.app
NEXT_PUBLIC_GA_MEASUREMENT_ID = (if using GA)
```

---

## Verification Commands

After successful deployment, test these URLs:

### API Server
```powershell
# Health check
Invoke-WebRequest -Uri "https://sneaker-tracker-api.vercel.app/api/health" | Select-Object -ExpandProperty Content

# Detailed env check
Invoke-WebRequest -Uri "https://sneaker-tracker-api.vercel.app/api/health/details" | Select-Object -ExpandProperty Content

# Readiness probe (tests Supabase)
Invoke-WebRequest -Uri "https://sneaker-tracker-api.vercel.app/api/health/ready" | Select-Object -ExpandProperty Content

# Actual data endpoint
Invoke-WebRequest -Uri "https://sneaker-tracker-api.vercel.app/api/releases" | Select-Object -ExpandProperty Content
```

### Frontend
```powershell
# Just open in browser
Start-Process "https://sneaker-tracker-launch.vercel.app"
```

---

## Troubleshooting

### Still getting path errors?
- Delete `.vercel` folder in `apps/api-server` and `apps/web-nextjs`
- Run `vercel link` to re-link
- Then redeploy

### Build still fails on lockfile?
- Verify install command includes `--no-frozen-lockfile`
- Check commit being built is `e8254f8` or later
- Clear build cache and redeploy

### 500 errors on /api/health/ready?
- Check Supabase env vars are set correctly
- Verify service role key (not anon key) is used
- Check Supabase project URL matches

---

## Quick Commands Reference

```powershell
# Navigate to project
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker

# Check git status
git log --oneline -5
git status

# Verify env locally (API)
pwsh apps/api-server/scripts/verify-env.ps1

# List Vercel projects
vercel projects ls

# Check current deployment
vercel inspect --url https://sneaker-tracker-api.vercel.app

# View deployment logs
vercel logs https://sneaker-tracker-api.vercel.app
```
