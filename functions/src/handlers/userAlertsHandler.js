import { db } from "../utils/firestore.js";
import { logInfo } from "../utils/logger.js";

export const processUserAlert = async (userId, alertData) => {
  await db.collection("users").doc(userId).collection("alerts").add({
    ...alertData,
    created_at: new Date(),
    active: true,
  });

  logInfo(`User alert created for ${userId}`);
};
