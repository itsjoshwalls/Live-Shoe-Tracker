# Connect Vercel to GitHub for Automatic Deployments

## ✅ Completed
- Committed and pushed changes to GitHub (commit: 588ac53)
- Created `api/index.js` serverless entry point
- Simplified `vercel.json` configuration

## 🎯 Next Steps: Connect GitHub to Vercel

### API Server (sneaker-tracker-api)

**1. Go to Vercel Dashboard**
- Open: https://vercel.com/joshua-walls-projects/sneaker-tracker-api/settings/git

**2. Connect to Git Repository**
- Click **Connect Git Repository** button
- Select **GitHub**
- Authorize Vercel if needed
- Search for: `itsjoshwalls/Live-Shoe-Tracker`
- Click **Connect**

**3. Configure Git Settings**
After connecting, you'll see:
- **Production Branch**: Set to `main` ✓
- **Ignored Build Step**: Leave unchecked

**4. Configure Project Settings**
Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-api/settings

**General Tab:**
- **Root Directory**: `sneaker-tracker/apps/api-server`
- Click **Save**

**Build & Development Settings:**
- **Framework Preset**: Other
- **Build Command**: Override with `npm install && npm run build`
- **Output Directory**: Leave default (blank for serverless)
- **Install Command**: Leave as default (Vercel auto-detects)
- **Development Command**: `npm run dev`
- Click **Save**

**5. Verify Environment Variables**
Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-api/settings/environment-variables

Ensure these exist for **Production** (and Preview/Development if needed):
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key_here
SUPABASE_ANON_KEY = your_anon_key_here
NODE_ENV = production
```

**6. Trigger Deployment**
Two options:

**Option A - Dashboard:**
1. Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-api
2. Click **Deployments** tab
3. Click **Create Deployment**
4. Select branch: `main`
5. Click **Deploy**

**Option B - Git Push (Automatic):**
- GitHub integration is now active
- Every push to `main` will auto-deploy
- Current commit (588ac53) should deploy automatically

---

### Frontend (sneaker-tracker-launch)

**1. Connect Git Repository**
- Open: https://vercel.com/joshua-walls-projects/sneaker-tracker-launch/settings/git
- Click **Connect Git Repository**
- Select **GitHub**
- Choose: `itsjoshwalls/Live-Shoe-Tracker`
- Click **Connect**

**2. Configure Project Settings**
Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-launch/settings

**General Tab:**
- **Root Directory**: `sneaker-tracker/apps/web-nextjs`
- Click **Save**

**Build & Development Settings:**
- **Framework Preset**: Next.js (auto-detected)
- **Build Command**: `npm run build` (or override with `pnpm run build`)
- **Output Directory**: Leave default (`.next`)
- **Install Command**: Leave default or override with `npm install`
- **Development Command**: `npm run dev`
- Click **Save**

**3. Environment Variables**
Go to: https://vercel.com/joshua-walls-projects/sneaker-tracker-launch/settings/environment-variables

Add for **Production** environment:
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key_here
NEXT_PUBLIC_API_URL = https://sneaker-tracker-api.vercel.app
NEXT_PUBLIC_FIREBASE_CONFIG = {"apiKey":"...","authDomain":"...","projectId":"..."}
```

Optional:
```
NEXT_PUBLIC_GA_MEASUREMENT_ID = G-XXXXXXXXXX
```

**4. Deploy**
- Visit: https://vercel.com/joshua-walls-projects/sneaker-tracker-launch
- Click **Create Deployment** → Select `main` → Deploy

---

## 🔍 Verification

### After API Deploys Successfully:

**Test Health Endpoints:**
```powershell
# Basic health
Invoke-RestMethod -Uri "https://sneaker-tracker-api.vercel.app/api/health"

# Env details
Invoke-RestMethod -Uri "https://sneaker-tracker-api.vercel.app/api/health/details"

# Supabase readiness
Invoke-RestMethod -Uri "https://sneaker-tracker-api.vercel.app/api/health/ready"

# Actual data
Invoke-RestMethod -Uri "https://sneaker-tracker-api.vercel.app/api/releases"
```

**Expected Results:**
- `/api/health` → `{"status":"ok","uptime":...}`
- `/api/health/details` → All env vars show `true`
- `/api/health/ready` → HTTP 200 (not 503)
- `/api/releases` → JSON array of releases (or empty `[]`)

### After Frontend Deploys:

**Open in Browser:**
```powershell
Start-Process "https://sneaker-tracker-launch.vercel.app"
```

**Check Console:**
- No CORS errors
- API calls to `https://sneaker-tracker-api.vercel.app` succeed
- Supabase connection established
- Data loads correctly

---

## 📋 Checklist

### API Server
- [ ] Git repository connected
- [ ] Root directory set to `sneaker-tracker/apps/api-server`
- [ ] Build command: `npm install && npm run build`
- [ ] Environment variables configured (4 vars)
- [ ] Deployment triggered
- [ ] Build succeeds (no lockfile errors)
- [ ] `/api/health` returns 200
- [ ] `/api/health/ready` returns 200
- [ ] `/api/releases` returns data

### Frontend
- [ ] Git repository connected  
- [ ] Root directory set to `sneaker-tracker/apps/web-nextjs`
- [ ] Build command configured
- [ ] Environment variables set (4-5 vars)
- [ ] Deployment triggered
- [ ] Build succeeds
- [ ] App loads in browser
- [ ] API integration works
- [ ] No console errors

---

## 🚨 Troubleshooting

### API Build Fails
1. Check build logs for specific error
2. Verify `package.json` has all dependencies
3. Confirm TypeScript compiles locally: `cd sneaker-tracker/apps/api-server && npm run build`
4. Check env vars are set in Vercel dashboard

### 404 on API Endpoints
- Verify `api/index.js` exists and was deployed
- Check `vercel.json` routes configuration
- Look at deployment file list to ensure `dist/` folder included

### Frontend Can't Connect to API
- Check CORS settings in API (`src/server.ts`)
- Verify `NEXT_PUBLIC_API_URL` env var is set correctly
- Test API endpoint directly in browser
- Check Network tab in browser DevTools

### Environment Variables Not Working
- Ensure vars are set for correct environment (Production/Preview/Development)
- Redeploy after adding env vars
- No leading/trailing spaces in values
- For JSON values (FIREBASE_CONFIG), ensure valid JSON

---

## 🎉 Success Criteria

You'll know everything works when:

1. ✅ Push to `main` automatically triggers Vercel deployment
2. ✅ API health endpoints return 200 OK
3. ✅ Frontend loads without errors
4. ✅ API calls from frontend succeed
5. ✅ Data from Supabase displays correctly
6. ✅ No build errors in Vercel logs

---

## 📞 Quick Links

- **API Dashboard**: https://vercel.com/joshua-walls-projects/sneaker-tracker-api
- **Frontend Dashboard**: https://vercel.com/joshua-walls-projects/sneaker-tracker-launch
- **GitHub Repo**: https://github.com/itsjoshwalls/Live-Shoe-Tracker
- **API URL**: https://sneaker-tracker-api.vercel.app
- **Frontend URL**: https://sneaker-tracker-launch.vercel.app

---

**Current Status:**
- Latest commit: `588ac53` - feat(api): add JS entry point and improve Vercel deployment
- Pushed to GitHub: ✅
- Vercel connected: ⏳ (your next step)
