/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
// handlers/stockHandler.js
import admin from 'firebase-admin';

let db = null;

// Initialize Firestore if credentials are available
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    db = admin.firestore();
  }
} catch (err) {
  console.warn('⚠️ Firestore not initialized for stockHandler:', err.message);
}

/**
 * Records stock changes as snapshots under releases/{id}/stock_snapshots/
 * Avoids duplication by checking if last snapshot matches new data.
 */
export async function recordStockSnapshot(releaseId, stockData) {
  if (!db) {
    console.warn('⚠️ Firestore not available, skipping recordStockSnapshot');
    return;
  }

  try {
    if (!releaseId || !stockData) return;

    const now = admin.firestore.Timestamp.now();
    const snapshotsRef = db
      .collection('releases')
      .doc(releaseId)
      .collection('stock_snapshots');

    // fetch latest snapshot
    const latest = await snapshotsRef
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    let lastData = null;
    if (!latest.empty) {
      lastData = latest.docs[0].data().stock;
    }

    // compare JSON
    if (JSON.stringify(lastData) === JSON.stringify(stockData)) {
      console.info(`No stock change for ${releaseId}`);
      return;
    }

    await snapshotsRef.add({
      stock: stockData,
      timestamp: now,
    });

    // optional: update live stock summary on parent doc
    const releaseRef = db.collection('releases').doc(releaseId);
    await releaseRef.update({
      liveStock: stockData,
      stockUpdatedAt: now,
    });

    console.info(`📦 New stock snapshot recorded for ${releaseId}`);
  } catch (err) {
    console.error('❌ recordStockSnapshot failed', err);
  }
}

/**
 * Utility to calculate current availability across sizes/SKUs.
 */
export function summarizeStock(stockData) {
  if (!stockData || typeof stockData !== 'object') return { total: 0, available: 0 };

  let total = 0;
  let available = 0;
  for (const sku in stockData) {
    total += stockData[sku].total || 0;
    available += stockData[sku].available || 0;
  }
  return { total, available };
}

/**
 * Firestore structure:
 * 
 * releases/
 *   nike-123456/
 *     liveStock:
 *       "US_9": { total: 50, available: 20 }
 *       "US_10": { total: 60, available: 0 }
 *     stockUpdatedAt: <timestamp>
 *     stock_snapshots/
 *       2025-11-04T18:00:00Z:
 *         stock: {...}
 *         timestamp: <timestamp>
 */
