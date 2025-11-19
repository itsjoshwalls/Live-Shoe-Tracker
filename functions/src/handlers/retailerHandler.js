import { db } from "../utils/firestore.js";
import { logInfo } from "../utils/logger.js";

export const handleRetailerUpdate = async (change, context) => {
  const retailerId = context.params.retailerId;
  const after = change.after.exists ? change.after.data() : null;

  if (!after) return logInfo(`Retailer ${retailerId} deleted`);

  // Auto-update timestamps
  await db.collection("retailers").doc(retailerId).update({
    updated_at: new Date(),
  });

  logInfo(`Retailer updated: ${retailerId}`);
};
