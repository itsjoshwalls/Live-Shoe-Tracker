-- SoleSavy Data Table
-- Stores releases, raffles, news from SoleSavy platform

CREATE TABLE IF NOT EXISTS solesavy_data (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,  -- Prevents duplicates
  type TEXT NOT NULL,  -- 'release', 'raffle', 'news'
  
  -- Release/Product fields
  release_date TIMESTAMPTZ,
  price TEXT,
  sku TEXT,
  image_url TEXT,
  excerpt TEXT,
  
  -- Raffle fields
  entry_deadline TIMESTAMPTZ,
  retailer TEXT,
  status TEXT,  -- 'active', 'closed', 'upcoming', etc.
  
  -- Metadata
  tags TEXT[],
  source TEXT DEFAULT 'solesavy',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_solesavy_type 
  ON solesavy_data(type);

CREATE INDEX IF NOT EXISTS idx_solesavy_release_date 
  ON solesavy_data(release_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_solesavy_entry_deadline 
  ON solesavy_data(entry_deadline DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_solesavy_created 
  ON solesavy_data(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solesavy_url_hash 
  ON solesavy_data USING hash(url);

CREATE INDEX IF NOT EXISTS idx_solesavy_status 
  ON solesavy_data(status) WHERE type = 'raffle';

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_solesavy_search 
  ON solesavy_data USING gin(to_tsvector('english', title || ' ' || COALESCE(excerpt, '')));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_solesavy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_solesavy_data_updated_at
  BEFORE UPDATE ON solesavy_data
  FOR EACH ROW
  EXECUTE FUNCTION update_solesavy_updated_at();

-- Comments
COMMENT ON TABLE solesavy_data IS 'SoleSavy releases, raffles, and news';
COMMENT ON COLUMN solesavy_data.type IS 'Content type: release, raffle, or news';
COMMENT ON COLUMN solesavy_data.entry_deadline IS 'Raffle entry deadline (for type=raffle)';

-- Enable Row Level Security
ALTER TABLE solesavy_data ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Allow public read access" 
  ON solesavy_data
  FOR SELECT 
  USING (true);

-- Policy: Authenticated insert/update (for scraper)
CREATE POLICY "Allow authenticated write" 
  ON solesavy_data
  FOR ALL 
  USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT ON solesavy_data TO anon;
GRANT ALL ON solesavy_data TO authenticated;
GRANT ALL ON solesavy_data TO service_role;
