// handlers/releaseHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";

/**
 * Inserts or updates a sneaker release record in Firestore.
 * De-duplicates by retailer + productId.
 * Maintains change history and timestamps.
 */
export async function handleReleaseUpdate(dbInstance, release) {
  try {
    const {
      id,
      retailerId,
      productId,
      productName,
      releaseDate,
      price,
      currency,
      status,
      url,
      region,
      releaseType = "online",
    } = release;

    if (!id || !retailerId || !productName) {
      functions.logger.warn(`Skipping incomplete release`, release);
      return;
    }

    const docRef = dbInstance.collection("releases").doc(id);
    const snap = await docRef.get();

    const now = admin.firestore.Timestamp.now();

    if (!snap.exists) {
      // create new release
      const newDoc = {
        ...release,
        createdAt: now,
        updatedAt: now,
        history: [
          {
            event: "created",
            timestamp: now,
            price,
            status,
          },
        ],
      };

      await docRef.set(newDoc);
      functions.logger.info(`🆕 Added new release: ${retailerId} | ${productName}`);
      return;
    }

    const existing = snap.data();

    // detect differences
    const changes = {};
    if (price && price !== existing.price) changes.price = price;
    if (status && status !== existing.status) changes.status = status;
    if (releaseDate && releaseDate !== existing.releaseDate)
      changes.releaseDate = releaseDate;

    // update only if something changed
    if (Object.keys(changes).length > 0) {
      const updatedFields = {
        ...changes,
        updatedAt: now,
        history: admin.firestore.FieldValue.arrayUnion({
          event: "updated",
          timestamp: now,
          changes,
        }),
      };

      await docRef.update(updatedFields);
      functions.logger.info(
        `♻️ Updated release: ${retailerId} | ${productName} (${Object.keys(changes).join(", ")})`
      );
    }
  } catch (err) {
    functions.logger.error("❌ handleReleaseUpdate failed", err);
  }
}
