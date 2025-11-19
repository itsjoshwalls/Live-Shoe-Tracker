# Apply Supabase Migrations - Quick Guide

## Option 1: Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard/project/zaarnclwuiwxxtecrvvs
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy/paste contents of `create-releases-table.sql`
5. Click **Run** or press F5

## Option 2: Supabase CLI (Local)
```powershell
# Install Supabase CLI (if not already)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref zaarnclwuiwxxtecrvvs

# Apply migration
supabase db push --file packages/supabase-migrations/create-releases-table.sql
```

## Option 3: Direct SQL Execution via Script
```powershell
cd sneaker-tracker/packages/supabase-migrations

# Set environment
$env:SUPABASE_URL = "https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here"

# Run migration (Node script)
node apply-migration.js create-releases-table.sql
```

## Verify Table Creation
After running the migration, verify:
```powershell
cd sneaker-tracker/packages/scrapers

$env:SUPABASE_URL = "https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key"

# Test query
node -e "import('@supabase/supabase-js').then(m=>m.createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY)).then(async s=>{const{data,error}=await s.from('releases').select('id').limit(1);if(error){console.log('❌',error.message)}else{console.log('✅ Table ready')}})"
```

## What the Migration Creates
- `releases` table with full schema
- Indexes for performance (status, brand, retailer, release_date)
- RLS policies (public read, service role write)
- `updated_at` auto-update trigger
- `active_releases` view for upcoming/available releases

## Next Step: Import Data
Once the table is created:
```powershell
cd sneaker-tracker/packages/scrapers

$env:SUPABASE_URL = "https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key"

npm run import:supabase output/concepts-1763098310419.ndjson
```
