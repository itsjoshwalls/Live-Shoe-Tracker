-- Migration: Enable RLS and JWT auth policies
-- Date: 2025-11-13

-- Enable RLS on sensitive tables
ALTER TABLE IF EXISTS public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_event_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.release_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dead_letter_alerts ENABLE ROW LEVEL SECURITY;

-- User subscriptions: own records only
CREATE POLICY select_own_subscription ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own_subscription ON public.user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_subscription ON public.user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY delete_own_subscription ON public.user_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- User event delivery: own records only
CREATE POLICY select_own_events ON public.user_event_delivery
  FOR SELECT USING (auth.uid() = user_id);

-- Release quarantine: read-only for authenticated users, write for service role
CREATE POLICY view_quarantine ON public.release_quarantine
  FOR SELECT USING (auth.role() = 'authenticated');

-- Dead letter alerts: own records only (if user_id present)
CREATE POLICY view_own_dead_letters ON public.dead_letter_alerts
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Public read access for releases & retailers (if needed; adjust per requirements)
-- ALTER TABLE IF EXISTS public.releases ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY public_read_releases ON public.releases FOR SELECT USING (true);
