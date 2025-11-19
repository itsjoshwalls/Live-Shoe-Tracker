# Quick Setup: Scraper → Supabase Pipeline

## 🎯 TL;DR
```powershell
# 1. Create table (copy SQL below to Supabase Dashboard)
# 2. Run scraper
cd sneaker-tracker/packages/scrapers
node index.js concepts

# 3. Import to Supabase
$env:SUPABASE_URL = "https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key"
npm run import:supabase output/concepts-*.ndjson
```

## 📋 Step-by-Step

### 1️⃣ Create `releases` Table in Supabase

**Open**: https://supabase.com/dashboard/project/zaarnclwuiwxxtecrvvs/sql

**Run this SQL** (copy from `create-releases-table.sql` or below):

```sql
CREATE TABLE releases (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  release_date TIMESTAMPTZ,
  status TEXT DEFAULT 'upcoming',
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  brand TEXT,
  retailer TEXT,
  url TEXT,
  images TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_release UNIQUE(sku, retailer)
);

CREATE INDEX idx_releases_status ON releases(status);
CREATE INDEX idx_releases_brand ON releases(brand);
CREATE INDEX idx_releases_retailer ON releases(retailer);
CREATE INDEX idx_releases_release_date ON releases(release_date);

ALTER TABLE releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON releases FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON releases FOR ALL 
  USING (auth.role() = 'service_role');

GRANT SELECT ON releases TO anon;
GRANT ALL ON releases TO service_role;
```

### 2️⃣ Run a Scraper

```powershell
cd sneaker-tracker/packages/scrapers

# Single store
node index.js concepts
# Or: node index.js undefeated
# Or: node index.js kith

# Multiple stores
node index.js  # runs all enabled stores in config.js
```

**Output**: `output/concepts-1234567890.ndjson`

### 3️⃣ Import to Supabase

```powershell
# Set credentials
$env:SUPABASE_URL = "https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXJuY2x3dWl3eHh0ZWNydnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzAxMDMsImV4cCI6MjA3NzgwNjEwM30.ixSRWRjaRYQ0kvaJ9gWw2vM4MM2HRtCZa5sfx-ibJak"

# Import single file
npm run import:supabase output/concepts-1763098310419.ndjson

# Or import all NDJSON files
Get-ChildItem output/*.ndjson | ForEach-Object { npm run import:supabase $_.FullName }
```

**Expected output**:
```
📂 Reading: output/concepts-1763098310419.ndjson
📦 Parsed 10 releases
✅ Batch 0-10 inserted

📊 Summary:
   ✅ Inserted/updated: 10
   ❌ Errors: 0
```

### 4️⃣ Verify Data

**Dashboard**: https://supabase.com/dashboard/project/zaarnclwuiwxxtecrvvs/editor

**Or via query**:
```powershell
node -e "import('@supabase/supabase-js').then(m=>m.createClient('https://zaarnclwuiwxxtecrvvs.supabase.co','your-anon-key')).then(async s=>{const{data}=await s.from('releases').select('name,brand,retailer,price').limit(5);console.table(data)})"
```

## 🔄 Automated Pipeline

For continuous scraping + ingestion, create a scheduled script:

```powershell
# scrape-and-import.ps1
cd sneaker-tracker/packages/scrapers

$env:SUPABASE_URL = "https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key"

# Scrape all enabled stores
node index.js

# Import all new NDJSON files
Get-ChildItem output/*.ndjson | 
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-1) } |
  ForEach-Object { 
    Write-Host "Importing $($_.Name)..."
    npm run import:supabase $_.FullName 
  }
```

**Run every hour** with Windows Task Scheduler or as a GitHub Action.

## 🎨 Connect Frontend

Update your React/Next.js app to query Supabase:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zaarnclwuiwxxtecrvvs.supabase.co',
  'your-anon-key'
)

// Fetch upcoming releases
const { data: releases } = await supabase
  .from('releases')
  .select('*')
  .eq('status', 'upcoming')
  .order('release_date', { ascending: true })
  .limit(20)

// Real-time subscription
supabase
  .channel('releases')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'releases' 
  }, (payload) => {
    console.log('New release!', payload.new)
  })
  .subscribe()
```

## ✅ Complete!
Your scraper → Supabase pipeline is now live. NDJSON files in `output/` can be imported anytime.
