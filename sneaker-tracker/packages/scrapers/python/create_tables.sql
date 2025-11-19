-- Create tables for new scrapers (Foot Locker and Nike SNKRS)
-- Run this against your Supabase/PostgreSQL database

-- Foot Locker releases table
CREATE TABLE IF NOT EXISTS footlocker_data (
  id TEXT PRIMARY KEY,
  retailer TEXT NOT NULL DEFAULT 'Foot Locker',
  name TEXT NOT NULL,
  price TEXT,
  release_date TEXT,
  image_url TEXT,
  product_url TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nike SNKRS releases table
CREATE TABLE IF NOT EXISTS nike_snkrs_data (
  id TEXT PRIMARY KEY,
  retailer TEXT NOT NULL DEFAULT 'Nike SNKRS',
  name TEXT NOT NULL,
  price TEXT,
  release_date TEXT,
  image_url TEXT,
  product_url TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Foot Locker
CREATE INDEX IF NOT EXISTS idx_footlocker_release_date ON footlocker_data(release_date);
CREATE INDEX IF NOT EXISTS idx_footlocker_scraped_at ON footlocker_data(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_footlocker_name ON footlocker_data USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_footlocker_brand ON footlocker_data((metadata->>'brand'));

-- Indexes for Nike SNKRS
CREATE INDEX IF NOT EXISTS idx_nike_snkrs_release_date ON nike_snkrs_data(release_date);
CREATE INDEX IF NOT EXISTS idx_nike_snkrs_scraped_at ON nike_snkrs_data(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_nike_snkrs_name ON nike_snkrs_data USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_nike_snkrs_brand ON nike_snkrs_data((metadata->>'brand'));
CREATE INDEX IF NOT EXISTS idx_nike_snkrs_raffle ON nike_snkrs_data((metadata->>'is_raffle'));

-- Row Level Security (RLS) - Allow public read access
ALTER TABLE footlocker_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE nike_snkrs_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow public read footlocker" ON footlocker_data
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read nike_snkrs" ON nike_snkrs_data
  FOR SELECT USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_footlocker_updated_at BEFORE UPDATE ON footlocker_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nike_snkrs_updated_at BEFORE UPDATE ON nike_snkrs_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON footlocker_data TO anon, authenticated;
GRANT SELECT ON nike_snkrs_data TO anon, authenticated;

-- Verify tables
SELECT 'footlocker_data' AS table_name, COUNT(*) AS row_count FROM footlocker_data
UNION ALL
SELECT 'nike_snkrs_data' AS table_name, COUNT(*) AS row_count FROM nike_snkrs_data;
