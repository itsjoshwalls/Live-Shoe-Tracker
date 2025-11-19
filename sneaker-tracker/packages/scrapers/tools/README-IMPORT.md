# NDJSON to Supabase Import Tool

## Overview
Imports NDJSON release files from `output/` directory into a Supabase `releases` table.

## Prerequisites
1. **Supabase Table Schema**
   - Ensure a `releases` table exists in your Supabase project:
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
     UNIQUE(sku, retailer)
   );
   ```

2. **Environment Variables**
   ```powershell
   $env:SUPABASE_URL = "https://your-project.supabase.co"
   $env:SUPABASE_ANON_KEY = "your-anon-key-here"
   # Or use service role key for admin access:
   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
   ```

## Usage

### Import a Single File
```powershell
npm run import:supabase output/undefeated-1234567890.ndjson
```

### Import All Files from output/
```powershell
npm run import:supabase
```

## How It Works
1. Reads NDJSON file(s) line-by-line
2. Transforms each release to match Supabase schema
3. Batch upserts records (50 at a time)
4. Uses `UNIQUE(sku, retailer)` constraint to avoid duplicates
5. Reports success/error counts

## Example Output
```
📂 Reading: output/kith-1763097689558.ndjson
📦 Parsed 5 releases
✅ Batch 0-5 inserted

📊 Summary for kith-1763097689558.ndjson:
   ✅ Inserted/updated: 5
   ❌ Errors: 0
```

## Troubleshooting

### "TypeError: fetch failed"
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
- Check that the `releases` table exists in your Supabase project
- Ensure your Supabase project is active (not paused)

### "duplicate key value violates unique constraint"
- This is expected behavior - the tool uses upsert with `onConflict: 'sku,retailer'`
- Duplicates are automatically updated rather than inserted

### Permission Errors
- Use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ANON_KEY` for admin operations
- Check RLS policies on the `releases` table

## Related Scripts
- `handleReleases()` in `handlers/releaseHandler.js` - writes NDJSON files
- `npm run import:ndjson` - legacy Firebase importer (if applicable)
