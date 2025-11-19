# 🚀 Setting Up Production Supabase

**Quick Guide**: Connect your new Supabase project to Live Shoe Tracker

---

## Step 1: Get Your Supabase Credentials

1. **Open your Supabase project dashboard**
   - Go to: https://supabase.com/dashboard
   - Click on your new project

2. **Get your API credentials**
   - Click on the **Settings** icon (⚙️) in the left sidebar
   - Click **API** in the settings menu
   - You'll see these values:

   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   ⚠️ **IMPORTANT**: 
   - The `anon` key is safe for frontend (public)
   - The `service_role` key is SECRET - never commit to git!

---

## Step 2: Update Your Environment Variables

### For Next.js Web App

**File**: `apps/web-nextjs/.env.local`

Replace the local development values with your production credentials:

```bash
# ============================================
# PRODUCTION SUPABASE (replace these values)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Service role key for server-side operations
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# FIREBASE (keep existing values)
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=live-sneaker-release-tra-df5a4.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=live-sneaker-release-tra-df5a4
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=live-sneaker-release-tra-df5a4.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### For API Server (if using)

**File**: `apps/api-server/.env`

```bash
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

PORT=4000
NODE_ENV=production
```

### For Python Scrapers

**File**: `packages/scrapers/python/.env` (create if doesn't exist)

```bash
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 3: Set Up Your Database Schema

You need to create the tables in your new Supabase project.

### Option A: Using Supabase Dashboard (Easiest)

1. **Go to SQL Editor**
   - In your Supabase dashboard, click **SQL Editor** in left sidebar
   - Click **New query**

2. **Run the table creation script**
   - Copy the contents of: `packages/scrapers/python/create_tables.sql`
   - Paste into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Verify tables were created**
   - Click **Table Editor** in left sidebar
   - You should see: `soleretriever_data` table

### Option B: Using Migration Scripts (Advanced)

If you have migration files in `packages/supabase-migrations/`:

```powershell
# Install Supabase CLI if you haven't
npm install -g supabase

# Link your project
supabase link --project-ref xxxxxxxxxxxxx

# Run migrations
supabase db push
```

---

## Step 4: Seed Initial Data (Optional)

If you want to populate your production database with test data:

```powershell
cd packages\scrapers\python

# Set environment variables
$env:SUPABASE_URL = "https://xxxxxxxxxxxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Run a scraper to populate data
python soleretriever_scraper.py --limit 50
```

---

## Step 5: Test Your Connection

### Test from Next.js

1. **Restart Next.js** (important!)
   ```powershell
   cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs
   .\START-NEXTJS-MANUAL.ps1
   ```

2. **Check the dashboard**
   - Navigate to: http://localhost:3002/unified-dashboard
   - You should see data loading
   - Check browser console - should NOT see "dev mode" message
   - API route should work without fallback

### Test from PowerShell

```powershell
# Test direct connection
$headers = @{
    "apikey" = "YOUR_ANON_KEY_HERE"
    "Authorization" = "Bearer YOUR_ANON_KEY_HERE"
}
Invoke-RestMethod "https://xxxxxxxxxxxxx.supabase.co/rest/v1/soleretriever_data?limit=5" -Headers $headers
```

### Test API Route

```powershell
Invoke-RestMethod "http://localhost:3002/api/releases?limit=5"
```

Expected result: ✅ Data returns, no 500 error

---

## Step 6: Enable Row Level Security (RLS)

⚠️ **IMPORTANT for Production**: Protect your data!

1. **Go to Authentication > Policies** in Supabase dashboard

2. **For `soleretriever_data` table**, add these policies:

   **Read Policy** (allow public to read):
   ```sql
   CREATE POLICY "Allow public read access"
   ON soleretriever_data
   FOR SELECT
   TO public
   USING (true);
   ```

   **Write Policy** (only service role can write):
   ```sql
   CREATE POLICY "Only service role can write"
   ON soleretriever_data
   FOR ALL
   TO service_role
   USING (true)
   WITH CHECK (true);
   ```

3. **Enable RLS**
   - Toggle "Enable RLS" on the `soleretriever_data` table

---

## Step 7: Deploy to Vercel

Once your production Supabase is working locally, deploy:

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker
.\DEPLOY-TO-VERCEL.ps1
```

During deployment, you'll be prompted to set these environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side API routes)

---

## Troubleshooting

### "JWSError JWSInvalidSignature"
- ❌ You're still using local keys (`http://localhost:3001`)
- ✅ Update `.env.local` with production URL and keys
- ✅ Restart Next.js

### "relation 'soleretriever_data' does not exist"
- ❌ Tables not created in Supabase
- ✅ Run `create_tables.sql` in SQL Editor

### "No rows returned"
- ❌ Database is empty
- ✅ Run a scraper to populate data

### API route still returning 500
- ❌ Service role key not set or incorrect
- ✅ Check `apps/api-server/.env` or Next.js environment
- ✅ Restart server after updating

---

## Quick Reference

| What | Where to Find |
|------|---------------|
| **Project URL** | Supabase Dashboard → Settings → API |
| **API Keys** | Supabase Dashboard → Settings → API |
| **SQL Editor** | Supabase Dashboard → SQL Editor |
| **Table Schema** | `packages/scrapers/python/create_tables.sql` |
| **Next.js Env** | `apps/web-nextjs/.env.local` |
| **Test API** | `http://localhost:3002/api/releases` |

---

## Next Steps After Setup

- [ ] Update `.env.local` with production credentials
- [ ] Run `create_tables.sql` in Supabase SQL Editor
- [ ] Restart Next.js to apply new credentials
- [ ] Test API route (should work without fallback)
- [ ] Enable RLS policies
- [ ] Run scraper to populate data
- [ ] Deploy to Vercel
- [ ] Add domain

---

_See also: PRE-LAUNCH-REPORT.md for deployment guide_
