// Firestore handler for writing scraper output to Firebase
// Supports batch writes with deduplication on (sku, retailer)
import admin from 'firebase-admin';

let db = null;

function initFirestore() {
  if (db) return db;
  
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not set - Firestore writes disabled');
    return null;
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    db = admin.firestore();
    console.log('🔥 Firestore initialized');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize Firestore:', error.message);
    return null;
  }
}

/**
 * Remove undefined values from an object recursively
 * @param {Object} obj - Object to clean
 * @returns {Object} - Cleaned object
 */
function removeUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined).filter(v => v !== undefined);
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = typeof value === 'object' ? removeUndefined(value) : value;
    }
  }
  return cleaned;
}

/**
 * Batch upsert releases to Firestore
 * @param {Array} releases - Array of release objects
 * @param {string} collectionName - Firestore collection name (default: 'releases')
 * @returns {Promise<{inserted: number, errors: number}>}
 */
export async function batchUpsertToFirestore(releases, collectionName = 'releases') {
  const firestore = initFirestore();
  if (!firestore) {
    return { inserted: 0, errors: 0, skipped: releases.length };
  }
  
  console.log(`🔥 Upserting ${releases.length} releases to Firestore collection: ${collectionName}`);
  
  const batchSize = 500; // Firestore max batch size
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < releases.length; i += batchSize) {
    const batch = firestore.batch();
    const chunk = releases.slice(i, i + batchSize);
    
    for (const release of chunk) {
      try {
        // Create unique ID based on SKU + retailer
        const docId = `${release.retailer}::${release.sku}`.replace(/[\/\s]/g, '_');
        const docRef = firestore.collection(collectionName).doc(docId);
        
        // Add timestamps and remove undefined values
        const data = removeUndefined({
          ...release,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        batch.set(docRef, data, { merge: true }); // merge = upsert
        inserted++;
      } catch (error) {
        console.error(`❌ Error preparing document for ${release.name}:`, error.message);
        errors++;
      }
    }
    
    try {
      await batch.commit();
      console.log(`  ✅ Batch ${Math.floor(i / batchSize) + 1} committed (${chunk.length} docs)`);
    } catch (error) {
      console.error(`❌ Batch commit failed:`, error.message);
      errors += chunk.length;
      inserted -= chunk.length;
    }
  }
  
  return { inserted, errors };
}

/**
 * Write single release to Firestore
 * @param {Object} release - Release object
 * @param {string} collectionName - Firestore collection name
 * @returns {Promise<boolean>} - Success status
 */
export async function writeReleaseToFirestore(release, collectionName = 'releases') {
  const firestore = initFirestore();
  if (!firestore) return false;
  
  try {
    const docId = `${release.retailer}::${release.sku}`.replace(/[\/\s]/g, '_');
    const docRef = firestore.collection(collectionName).doc(docId);
    
    await docRef.set({
      ...release,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to write ${release.name} to Firestore:`, error.message);
    return false;
  }
}

/**
 * Query releases from Firestore
 * @param {string} collectionName - Collection name
 * @param {number} limit - Max results (default: 100)
 * @returns {Promise<Array>}
 */
export async function queryFirestoreReleases(collectionName = 'releases', limit = 100) {
  const firestore = initFirestore();
  if (!firestore) return [];
  
  try {
    const snapshot = await firestore.collection(collectionName)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();
    
    const releases = [];
    snapshot.forEach(doc => {
      releases.push({ id: doc.id, ...doc.data() });
    });
    
    return releases;
  } catch (error) {
    console.error('❌ Firestore query failed:', error.message);
    return [];
  }
}

export default {
  initFirestore,
  batchUpsertToFirestore,
  writeReleaseToFirestore,
  queryFirestoreReleases
};
