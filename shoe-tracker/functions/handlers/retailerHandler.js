// handlers/retailerHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";

/**
 * Ensures retailer metadata exists and stays updated.
 * Creates or merges data when a new retailer appears in a release.
 */
export async function ensureRetailerMetadata(db, release) {
  try {
    const { retailerId, retailerName, region, apiUrl, rafflePattern } = release;
    if (!retailerId) return;

    const retailerRef = db.collection("retailers").doc(retailerId);
    const snap = await retailerRef.get();

    const now = admin.firestore.Timestamp.now();

    if (!snap.exists) {
      const newRetailer = {
        retailerId,
        retailerName: retailerName || retailerId,
        region: region || "global",
        logoUrl: `https://logo.clearbit.com/${retailerId}.com`,
        apiUrl: apiUrl || null,
        rafflePattern: rafflePattern || null,
        createdAt: now,
        updatedAt: now,
      };

      await retailerRef.set(newRetailer);
      functions.logger.info(`🆕 Added new retailer metadata: ${retailerId}`);
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
        functions.logger.info(`♻️ Updated retailer metadata: ${retailerId}`);
      }
    }
  } catch (err) {
    functions.logger.error("❌ ensureRetailerMetadata failed", err);
  }
}

/**
 * Returns all retailer metadata, useful for scrapers or dashboards.
 */
export async function getAllRetailers(db) {
  const snap = await db.collection("retailers").get();
  return snap.docs.map((doc) => doc.data());
}
