# Supabase Image Scraper - Zero Firebase Setup Required

## What This Does

Scrapes Shopify store product images and writes them **directly to your Supabase database** - no Firebase service account needed.

## Quick Start (PowerShell)

### 1. Get Your Supabase Service Role Key

1. Go to https://supabase.com/dashboard
2. Select your project: `npvqqzuofwojhbdlozgh`
3. Settings (left sidebar) → API
4. Copy the **service_role** key (NOT the anon key)

### 2. Set Environment Variables

```powershell
# Set these in your terminal (they persist for that session)
$env:SUPABASE_URL = "https://npvqqzuofwojhbdlozgh.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...." # Your actual key

# Verify they're set
Write-Host "URL: $env:SUPABASE_URL"
Write-Host "Key length: $($env:SUPABASE_SERVICE_ROLE_KEY.Length)"
```

### 3. Install Python Dependencies (if not already done)

```powershell
python -m pip install requests python-dateutil
```

### 4. Run the Scraper

```powershell
# Dry run first (see what would happen)
python scripts/supabase_image_scraper.py --dry-run

# Actually update the database
python scripts/supabase_image_scraper.py

# Custom config
python scripts/supabase_image_scraper.py --stores path/to/stores.json --pause 2.0
```

## What Gets Updated

- **Existing releases**: Images array populated (merged with existing data)
- **New products**: Created if they don't exist (matched by name)
- **Fields updated**:
  - `images` (array of URLs)
  - `retailer` (store domain)
  - `url` (product link)
  - `updated_at` (timestamp)

## Verification

After running, check your production API:

```powershell
# View a few releases with images
Invoke-RestMethod -Uri "https://api-server-ipb919uhu-joshua-walls-projects.vercel.app/api/releases" | Select-Object -First 5 | ForEach-Object { [PSCustomObject]@{ Name = $_.name; ImageCount = $_.images.Count; FirstImage = $_.images[0] } } | Format-Table
```

Or open in browser:
```
https://api-server-ipb919uhu-joshua-walls-projects.vercel.app/api/releases
```

## Advantages Over Firebase Approach

| Firebase Scraper | Supabase Scraper |
|-----------------|------------------|
| Requires service account JSON | Uses simple API key |
| 2-step process (scrape → ingest) | Direct write to production DB |
| Complex Python dependencies | Just `requests` library |
| Separate Firestore collection | Updates live `releases` table |
| Manual sync to Supabase needed | Immediate availability in API |

## Store Configuration

Default config: `shoe-tracker/scripts/shopify_stores.json`

Example format:
```json
{
  "stores": [
    "nike.com",
    "adidas.com",
    "example-sneaker-shop.myshopify.com"
  ]
}
```

## Troubleshooting

**"Missing required environment variables"**
→ Re-run step 2 in the same PowerShell window

**"401 Unauthorized"**
→ Check you're using service_role key, not anon key

**"No products.json available"**
→ Store doesn't expose Shopify API or requires JavaScript (use Playwright monitor instead)

**"Failed to update: 409"**
→ Conflict on unique constraint; check Supabase table schema

## Next Steps

1. Run this scraper weekly/daily (schedule with Task Scheduler or cron)
2. Add more stores to `shopify_stores.json`
3. Extend with Playwright for non-Shopify sites
4. Display images in your Next.js frontend
