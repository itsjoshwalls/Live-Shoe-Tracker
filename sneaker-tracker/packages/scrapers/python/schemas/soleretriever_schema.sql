-- Sole Retriever Data Table
-- Stores comprehensive release data from Sole Retriever aggregator

CREATE TABLE IF NOT EXISTS soleretriever_data (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,  -- Prevents duplicates
  
  -- Product details
  brand TEXT,  -- Nike, Jordan, adidas, New Balance, etc.
  sku TEXT,
  style_code TEXT,
  colorway TEXT,
  
  -- Pricing
  price TEXT,  -- Retail price
  currency TEXT DEFAULT 'USD',
  
  -- Release info
  release_date TIMESTAMPTZ,
  status TEXT,  -- 'upcoming', 'available', 'sold_out', 'delayed'
  
  -- Raffle/Entry info
  has_raffle BOOLEAN DEFAULT false,
  raffle_retailers TEXT[],  -- Array of retailers with raffles
  
  -- Media
  image_url TEXT,
  images JSONB,  -- Multiple images: {"main": "url", "detail": "url", ...}
  
  -- Collection/Category
  collection TEXT,  -- 'jordan', 'nike', 'yeezy', etc.
  category TEXT,  -- 'sneakers', 'apparel', etc.
  
  -- Additional metadata
  description TEXT,
  tags TEXT[],
  
  -- Source tracking
  source TEXT DEFAULT 'soleretriever',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_soleretriever_brand 
  ON soleretriever_data(brand);

CREATE INDEX IF NOT EXISTS idx_soleretriever_collection 
  ON soleretriever_data(collection);

CREATE INDEX IF NOT EXISTS idx_soleretriever_release_date 
  ON soleretriever_data(release_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_soleretriever_status 
  ON soleretriever_data(status);

CREATE INDEX IF NOT EXISTS idx_soleretriever_has_raffle 
  ON soleretriever_data(has_raffle) WHERE has_raffle = true;

CREATE INDEX IF NOT EXISTS idx_soleretriever_created 
  ON soleretriever_data(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_soleretriever_url_hash 
  ON soleretriever_data USING hash(url);

CREATE INDEX IF NOT EXISTS idx_soleretriever_sku 
  ON soleretriever_data(sku) WHERE sku IS NOT NULL;

-- Full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_soleretriever_search 
  ON soleretriever_data USING gin(
    to_tsvector('english', 
      title || ' ' || 
      COALESCE(brand, '') || ' ' || 
      COALESCE(sku, '') || ' ' || 
      COALESCE(description, '')
    )
  );

-- JSONB index for images
CREATE INDEX IF NOT EXISTS idx_soleretriever_images 
  ON soleretriever_data USING gin(images);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_soleretriever_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_soleretriever_data_updated_at
  BEFORE UPDATE ON soleretriever_data
  FOR EACH ROW
  EXECUTE FUNCTION update_soleretriever_updated_at();

-- Comments
COMMENT ON TABLE soleretriever_data IS 'Comprehensive release data from Sole Retriever aggregator';
COMMENT ON COLUMN soleretriever_data.has_raffle IS 'True if product has raffle entries available';
COMMENT ON COLUMN soleretriever_data.raffle_retailers IS 'Array of retailer names offering raffles';
COMMENT ON COLUMN soleretriever_data.images IS 'JSON object with multiple image URLs';

-- Enable Row Level Security
ALTER TABLE soleretriever_data ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Allow public read access" 
  ON soleretriever_data
  FOR SELECT 
  USING (true);

-- Policy: Authenticated insert/update (for scraper)
CREATE POLICY "Allow authenticated write" 
  ON soleretriever_data
  FOR ALL 
  USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT ON soleretriever_data TO anon;
GRANT ALL ON soleretriever_data TO authenticated;
GRANT ALL ON soleretriever_data TO service_role;
