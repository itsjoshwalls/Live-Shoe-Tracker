-- Migration: personalization & quality guardian structures
-- Date: 2025-11-13

-- 1. User subscriptions (filters for personalized release events)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_filter TEXT[],          -- e.g. ['Nike','Adidas']
  sku_filter TEXT[],            -- explicit SKUs of interest
  region_filter TEXT[],         -- e.g. ['US','UK','EU']
  size_filter TEXT[],           -- string sizes or ranges encoded ('10','10.5','M9')
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions (user_id);

-- 2. Event delivery queue (per-user fanout with retry)
CREATE TABLE IF NOT EXISTS public.user_event_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID,                      -- references release_events.id (nullable if synthetic)
  sku TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|failed
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_event_delivery_pending ON public.user_event_delivery (status, created_at);
CREATE INDEX IF NOT EXISTS idx_user_event_delivery_user ON public.user_event_delivery (user_id);

-- 3. Release quarantine table for anomalies/duplicates
CREATE TABLE IF NOT EXISTS public.release_quarantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT,
  source TEXT,
  reason TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_release_quarantine_sku ON public.release_quarantine (sku);

-- 4. Optional: enable RLS later (commented placeholder)
-- ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_event_delivery ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.release_quarantine ENABLE ROW LEVEL SECURITY;
