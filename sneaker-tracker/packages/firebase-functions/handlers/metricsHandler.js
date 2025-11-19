// handlers/metricsHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";

/**
 * Increment a named metric counter
 */
export async function incrementMetric(name, value = 1) {
  const db = admin.firestore();
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
 * Decrement a named metric counter
 */
export async function decrementMetric(name, value = 1) {
  const db = admin.firestore();
  const ref = db.collection("metrics").doc(name);
  await ref.set(
    {
      count: admin.firestore.FieldValue.increment(-value),
      lastUpdated: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );
}

/**
 * Set a metric to a specific value
 */
export async function setMetric(name, value) {
  const db = admin.firestore();
  const ref = db.collection("metrics").doc(name);
  await ref.set({
    count: value,
    lastUpdated: admin.firestore.Timestamp.now(),
  });
}

/**
 * Get current metric value
 */
export async function getMetric(name) {
  const db = admin.firestore();
  const doc = await db.collection("metrics").doc(name).get();
  return doc.exists ? doc.data().count : 0;
}

/**
 * Simple HTTP endpoint to export metrics (Prometheus-style)
 */
export const metricsEndpoint = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();
  const snap = await db.collection("metrics").get();
  const lines = [];
  snap.forEach((doc) => {
    const data = doc.data();
    lines.push(`${doc.id}_count ${data.count || 0}`);
  });
  res.set("Content-Type", "text/plain");
  res.status(200).send(lines.join("\n"));
});

/**
 * JSON metrics endpoint summarizing key collections.
 */
export const metrics = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    // Using count() aggregation (requires Firestore count API)
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

/**
 * Firestore structure:
 * 
 * metrics/
 *   total_releases/
 *     count: 543
 *     lastUpdated: <timestamp>
 *   alerts_sent/
 *     count: 92
 *     lastUpdated: <timestamp>
 *   scrapers_run/
 *     count: 1250
 *     lastUpdated: <timestamp>
 */
