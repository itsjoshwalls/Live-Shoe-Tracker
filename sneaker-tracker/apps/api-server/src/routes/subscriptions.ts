import { Router, Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'your-anon-key'
);

// JWT verification middleware
async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.substring(7);
  
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  (req as any).user = data.user; // Attach user to request
  next();
}

// List subscriptions for authenticated user
router.get('/', verifyAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Create or update subscription
router.post('/', verifyAuth, async (req: any, res) => {
  const userId = req.user.id;
  
  const payload = {
    user_id: userId,
    brand_filter: req.body.brand_filter || [],
    sku_filter: req.body.sku_filter || [],
    region_filter: req.body.region_filter || [],
    size_filter: req.body.size_filter || [],
    discord_webhook: req.body.discord_webhook || null,
    slack_webhook: req.body.slack_webhook || null,
    custom_webhook: req.body.custom_webhook || null,
    max_events_hour: req.body.max_events_hour || null,
  };

  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert(payload, { onConflict: 'user_id' })
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data && data[0] ? data[0] : payload);
});

// Delete subscription (by authenticated user)
router.delete('/', verifyAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { error } = await supabase
    .from('user_subscriptions')
    .delete()
    .eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
