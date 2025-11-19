// handlers/alertsHandler.js
import fetch from "node-fetch";
import * as functions from "firebase-functions";
import admin from "firebase-admin";

/**
 * Send alert to Discord and Slack
 */
export async function sendAlert(db, release, status) {
  const DISCORD_WEBHOOK = functions.config().alerts?.discord_webhook;
  const SLACK_WEBHOOK = functions.config().alerts?.slack_webhook;

  const message = `🔥 **${release.productName}** is now **${status.toUpperCase()}** at ${release.retailerName}!`;
  const payload = { content: message };

  try {
    if (DISCORD_WEBHOOK) {
      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
    }
    if (SLACK_WEBHOOK) {
      await fetch(SLACK_WEBHOOK, {
        method: "POST",
        body: JSON.stringify({ text: message }),
        headers: { "Content-Type": "application/json" },
      });
    }

    await db.collection("logs").add({
      type: "alert",
      status,
      releaseId: release.id,
      timestamp: admin.firestore.Timestamp.now(),
    });

    functions.logger.info(`✅ Alert sent: ${message}`);
  } catch (err) {
    functions.logger.error("❌ Failed to send alert:", err);
  }
}

/**
 * Trigger: on release status change
 */
export const onReleaseStatusChange = functions.firestore
  .document("releases/{releaseId}")
  .onUpdate(async (change, context) => {
    const db = admin.firestore();
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== after.status && ["LIVE", "RAFFLE OPEN", "RESTOCK"].includes(after.status)) {
      await sendAlert(db, after, after.status);
    }
  });
