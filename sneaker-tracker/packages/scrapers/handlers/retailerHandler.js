// handlers/retailerHandler.js
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
  console.warn('⚠️ Firestore not initialized for retailerHandler:', err.message);
}

/**
 * Ensures retailer metadata exists and stays updated.
 * Creates or merges data when a new retailer appears in a release.
 */
export async function ensureRetailerMetadata(release) {
  if (!db) {
    console.warn('⚠️ Firestore not available, skipping ensureRetailerMetadata');
    return;
  }

  try {
    const { retailerId, retailerName, region, apiUrl, rafflePattern } = release;
    if (!retailerId) return;

    const retailerRef = db.collection('retailers').doc(retailerId);
    const snap = await retailerRef.get();

    const now = admin.firestore.Timestamp.now();

    if (!snap.exists) {
      const newRetailer = {
        retailerId,
        retailerName: retailerName || retailerId,
        region: region || 'global',
        logoUrl: `https://logo.clearbit.com/${retailerId}.com`,
        apiUrl: apiUrl || null,
        rafflePattern: rafflePattern || null,
        createdAt: now,
        updatedAt: now,
      };

      await retailerRef.set(newRetailer);
      console.info(`🆕 Added new retailer metadata: ${retailerId}`);
    } else {
      // Update only changed fields
      const existing = snap.data();
      const updates = {};
      if (region && region !== existing.region) updates.region = region;
      if (apiUrl && apiUrl !== existing.apiUrl) updates.apiUrl = apiUrl;
      if (rafflePattern && rafflePattern !== existing.rafflePattern)
        updates.rafflePattern = rafflePattern;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = now;
        await retailerRef.update(updates);
        console.info(`♻️ Updated retailer metadata: ${retailerId}`);
      }
    }
  } catch (err) {
    console.error('❌ ensureRetailerMetadata failed', err);
  }
}

/**
 * Returns all retailer metadata, useful for scrapers or dashboards.
 */
export async function getAllRetailers() {
  if (!db) {
    console.warn('⚠️ Firestore not available, returning empty retailers list');
    return [];
  }

  const snap = await db.collection('retailers').get();
  return snap.docs.map((doc) => doc.data());
}

/**
 * Firestore structure:
 * 
 * retailers/
 *   nike/
 *     retailerName: "Nike"
 *     region: "US"
 *     logoUrl: "https://logo.clearbit.com/nike.com"
 *     apiUrl: "https://www.nike.com/launch"
 *     rafflePattern: "nike.com/launch"
 *     createdAt: <timestamp>
 *     updatedAt: <timestamp>
 */
