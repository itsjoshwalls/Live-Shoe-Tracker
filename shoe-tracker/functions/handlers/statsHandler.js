// handlers/statsHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import dayjs from "dayjs";

/**
 * Updates Firestore stats when a release is added or updated.
 * Creates or merges into stats/daily/YYYY-MM-DD documents.
 */
export async function updateDailyStats(db, eventType, release) {
  try {
    const now = admin.firestore.Timestamp.now();
    const dateKey = now.toDate().toISOString().slice(0, 10); // e.g., "2025-11-04"
    const statsRef = db.collection("stats").doc("daily").collection("days").doc(dateKey);

    const increment = admin.firestore.FieldValue.increment(1);

    // Prepare counters
    const updates = {
      lastUpdated: now,
    };

    if (eventType === "created") {
      updates.newReleases = increment;
      updates[`retailers.${release.retailerId}.new`] = increment;
    } else if (eventType === "updated") {
      updates.updatedReleases = increment;
      updates[`retailers.${release.retailerId}.updated`] = increment;
    }

    // Add average price tracking
    if (release.price) {
      updates[`retailers.${release.retailerId}.priceSum`] =
        admin.firestore.FieldValue.increment(release.price);
      updates[`retailers.${release.retailerId}.priceCount`] = increment;
    }

    await statsRef.set(updates, { merge: true });

    functions.logger.info(`📊 Stats updated for ${eventType} | ${release.retailerId}`);
  } catch (err) {
    functions.logger.error("❌ updateDailyStats failed", err);
  }
}

/**
 * Updates release stats for real-time UI
 */
export async function updateReleaseStats(db, snapshotDoc) {
  const data = snapshotDoc.data();
  const { releaseId, timestamp, sizeStock, available } = data;

  const statsRef = db.collection("releaseStats").doc(releaseId);
  const statsSnap = await statsRef.get();
  let stats = statsSnap.exists ? statsSnap.data() : {};

  // Compute new stats values
  const totalSizes = sizeStock
    ? Object.values(sizeStock).reduce((sum, v) => sum + (v || 0), 0)
    : null;

  const newStats = {
    lastSnapshotAt: timestamp,
    isLive: available,
    totalAvailable: totalSizes,
    updatedAt: dayjs().toISOString()
  };

  await statsRef.set(newStats, { merge: true });
}

/**
 * Aggregates and finalizes daily stats at midnight UTC.
 * Calculates averages and summary totals for the day.
 */
export const finalizeDailyStats = functions.pubsub
  .schedule("0 0 * * *") // every midnight UTC
  .onRun(async (context) => {
    const db = admin.firestore();
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateKey = yesterday.toISOString().slice(0, 10);

    const statsDoc = db.collection("stats").doc("daily").collection("days").doc(dateKey);
    const snapshot = await statsDoc.get();

    if (!snapshot.exists) {
      functions.logger.info(`No stats found for ${dateKey}`);
      return;
    }

    const data = snapshot.data();

    const summary = {};
    if (data.retailers) {
      Object.keys(data.retailers).forEach((retailerId) => {
        const r = data.retailers[retailerId];
        if (r.priceCount > 0) {
          summary[retailerId] = {
            new: r.new || 0,
            updated: r.updated || 0,
            avgPrice: +(r.priceSum / r.priceCount).toFixed(2),
          };
        }
      });
    }

    await statsDoc.set(
      {
        summary,
        finalizedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );

    functions.logger.info(`✅ Finalized stats for ${dateKey}`);
  });
