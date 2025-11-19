# Supabase SQL Schema for News Scraper

Run this in Supabase SQL Editor to set up the database for news article tracking.

---

## Core Table

```sql
-- Drop existing table if you want to start fresh (WARNING: deletes all data)
-- DROP TABLE IF EXISTS sneaker_news CASCADE;

-- Create sneaker_news table
CREATE TABLE IF NOT EXISTS sneaker_news (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Article metadata
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,  -- Prevents duplicate articles
  published_date TIMESTAMPTZ,
  image_url TEXT,
  excerpt TEXT,
  
  -- Source tracking
  source TEXT NOT NULL,  -- 'sneakernews', 'hypebeast', 'nicekicks', 'complex'
  tags TEXT[],  -- Array of tags/categories
  
  -- Scraping metadata
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sneaker_news_source 
  ON sneaker_news(source);

CREATE INDEX IF NOT EXISTS idx_sneaker_news_published 
  ON sneaker_news(published_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_sneaker_news_created 
  ON sneaker_news(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sneaker_news_url_hash 
  ON sneaker_news USING hash(url);

-- Full-text search index on title and excerpt
CREATE INDEX IF NOT EXISTS idx_sneaker_news_search 
  ON sneaker_news USING gin(to_tsvector('english', title || ' ' || COALESCE(excerpt, '')));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sneaker_news_updated_at
  BEFORE UPDATE ON sneaker_news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE sneaker_news IS 'Stores scraped sneaker news articles from aggregator sites';
COMMENT ON COLUMN sneaker_news.url IS 'Unique article URL - prevents duplicates';
COMMENT ON COLUMN sneaker_news.source IS 'Source site identifier (sneakernews, hypebeast, etc.)';
COMMENT ON COLUMN sneaker_news.tags IS 'Article tags/categories as array';
```

---

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE sneaker_news ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (adjust based on your needs)
CREATE POLICY "Allow public read access" 
  ON sneaker_news
  FOR SELECT 
  USING (true);

-- Policy: Allow authenticated users to insert (for scraper service account)
CREATE POLICY "Allow authenticated insert" 
  ON sneaker_news
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow service role full access (for scrapers)
CREATE POLICY "Allow service role full access" 
  ON sneaker_news
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');
```

---

## Useful Queries

### Recent Articles

```sql
-- Get latest 50 articles across all sources
SELECT 
  id,
  title,
  source,
  published_date,
  created_at,
  url
FROM sneaker_news
ORDER BY created_at DESC
LIMIT 50;
```

### Articles by Source

```sql
-- Count articles per source
SELECT 
  source,
  COUNT(*) as article_count,
  MAX(created_at) as last_scraped
FROM sneaker_news
GROUP BY source
ORDER BY article_count DESC;
```

### Recent Releases (24 Hours)

```sql
-- Articles published in last 24 hours
SELECT 
  title,
  source,
  published_date,
  url
FROM sneaker_news
WHERE published_date > NOW() - INTERVAL '24 hours'
ORDER BY published_date DESC;
```

### Full-Text Search

```sql
-- Search for specific sneakers (e.g., "Jordan 1")
SELECT 
  title,
  source,
  published_date,
  url,
  ts_rank(
    to_tsvector('english', title || ' ' || COALESCE(excerpt, '')),
    to_tsquery('english', 'Jordan & 1')
  ) as rank
FROM sneaker_news
WHERE to_tsvector('english', title || ' ' || COALESCE(excerpt, '')) 
  @@ to_tsquery('english', 'Jordan & 1')
ORDER BY rank DESC, published_date DESC
LIMIT 20;
```

### Duplicate Check

```sql
-- Find duplicate URLs (should be 0 with UNIQUE constraint)
SELECT url, COUNT(*) as count
FROM sneaker_news
GROUP BY url
HAVING COUNT(*) > 1;
```

### Scraping Activity

```sql
-- Articles scraped per day (last 7 days)
SELECT 
  DATE(scraped_at) as date,
  COUNT(*) as articles_scraped,
  COUNT(DISTINCT source) as sources_active
FROM sneaker_news
WHERE scraped_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(scraped_at)
ORDER BY date DESC;
```

---

## Maintenance Queries

### Delete Old Articles (Optional)

```sql
-- Delete articles older than 90 days (adjust as needed)
DELETE FROM sneaker_news
WHERE scraped_at < NOW() - INTERVAL '90 days';
```

### Vacuum & Analyze

```sql
-- Optimize table performance (run periodically)
VACUUM ANALYZE sneaker_news;
```

### Reset Table (DANGEROUS)

```sql
-- WARNING: This deletes ALL data!
TRUNCATE TABLE sneaker_news;
```

---

## View for Dashboard

```sql
-- Create a view for easier dashboard queries
CREATE OR REPLACE VIEW sneaker_news_recent AS
SELECT 
  id,
  title,
  url,
  source,
  published_date,
  image_url,
  excerpt,
  tags,
  created_at,
  -- Add computed fields
  CASE 
    WHEN published_date > NOW() - INTERVAL '24 hours' THEN 'new'
    WHEN published_date > NOW() - INTERVAL '7 days' THEN 'recent'
    ELSE 'older'
  END as freshness,
  -- Extract brand from tags (example)
  CASE
    WHEN 'nike' = ANY(tags) THEN 'Nike'
    WHEN 'adidas' = ANY(tags) THEN 'Adidas'
    WHEN 'jordan' = ANY(tags) THEN 'Jordan'
    ELSE 'Other'
  END as brand
FROM sneaker_news
WHERE published_date > NOW() - INTERVAL '30 days'
ORDER BY published_date DESC;

-- Grant access to view
GRANT SELECT ON sneaker_news_recent TO PUBLIC;
```

---

## Realtime Configuration

```sql
-- Enable Realtime for the table (so frontend can subscribe to changes)
-- This is done in Supabase Dashboard: Database > Replication > Enable for sneaker_news

-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE sneaker_news;
```

---

## Example Data

```sql
-- Insert test data (optional, for development)
INSERT INTO sneaker_news (title, url, source, published_date, image_url, excerpt, tags)
VALUES 
  (
    'Air Jordan 1 High "Chicago" Releasing December 2024',
    'https://sneakernews.com/2024/12/air-jordan-1-chicago',
    'sneakernews',
    '2024-12-01 10:00:00+00',
    'https://example.com/chicago.jpg',
    'The iconic Chicago colorway returns in original form.',
    ARRAY['nike', 'jordan', 'retro']
  ),
  (
    'Yeezy 350 V2 "Onyx" Restocking Next Week',
    'https://hypebeast.com/2024/12/yeezy-350-onyx-restock',
    'hypebeast',
    '2024-12-02 14:30:00+00',
    'https://example.com/onyx.jpg',
    'adidas confirms Yeezy 350 V2 Onyx restock via Confirmed app.',
    ARRAY['adidas', 'yeezy']
  );
```

---

## Check Your Setup

```sql
-- Verify table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'sneaker_news'
) as table_exists;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'sneaker_news';

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'sneaker_news';
```

---

## Next Steps

1. Run this SQL in Supabase SQL Editor
2. Verify table creation with `SELECT * FROM sneaker_news LIMIT 1;`
3. Run the news scraper: `python news_scraper.py --site sneakernews`
4. Check data: `SELECT COUNT(*) FROM sneaker_news;`

---

**Schema Version**: 1.0  
**Last Updated**: November 14, 2025  
**Compatible with**: `news_scraper.py`, `realtime_scheduler.py`
