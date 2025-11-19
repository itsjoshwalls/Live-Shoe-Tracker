// handlers/metricsHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";

/**
 * Increment a named metric counter
 */
export async function incrementMetric(db, name, value = 1) {
  const ref = db.collection("metrics").doc(name);
  await ref.set(
    {
      count: admin.firestore.FieldValue.increment(value),
      lastUpdated: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );
}

/**
 * Aggregates key app metrics.
 */
export const metrics = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();
  try {
    const releasesSnap = await db.collection("releases").count().get();
    const retailersSnap = await db.collection("retailers").count().get();
    const usersSnap = await db.collection("users").count().get();

    const stats = {
      total_releases: releasesSnap.data().count,
      total_retailers: retailersSnap.data().count,
      total_users: usersSnap.data().count,
      timestamp: new Date().toISOString(),
    };

    res.set("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(stats, null, 2));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});
