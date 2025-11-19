-- Migration: release_events ML feature columns, dead letter & rate limiting
-- Date: 2025-11-13

-- 1. Extend release_events with ML feature groundwork columns
ALTER TABLE public.release_events ADD COLUMN IF NOT EXISTS aggregator_hits INTEGER DEFAULT 0;
ALTER TABLE public.release_events ADD COLUMN IF NOT EXISTS social_mentions INTEGER DEFAULT 0;
ALTER TABLE public.release_events ADD COLUMN IF NOT EXISTS restock_likelihood DOUBLE PRECISION;
ALTER TABLE public.release_events ADD COLUMN IF NOT EXISTS priority_score DOUBLE PRECISION;

-- 2. Dead letter alerts table
CREATE TABLE IF NOT EXISTS public.dead_letter_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  original_event_id UUID,
  payload JSONB,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dead_letter_user ON public.dead_letter_alerts (user_id);

-- 3. Rate limiting counter table (hourly buckets)
CREATE TABLE IF NOT EXISTS public.user_event_rate (
  user_id UUID NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, hour_start)
);
CREATE INDEX IF NOT EXISTS idx_user_event_rate_hour ON public.user_event_rate (hour_start DESC);

-- 4. Extend user_subscriptions with webhook + rate limit config
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS discord_webhook TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS slack_webhook TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS custom_webhook TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS max_events_hour INTEGER;

-- 5. Rate limit increment function
CREATE OR REPLACE FUNCTION public.increment_event_rate(p_user_id UUID, p_hour_start TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_event_rate(user_id, hour_start, count)
    VALUES (p_user_id, p_hour_start, 1)
  ON CONFLICT (user_id, hour_start)
  DO UPDATE SET count = public.user_event_rate.count + 1;
END;
$$ LANGUAGE plpgsql;
