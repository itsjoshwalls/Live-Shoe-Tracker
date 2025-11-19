// handlers/userAlertsHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { sendAlert } from "./alertsHandler.js";

/**
 * Add or update a user's alert preference
 */
export async function subscribeUserAlert(db, uid, alertData) {
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
 * Get all active user alerts
 */
export async function getAllUserAlerts(db) {
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
 * Trigger when release becomes LIVE or RAFFLE OPEN
 * Send alerts only to users who subscribed.
 */
export const onReleaseTriggerUserAlerts = functions.firestore
  .document("releases/{releaseId}")
  .onUpdate(async (change, context) => {
    const db = admin.firestore();
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) return;

    const alertStatuses = ["LIVE", "RAFFLE OPEN", "RESTOCK"];
    if (!alertStatuses.includes(after.status)) return;

    const snapshot = await db.collectionGroup("alerts").where("productId", "==", after.productId).get();
    if (snapshot.empty) return;

    functions.logger.info(`🔔 Triggering user alerts for ${after.productName}`);

    const promises = snapshot.docs.map(async (doc) => {
      const alertData = doc.data();
      if (alertData.notifyEmail) {
        await sendUserEmail(alertData.email, after);
      }
      if (alertData.notifyPush) {
        await sendAlert(db, after, after.status);
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
