// Stock handler for Cloud Functions (self-contained version)
import admin from 'firebase-admin';

/**
 * Records stock changes as snapshots under releases/{id}/stock_snapshots/
 * Avoids duplication by checking if last snapshot matches new data.
 */
export async function recordStockSnapshot(releaseId, stockData) {
  try {
    const db = admin.firestore();
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
