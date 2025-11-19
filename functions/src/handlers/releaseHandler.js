import { db } from "../utils/firestore.js";
import { logInfo } from "../utils/logger.js";

export const handleReleaseUpdate = async (change, context) => {
  const releaseId = context.params.releaseId;
  const after = change.after.exists ? change.after.data() : null;

  if (!after) return logInfo(`Release ${releaseId} deleted`);

  // Auto-update timestamps
  await db.collection("releases").doc(releaseId).update({
    updated_at: new Date(),
  });

  logInfo(`Release updated: ${releaseId}`);
};
