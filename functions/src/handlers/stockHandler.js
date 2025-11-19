import { db } from "../utils/firestore.js";
import { logInfo } from "../utils/logger.js";

export const handleStockChange = async (change, context) => {
  const snapshot = change.after.exists ? change.after.data() : null;
  if (!snapshot) return;

  // Example logic: detect stock change → send alert
  if (snapshot.status === "IN_STOCK") {
    await db.collection("alerts").add({
      type: "live_stock",
      release_id: snapshot.release_id,
      retailer_id: snapshot.retailer_id,
      created_at: new Date(),
    });
    logInfo(`Stock alert created for ${snapshot.release_id}`);
  }
};
