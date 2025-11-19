-- Migration: Resilience (scraper health & circuit breaker) + ML model storage
-- Date: 2025-11-13

-- Scraper health table
CREATE TABLE IF NOT EXISTS public.scraper_health (
  scraper_id TEXT PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  breaker_open BOOLEAN NOT NULL DEFAULT FALSE,
  breaker_opened_at TIMESTAMPTZ,
  proxy_pool TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Failure log for diagnostics
CREATE TABLE IF NOT EXISTS public.scraper_failure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_id TEXT NOT NULL,
  error_message TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_failure_log_scraper ON public.scraper_failure_log (scraper_id, occurred_at DESC);

-- Release priority model store
CREATE TABLE IF NOT EXISTS public.release_priority_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  feature_order TEXT[] NOT NULL,
  coefficients DOUBLE PRECISION[] NOT NULL,
  intercept DOUBLE PRECISION NOT NULL,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_priority_model_version ON public.release_priority_model (version);

-- Optional RLS placeholders
-- ALTER TABLE public.scraper_health ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.scraper_failure_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.release_priority_model ENABLE ROW LEVEL SECURITY;
