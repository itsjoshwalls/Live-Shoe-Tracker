# ❌ Issue: Supabase Project URL Not Found

## Problem
The Supabase URL `https://zaarnclwuiwxxtecrvvs.supabase.co` cannot be resolved (DNS lookup fails).

This means either:
1. The project reference is incorrect
2. The Supabase project was paused or deleted
3. There's a typo in the project URL

## ✅ Solution: Find Your Correct Supabase URL

### Method 1: Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project (or create a new one)
4. Go to **Settings** → **API**
5. Copy the **Project URL** (it will look like `https://xxxxx.supabase.co`)
6. Copy the **anon public** key
7. Copy the **service_role** key (click to reveal)

### Method 2: Check Existing .env Files
```powershell
# Check if URL is in the API server .env
Get-Content "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server\.env" | Select-String "SUPABASE"
```

### Method 3: Create a New Supabase Project
If the project was deleted or you need a fresh start:

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Enter:
   - Name: "sneaker-tracker"
   - Database Password: (choose a strong password)
   - Region: (closest to you)
4. Wait for setup to complete (~2 minutes)
5. Copy the URL and keys from Settings → API

## 📝 Once You Have the Correct URL

Update your environment:

```powershell
cd "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers"

# Set the CORRECT Supabase URL and keys
$env:SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here"

# Create the releases table (first time only)
# → Go to Dashboard → SQL Editor → New Query
# → Paste and run the SQL from:
#   sneaker-tracker/packages/supabase-migrations/create-releases-table.sql

# Then run the import
npm run import:supabase output\concepts-1763098310419.ndjson
```

## 🔍 Verify Your Project URL Works

Test connectivity:
```powershell
$env:SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co"

# DNS check (should resolve to an IP)
nslookup (([uri]$env:SUPABASE_URL).Host)

# HTTP check (should return headers)
curl.exe -I "$env:SUPABASE_URL/rest/v1/"
```

If both succeed, you're ready to import!

## 📋 Quick Reference

After fixing the URL, your import command should be:

```powershell
cd "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers"

$env:SUPABASE_URL = "https://YOUR-CORRECT-REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."  # service_role key from dashboard

npm run import:supabase output\concepts-1763098310419.ndjson
```

Expected output:
```
🔐 Using Supabase key type: service_role (https://YOUR-CORRECT-REF.supabase.co)
📂 Reading: ...\concepts-1763098310419.ndjson
📦 Parsed 10 releases
✅ Batch 0-10 inserted

📊 Summary:
   ✅ Inserted/updated: 10
   ❌ Errors: 0
```
