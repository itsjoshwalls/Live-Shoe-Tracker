// handlers/userAlertsHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { sendAlert } from "./alertsHandler.js";

/**
 * Add or update a user's alert preference
 */
export async function subscribeUserAlert(uid, alertData) {
  const db = admin.firestore();
  const ref = db.collection("users").doc(uid).collection("alerts").doc(alertData.key);
  await ref.set(
    {
      ...alertData,
      active: true,
      updatedAt: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );
  functions.logger.info(`👤 User ${uid} subscribed to ${alertData.key}`);
}

/**
 * Unsubscribe user from alert
 */
export async function unsubscribeUserAlert(uid, alertKey) {
  const db = admin.firestore();
  const ref = db.collection("users").doc(uid).collection("alerts").doc(alertKey);
  await ref.update({
    active: false,
    updatedAt: admin.firestore.Timestamp.now(),
  });
  functions.logger.info(`👤 User ${uid} unsubscribed from ${alertKey}`);
}

/**
 * Get all active user alerts
 */
export async function getAllUserAlerts() {
  const db = admin.firestore();
  const usersSnap = await db.collection("users").get();
  const allAlerts = [];
  for (const user of usersSnap.docs) {
    const alertsSnap = await user.ref.collection("alerts").where("active", "==", true).get();
    alertsSnap.forEach((doc) =>
      allAlerts.push({ uid: user.id, ...doc.data() })
    );
  }
  return allAlerts;
}

/**
 * Get a specific user's active alerts
 */
export async function getUserAlerts(uid) {
  const db = admin.firestore();
  const alertsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("alerts")
    .where("active", "==", true)
    .get();
  
  return alertsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Firestore structure:
 * 
 * users/
 *   <uid>/
 *     alerts/
 *       aj4-bred/
 *         key: "aj4-bred"
 *         brand: "Jordan"
 *         keywords: ["bred", "jordan 4"]
 *         active: true
 *         createdAt: <timestamp>
 *         updatedAt: <timestamp>
 */

/**
 * Trigger when release status changes to trigger subscribed user alerts.
 */
export const onReleaseTriggerUserAlerts = functions.firestore
  .document("releases/{releaseId}")
  .onUpdate(async (change, context) => {
    const db = admin.firestore();
    const before = change.before.data();
    const after = change.after.data();

    // Only proceed if status actually changed
    if (before.status === after.status) return;

    const alertStatuses = ["LIVE", "RAFFLE OPEN", "RESTOCK"];
    if (!alertStatuses.includes(after.status)) return;

    // Some seed/demo releases may lack productId; fall back to document id
    const productId = after.productId || context.params.releaseId;
    if (!productId) {
      functions.logger.warn("⚠️ onReleaseTriggerUserAlerts: missing productId and releaseId");
      return;
    }

    const snapshot = await db
      .collectionGroup("alerts")
      .where("productId", "==", productId)
      .get();
    if (snapshot.empty) return;

    functions.logger.info(`🔔 Triggering user alerts for ${after.productName || productId}`);

    const promises = snapshot.docs.map(async (doc) => {
      const alertData = doc.data();
      if (alertData.notifyEmail && alertData.email) {
        await sendUserEmail(alertData.email, after);
      }
      if (alertData.notifyPush) {
        await sendAlert(after, after.status);
      }
    });

    await Promise.all(promises);
  });

/**
 * Optional: stub for sending email notifications
 */
async function sendUserEmail(email, release) {
  functions.logger.info(`📧 Sending email to ${email} for ${release.productName}`);
  // Integrate SendGrid, Resend, or Firebase Extensions (email trigger)
}
