# 🚀 Live Shoe Tracker - Production Launch Checklist

**Last Updated:** November 21, 2024  
**Status:** Ready for launch after completing this checklist

---

## Pre-Deployment Checks

### ✅ Code Quality
- [x] All TypeScript builds pass without errors
- [x] React version conflicts resolved (using React 18.x)
- [x] Socket.IO client dependency added to frontend
- [x] Environment variable examples are up to date
- [ ] All linters pass (run `pnpm run lint` in each app)
- [ ] No console errors in browser during local testing

### ✅ Dependencies
- [x] API Server dependencies installed (`apps/api-server`)
- [x] Web Next.js dependencies installed (`apps/web-nextjs`)
- [x] All package.json files have pinned versions (no "latest")
- [x] Socket.io-client version matches server (4.8.1)

### ✅ Build Verification
- [x] API Server builds successfully: `cd apps/api-server && npm run build`
- [x] Next.js builds successfully: `cd apps/web-nextjs && npm run build`
- [ ] No TypeScript errors during build
- [ ] Bundle size is acceptable (< 500KB for main bundle)

---

## Environment Configuration

### API Server Environment Variables (Vercel Project Settings)

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Get from Supabase Dashboard → Settings → API
SUPABASE_ANON_KEY=eyJ...          # Get from Supabase Dashboard → Settings → API

# Optional but recommended
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server Configuration
PORT=4000                          # Vercel will override this
NODE_ENV=production

# CORS (update with your frontend URL after deployment)
CORS_ORIGIN=https://your-app.vercel.app

# Optional - Redis for caching
REDIS_URL=redis://your-redis-instance:6379
```

### Frontend Environment Variables (Vercel Project Settings)

```bash
# Required - API Server URL
NEXT_PUBLIC_API_URL=https://your-api-server.vercel.app

# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional - Firebase
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}

# Optional - Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Checklist:**
- [ ] Copy environment variables from `.env.example` files
- [ ] Set all variables in Vercel dashboard for both projects
- [ ] Mark all as "Production" environment
- [ ] Never commit actual credentials to Git

---

## Deployment Steps

### 1. Deploy API Server First

**Via Vercel Dashboard:**
1. [ ] Go to [vercel.com/new](https://vercel.com/new)
2. [ ] Import your GitHub repository
3. [ ] Create new project for API Server
4. [ ] Configure:
   - Framework Preset: `Other`
   - Root Directory: `apps/api-server`
   - Build Command: `npm run build`
   - Output Directory: (leave empty)
   - Install Command: `npm install`
5. [ ] Add all environment variables from above
6. [ ] Deploy and wait for completion
7. [ ] Copy the deployment URL (e.g., `https://your-api-server.vercel.app`)
8. [ ] Test health endpoint: `https://your-api-server.vercel.app/api/health`

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-21T13:00:00.000Z",
  "uptime": 123,
  "database": "connected"
}
```

### 2. Deploy Frontend

**Via Vercel Dashboard:**
1. [ ] Create new project for Frontend
2. [ ] Configure:
   - Framework Preset: `Next.js`
   - Root Directory: `apps/web-nextjs`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install` (Vercel will use frozen lockfile by default)
3. [ ] Add all frontend environment variables
4. [ ] **Important:** Set `NEXT_PUBLIC_API_URL` to your API server URL from step 1
5. [ ] Deploy and wait for completion
6. [ ] Copy the frontend URL (e.g., `https://your-app.vercel.app`)

### 3. Update CORS Configuration

After both deployments:
1. [ ] Go to API Server project in Vercel
2. [ ] Settings → Environment Variables
3. [ ] Update `CORS_ORIGIN` to your frontend URL
4. [ ] Redeploy API server

---

## Post-Deployment Verification

### Frontend Checks
- [ ] Visit `https://your-app.vercel.app`
- [ ] Homepage loads without errors
- [ ] Navigate to `/live-releases` page
- [ ] Check browser console for errors
- [ ] Verify Socket.IO connection indicator shows "Connected"
- [ ] Test responsive design on mobile

### API Checks
- [ ] Test health endpoint: `curl https://your-api-server.vercel.app/api/health`
- [ ] Test releases endpoint: `curl https://your-api-server.vercel.app/api/releases?limit=5`
- [ ] Check Vercel logs for any errors
- [ ] Verify Supabase queries are working

