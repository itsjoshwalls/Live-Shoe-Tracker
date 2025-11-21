import { Router } from 'express';
import { supabase } from '../lib/db';
const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Lightweight diagnostics: non-sensitive env presence summary
router.get('/details', (req, res) => {
  const keys = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'REDIS_URL',
    'NODE_ENV'
  ];
  const env = keys.map(k => ({ key: k, present: !!process.env[k] }));
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    env
  });
});

// Readiness probe: verifies Supabase connectivity with a lightweight select
router.get('/ready', async (req, res) => {
  try {
    const { error } = await supabase.from('releases').select('id').limit(1);
    if (error) throw error;
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime())
    });
  } catch (e) {
    res.status(503).json({
      status: 'degraded',
      error: 'supabase_unavailable',
      message: (e as Error).message,
      details: (e as any).details || (e as any).hint,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime())
    });
  }
});

export default router;
