-- Migration: release_events + releases ingestion timing columns
-- Date: 2025-11-13

-- 1. Release events table
CREATE TABLE IF NOT EXISTS public.release_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT,
  brand TEXT,
  name TEXT,
  source TEXT NOT NULL,
  status_from TEXT,
  status_to TEXT,
  price_from NUMERIC,
  price_to NUMERIC,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INTEGER,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_events_sku ON public.release_events (sku);
CREATE INDEX IF NOT EXISTS idx_release_events_detected_at ON public.release_events (detected_at DESC);

-- 2. Add ingestion timing columns to releases table (if missing)
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS ingestion_started TIMESTAMPTZ;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS ingestion_completed TIMESTAMPTZ;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

-- 3. RLS placeholder (manual enable later)
-- ALTER TABLE public.release_events ENABLE ROW LEVEL SECURITY;