### Real-Time Features
- [ ] Open `/live-releases` in two browser windows
- [ ] Verify Socket.IO connection status shows "Connected" in both
- [ ] Run a scraper to add new releases (see below)
- [ ] Verify both windows update in real-time

### Integration Tests
```bash
# Test API connectivity from frontend
curl https://your-app.vercel.app/api/releases

# Test Socket.IO connection (check browser console on /live-releases)
# Should see: "Socket.IO connected"
```

---

## Running Scrapers

After deployment, test the scraping → API → frontend flow:

```powershell
# Set environment variables
$env:API_BASE_URL = "https://your-api-server.vercel.app"
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"

# Run a test scraper
cd sneaker-tracker/packages/scrapers
pnpm install
pnpm run start kith

# Verify releases appear in:
# 1. Supabase dashboard (releases table)
# 2. Frontend (refresh /live-releases)
# 3. Socket.IO updates (watch real-time)
```

**Checklist:**
- [ ] Scraper successfully connects to API
- [ ] New releases appear in Supabase
- [ ] Frontend displays new releases
- [ ] Real-time updates work via Socket.IO

---

## Performance Optimization

### Vercel Analytics
- [ ] Enable Vercel Analytics in dashboard
- [ ] Monitor Core Web Vitals
- [ ] Target scores: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Caching
- [ ] Verify Next.js automatic static optimization
- [ ] Check API responses have appropriate cache headers
- [ ] Configure Redis if needed for API caching

### Monitoring
- [ ] Set up error tracking (Sentry or similar)
- [ ] Configure uptime monitoring
- [ ] Set up alerts for 5xx errors

---

## Domain Configuration (Optional)

If you have a custom domain:

1. [ ] Add domain in Vercel dashboard
2. [ ] Configure DNS records:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A
   Name: @
   Value: 76.76.21.21
   ```
3. [ ] Wait for DNS propagation (5-60 minutes)
4. [ ] Update environment variables with new domain
5. [ ] Update CORS_ORIGIN in API server
6. [ ] Redeploy both projects

---

## Security Checklist

- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Security headers configured (in vercel.json)
- [ ] CORS properly restricted to your domain
- [ ] Service role keys only in API server (never in frontend)
- [ ] Anon keys only in frontend
- [ ] Rate limiting enabled in API server
- [ ] No credentials committed to Git

---

## Troubleshooting

### Build Failures

**Issue: "Module not found"**
- Check all dependencies are in package.json
- Verify pnpm-lock.yaml is committed
- Try: `pnpm install --no-frozen-lockfile`

**Issue: "TypeScript errors"**
- Run `npm run build` locally first
- Check all type definitions are installed
- Verify tsconfig.json is correct

### Runtime Errors

**Issue: "Failed to connect to API"**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check API server is deployed and running
- Test API endpoint directly with curl
- Check CORS configuration

**Issue: "Supabase connection failed"**
- Verify Supabase URL is correct
- Check API keys are valid
- Test connection from Supabase dashboard
- Check rate limits aren't exceeded

**Issue: "Socket.IO not connecting"**
- Verify API server supports WebSocket connections
- Check CORS allows Socket.IO origin
- Review browser console for connection errors
- Ensure both frontend and backend use same Socket.IO version

---

## Launch Readiness Score

### Current Status: ✅ Ready for Launch

- ✅ **Code Quality**: All builds pass
- ✅ **Dependencies**: Properly configured
- ✅ **Environment**: Templates ready
- ⏳ **Deployment**: Pending user action
- ⏳ **Verification**: Pending deployment
- ⏳ **Monitoring**: Pending setup

### What's Working:
1. ✅ API server builds successfully
2. ✅ Frontend builds successfully
3. ✅ Socket.IO integration configured
4. ✅ Environment variable templates complete
5. ✅ Supabase integration ready
6. ✅ Real-time updates architecture in place

### Next Actions:
1. Deploy API server to Vercel
2. Deploy frontend to Vercel
3. Configure environment variables
4. Test end-to-end flow
5. Run scrapers and verify data flow
6. Monitor performance and errors

---

## Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Supabase Docs**: https://supabase.com/docs
- **Socket.IO Docs**: https://socket.io/docs/v4/

---

**Ready to Launch!** 🚀

Follow this checklist step by step, and your Live Shoe Tracker will be live and fully functional.
