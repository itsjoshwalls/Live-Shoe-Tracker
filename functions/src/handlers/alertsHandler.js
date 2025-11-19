import { db } from "../utils/firestore.js";
import { logInfo } from "../utils/logger.js";
import { sendDiscordAlert, sendSlackAlert } from "../utils/notifications.js";

export const sendAlerts = async (context) => {
  const alertsSnap = await db.collection("alerts")
    .where("sent", "==", false)
    .limit(10)
    .get();

  if (alertsSnap.empty) {
    logInfo("No pending alerts to send");
    return;
  }

  for (const doc of alertsSnap.docs) {
    const alert = doc.data();
    const message = `🔥 ${alert.type.toUpperCase()}: Release ${alert.release_id} at ${alert.retailer_id}`;

    await sendDiscordAlert(message);
    await sendSlackAlert(message);

    await doc.ref.update({ sent: true, sent_at: new Date() });
    logInfo(`Alert sent: ${doc.id}`);
  }
};
