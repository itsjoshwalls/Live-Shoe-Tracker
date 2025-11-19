/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
// handlers/alertsHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";

// Support both env vars and functions:config()
const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL || functions.config().alerts?.discord_webhook;
const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL || functions.config().alerts?.slack_webhook;

export async function sendReleaseAlert(eventType, release) {
  const db = admin.firestore();
  const message = formatAlertMessage(eventType, release);

  // send to Discord
  if (DISCORD_WEBHOOK_URL) {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  }

  // send to Slack
  if (SLACK_WEBHOOK_URL) {
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  }

  await db.collection("logs").add({
    type: "alert",
    eventType,
    releaseId: release.id,
    timestamp: admin.firestore.Timestamp.now(),
  });

  functions.logger.info(`📢 Alert sent for ${release.productName}`);
}

function formatAlertMessage(eventType, release) {
  const emoji =
    eventType === "LIVE"
      ? "🔥"
      : eventType === "RAFFLE_OPEN"
      ? "🎟️"
      : "👟";
  return `${emoji} **${release.productName}** at ${release.retailerId.toUpperCase()} is now *${eventType}*!\n${release.url}`;
}

/**
 * Firestore structure:
 * 
 * logs/
 *   <auto-id>/
 *     type: "alert"
 *     eventType: "LIVE" | "RAFFLE_OPEN" | etc
 *     releaseId: "kith-555088701"
 *     timestamp: <timestamp>
 */

/**
 * Compatibility helper matching requested interface.
 * sendAlert(release, status)
 */
export async function sendAlert(release, status) {
  const message = `🔥 **${release.productName}** is now **${String(status).toUpperCase()}** at ${
    release.retailerName || release.retailerId
  }!`;

  try {
    if (DISCORD_WEBHOOK_URL) {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
    }
    if (SLACK_WEBHOOK_URL) {
      await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
    }

    functions.logger.info(`✅ Alert sent: ${message}`);
  } catch (err) {
    functions.logger.error("❌ Failed to send alert:", err);
  }
}

/**
 * Trigger: on release status change (LIVE/RAFFLE OPEN/RESTOCK)
 */
export const onReleaseStatusChange = functions.firestore
  .document("releases/{releaseId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    const alertStatuses = ["LIVE", "RAFFLE OPEN", "RESTOCK"]; 
    if (before.status !== after.status && alertStatuses.includes(after.status)) {
      // Use the compatibility wrapper to send alerts
      await sendAlert(after, after.status);
    }
  });
