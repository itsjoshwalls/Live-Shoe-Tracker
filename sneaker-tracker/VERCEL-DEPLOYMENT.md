# Vercel Deployment Guide - Live Shoe Tracker

**Last Updated:** November 18, 2025  
**Status:** Ready for production deployment

## 📋 Overview

This guide covers deploying both the **Next.js frontend** and **Express API server** to Vercel.

### Deployment Architecture

```
Vercel Production:
├── web-nextjs (apps/web-nextjs)     → sneaker-tracker.vercel.app
└── api-server (apps/api-server)     → sneaker-tracker-api.vercel.app
```

## 🚀 Quick Deploy

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): `npm i -g vercel`
3. **Git Repository**: Push your code to GitHub/GitLab/Bitbucket
4. **Environment Variables**: Supabase and Firebase credentials ready

### One-Click Deploy (GitHub)

1. **Connect Repository**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Select `sneaker-tracker` as root directory

2. **Configure Projects**:
   
   **Frontend (web-nextjs):**
   - Framework Preset: `Next.js`
   - Root Directory: `apps/web-nextjs`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

   **API Server (api-server):**
   - Framework Preset: `Other`
   - Root Directory: `apps/api-server`
   - Build Command: `npm run build` (or leave empty)
   - Output Directory: (leave empty)
   - Install Command: `npm install`

3. **Set Environment Variables** (see below)

4. **Deploy**: Click "Deploy"

## 🔐 Environment Variables

### Required for Frontend (web-nextjs)

Add these in Vercel Project Settings → Environment Variables:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Firebase (Optional - for real-time features)
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"live-sneaker-release-tra-df5a4",...}

# Google Analytics (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**How to get values:**
- **Supabase**: Dashboard → Settings → API
- **Firebase**: Console → Project Settings → General → Your apps → Web app config
- **GA**: Analytics → Admin → Data Streams

### Required for API Server (api-server)

```bash
# Supabase (Required)
SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(service role key)

# Firebase Admin (Required for scrapers/workers)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"live-sneaker-release-tra-df5a4",...}

# Node Environment
NODE_ENV=production

# Port (Vercel will set this automatically)
PORT=3000
```

**Security Notes:**
- ✅ Use **service role key** for API server (has full permissions)
- ✅ Use **anon key** for frontend (public-safe, RLS protected)
- ❌ Never commit keys to Git
- ✅ Set all keys as **Production** environment in Vercel

## 📦 Vercel CLI Deployment

### Initial Setup

```powershell
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link projects (run in each app directory)
cd apps/web-nextjs
vercel link

cd ../api-server
vercel link
```

### Deploy Frontend

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Deploy API Server

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🔗 Connecting Frontend to API

After deploying both apps, update the frontend to point to the API:

**Option 1: Update `vercel.json` in web-nextjs**

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://sneaker-tracker-api.vercel.app/api/:path*"
    }
  ]
}
```

**Option 2: Add environment variable**

```bash
# In Vercel dashboard for web-nextjs
NEXT_PUBLIC_API_URL=https://sneaker-tracker-api.vercel.app
```

Then update API calls in your code:
```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

## 🔄 GitHub Actions Auto-Deploy

Your CI/CD is already configured in `.github/workflows/ci-cd.yml`.

### Required GitHub Secrets

Add these in GitHub → Repository → Settings → Secrets:

```bash
# Vercel
VERCEL_TOKEN           # From vercel.com/account/tokens
VERCEL_ORG_ID          # From .vercel/project.json (after vercel link)
VERCEL_PROJECT_ID      # From .vercel/project.json (after vercel link)

# Database
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Firebase
FIREBASE_CLIENT_CONFIG      # Client config JSON (stringified)
FIREBASE_SERVICE_ACCOUNT    # Service account JSON (stringified)

# Analytics
GA_MEASUREMENT_ID

# Docker (optional)
DOCKER_USERNAME
DOCKER_PASSWORD
```

