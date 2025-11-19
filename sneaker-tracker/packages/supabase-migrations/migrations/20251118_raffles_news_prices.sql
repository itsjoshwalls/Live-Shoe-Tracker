-- Migration: Add raffles, news_articles, and price_points tables
-- Date: 2025-11-18

-- Raffles table for raffle calendar aggregation
CREATE TABLE IF NOT EXISTS raffles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    store VARCHAR(255) NOT NULL,
    deadline TIMESTAMP NOT NULL,
    raffle_url TEXT NOT NULL,
    region VARCHAR(50) NOT NULL,
    sku VARCHAR(100),
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raffles_deadline ON raffles(deadline);
CREATE INDEX IF NOT EXISTS idx_raffles_region ON raffles(region);

-- News articles table for news aggregator
CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    link TEXT NOT NULL UNIQUE,
    summary TEXT,
    published_at TIMESTAMP NOT NULL,
    author VARCHAR(255),
    source VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.0,
    image_url TEXT,
    tags TEXT[],
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_source ON news_articles(source);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);

-- Price points table for resale pricing & ML forecasting
CREATE TABLE IF NOT EXISTS price_points (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sneaker_name VARCHAR(255),
    size VARCHAR(20),
    condition VARCHAR(50) DEFAULT 'new',
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_price_sku ON price_points(sku);
CREATE INDEX IF NOT EXISTS idx_price_timestamp ON price_points(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_platform ON price_points(platform);

-- Enable RLS (optional - adjust policies as needed)
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_points ENABLE ROW LEVEL SECURITY;

-- Public read access policies (adjust based on auth requirements)
CREATE POLICY "Allow public read raffles" ON raffles FOR SELECT USING (true);
CREATE POLICY "Allow public read news" ON news_articles FOR SELECT USING (true);
CREATE POLICY "Allow public read prices" ON price_points FOR SELECT USING (true);
