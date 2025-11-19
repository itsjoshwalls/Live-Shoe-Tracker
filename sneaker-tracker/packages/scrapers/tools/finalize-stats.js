#!/usr/bin/env node
import { finalizeDailyStats } from '../handlers/statsHandler.js';

// parse args: date=YYYY-MM-DD (optional)
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...rest] = a.replace(/^--/, '').split('=');
  return [k, rest.join('=') || true];
}));

const dateKey = args.date && typeof args.date === 'string' ? args.date : undefined;

(async () => {
  try {
    const ok = await finalizeDailyStats(dateKey);
    if (ok) {
      console.log(`Finalized stats for ${dateKey || 'yesterday'}`);
      process.exit(0);
    } else {
      console.error('Finalize returned false (is FIREBASE_SERVICE_ACCOUNT set?)');
      process.exit(2);
    }
  } catch (e) {
    console.error('Finalize failed:', e?.message || e);
    process.exit(1);
  }
})();
