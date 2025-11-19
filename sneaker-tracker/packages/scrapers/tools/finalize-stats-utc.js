#!/usr/bin/env node
import { finalizeDailyStats } from '../handlers/statsHandler.js';

// Compute yesterday in UTC (today UTC-1 day)
const now = new Date();
const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
y.setUTCDate(y.getUTCDate() - 1);
const dateKey = y.toISOString().slice(0, 10);

(async () => {
  try {
    const ok = await finalizeDailyStats(dateKey);
    if (ok) {
      console.log(`Finalized stats for ${dateKey} (UTC yesterday)`);
      process.exit(0);
    } else {
      console.error('Finalize returned false (is FIREBASE_SERVICE_ACCOUNT set?)');
      process.exit(2);
    }
  } catch (e) {
    console.error('Finalize (UTC) failed:', e?.message || e);
    process.exit(1);
  }
})();