**Get Vercel tokens:**
```powershell
# After running 'vercel link' in each app:
cd apps/web-nextjs
Get-Content .vercel/project.json
# Copy "orgId" and "projectId"
```

**Create Vercel token:**
1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name: "GitHub Actions Deploy"
4. Scope: Full Account
5. Copy token and add to GitHub Secrets as `VERCEL_TOKEN`

## 📊 Post-Deployment Checklist

After deploying, verify:

### Frontend Checks

- [ ] Navigate to `https://your-app.vercel.app`
- [ ] Check homepage loads
- [ ] Test `/raffles` page shows data from Supabase
- [ ] Test `/news` page shows articles
- [ ] Verify filters work (brand, status)
- [ ] Check browser console for errors
- [ ] Verify Supabase connection (no 401 errors)

### API Checks

- [ ] Test health endpoint: `https://your-api.vercel.app/api/health`
- [ ] Test releases endpoint: `https://your-api.vercel.app/api/releases?limit=10`
- [ ] Check Vercel logs for errors
- [ ] Verify Supabase queries work

### Performance

- [ ] Run Lighthouse audit (target: 90+ performance)
- [ ] Check Core Web Vitals in Vercel dashboard
- [ ] Verify image optimization working
- [ ] Test mobile responsiveness

## 🛠️ Troubleshooting

### Build Errors

**Error: "Module not found"**
```bash
# Make sure package.json includes all dependencies
cd apps/web-nextjs
npm install --save-dev @types/react @types/node
```

**Error: "Environment variable not defined"**
- Check Vercel dashboard → Project → Settings → Environment Variables
- Ensure variables are set for "Production" environment
- Redeploy after adding variables

### Runtime Errors

**Error: "Failed to fetch from Supabase"**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- Test Supabase connection locally first

**Error: "API endpoint not found"**
- Verify API rewrite rule in `vercel.json`
- Check API deployment is successful
- Test API endpoint directly

### Performance Issues

**Slow page loads:**
- Enable ISR (Incremental Static Regeneration):
  ```javascript
  // In pages/raffles.js
  export async function getStaticProps() {
    return {
      props: { data },
      revalidate: 60 // Rebuild every 60 seconds
    };
  }
  ```

- Add caching headers in `vercel.json`:
  ```json
  {
    "headers": [
      {
        "source": "/api/(.*)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "s-maxage=60, stale-while-revalidate"
          }
        ]
      }
    ]
  }
  ```

## 🔄 Continuous Deployment

With GitHub Actions configured, every push to `main` will:

1. ✅ Run tests (frontend, API, scrapers)
2. ✅ Build Docker images (for scrapers)
3. ✅ Deploy to Vercel (frontend only, API requires separate setup)

**Manual trigger:**
```bash
# Push to main branch
git push origin main

# Check workflow status
# Go to GitHub → Actions tab
```

## 📝 Custom Domain Setup

### Add Domain to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain: `sneaker-tracker.com`
3. Follow Vercel's DNS instructions
4. Add DNS records in your domain registrar:

**For Vercel DNS:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.21.21
```

5. Wait for DNS propagation (~5-10 minutes)
6. Vercel will auto-provision SSL certificate

### Update Environment Variables

```bash
# If using absolute URLs
NEXT_PUBLIC_SITE_URL=https://sneaker-tracker.com
```

## 🎯 Next Steps

1. **Set up monitoring**: Add Vercel Analytics or Sentry
2. **Configure alerts**: Vercel → Integrations → Slack/Discord
3. **Set up staging**: Create `develop` branch → auto-deploy to staging
4. **Enable preview deploys**: Automatic for all PRs
5. **Set up edge functions**: For real-time features (optional)

## 📚 Additional Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **GitHub Actions**: [docs.github.com/actions](https://docs.github.com/actions)

---

**Need Help?**
- Check Vercel deployment logs: Dashboard → Deployments → View Logs
- Review build output for errors
- Test locally first: `npm run build && npm start`
