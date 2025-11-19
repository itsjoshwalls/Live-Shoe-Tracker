-- Create releases table for scraper ingestion
-- Run this in Supabase SQL Editor or via CLI

CREATE TABLE IF NOT EXISTS releases (
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

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_brand ON releases(brand);
CREATE INDEX IF NOT EXISTS idx_releases_retailer ON releases(retailer);
CREATE INDEX IF NOT EXISTS idx_releases_release_date ON releases(release_date);
CREATE INDEX IF NOT EXISTS idx_releases_created_at ON releases(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_releases_updated_at BEFORE UPDATE
    ON releases FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Allow public read access" ON releases
  FOR SELECT
  USING (true);

-- Policy: Allow service role full access
CREATE POLICY "Allow service role full access" ON releases
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON releases TO anon;
GRANT ALL ON releases TO service_role;
GRANT USAGE ON SEQUENCE releases_id_seq TO service_role;

-- Optional: Create a view for active releases
CREATE OR REPLACE VIEW active_releases AS
SELECT 
  id,
  name,
  sku,
  brand,
  retailer,
  price,
  currency,
  release_date,
  status,
  url,
  images,
  metadata,
  created_at
FROM releases
WHERE status IN ('upcoming', 'available')
  AND (release_date IS NULL OR release_date >= NOW() - INTERVAL '7 days')
ORDER BY 
  CASE 
    WHEN release_date IS NULL THEN 1
    ELSE 0
  END,
  release_date ASC,
  created_at DESC;

GRANT SELECT ON active_releases TO anon;
