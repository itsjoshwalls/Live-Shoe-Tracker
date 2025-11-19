import admin from 'firebase-admin';

let firestore = null;
function ensureFirestore() {
  if (firestore) return firestore;
  try {
    const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!svcJson) return null;
    const creds = JSON.parse(svcJson);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(creds),
      });
    }
    firestore = admin.firestore();
    return firestore;
  } catch (e) {
    console.error('Failed to initialize firebase-admin:', e?.message || e);
    return null;
  }
}

const increment = (n = 1) => admin.firestore.FieldValue.increment(n);

export async function updateDailyStats(eventType, release) {
  const db = ensureFirestore();
  if (!db) return false; // no-op if not configured
  try {
    const now = admin.firestore.Timestamp.now();
    const dateKey = new Date().toISOString().slice(0, 10);
    const statsRef = db.collection('stats').doc('daily').collection('days').doc(dateKey);

    const retailerId = release.retailerId || release.retailer || 'unknown';
    const updates = { lastUpdated: now };

    if (eventType === 'created') {
      updates.newReleases = increment(1);
      updates[`retailers.${retailerId}.new`] = increment(1);
    } else if (eventType === 'updated') {
      updates.updatedReleases = increment(1);
      updates[`retailers.${retailerId}.updated`] = increment(1);
    }

    if (release.price) {
      updates[`retailers.${retailerId}.priceSum`] = increment(Number(release.price) || 0);
      updates[`retailers.${retailerId}.priceCount`] = increment(1);
    }

    await statsRef.set(updates, { merge: true });
    return true;
  } catch (err) {
    console.error('updateDailyStats failed', err?.message || err);
    return false;
  }
}

// Simplified finalize: compute average per retailer for yesterday; callable manually.
export async function finalizeDailyStats(dateKey) {
  const db = ensureFirestore();
  if (!db) return false;
  try {
    if (!dateKey) {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      dateKey = yesterday.toISOString().slice(0, 10);
    }
    const statsDoc = db.collection('stats').doc('daily').collection('days').doc(dateKey);
    const snapshot = await statsDoc.get();
    if (!snapshot.exists) return true;

    const data = snapshot.data() || {};
    const summary = {};
    const retailers = data.retailers || {};
    for (const retailerId of Object.keys(retailers)) {
      const r = retailers[retailerId] || {};
      const count = r.priceCount || 0;
      if (count > 0) {
        summary[retailerId] = {
          new: r.new || 0,
          updated: r.updated || 0,
          avgPrice: +(Number(r.priceSum || 0) / count).toFixed(2),
        };
      }
    }
    await statsDoc.set({ summary, finalizedAt: admin.firestore.Timestamp.now() }, { merge: true });
    return true;
  } catch (e) {
    console.error('finalizeDailyStats failed', e?.message || e);
    return false;
  }
}

export const updateStats = async (storeKey, releases) => {
  // For now treat all as "created" events; later we can diff to emit updates
  const db = ensureFirestore();
  if (!db) return true; // no-op if not configured
  for (const r of releases) {
    await updateDailyStats('created', { ...r, retailerId: r.retailer || storeKey });
  }
  return true;
};