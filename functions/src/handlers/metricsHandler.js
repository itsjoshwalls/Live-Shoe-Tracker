import { db } from "../utils/firestore.js";
import { logInfo } from "../utils/logger.js";

export const collectMetrics = async (context) => {
  const releasesCount = (await db.collection("releases").count().get()).data().count;
  const retailersCount = (await db.collection("retailers").count().get()).data().count;
  const usersCount = (await db.collection("users").count().get()).data().count;

  await db.collection("metrics").add({
    type: "system_stats",
    releases: releasesCount,
    retailers: retailersCount,
    users: usersCount,
    timestamp: new Date(),
  });

  logInfo(`Metrics collected: ${releasesCount} releases, ${retailersCount} retailers, ${usersCount} users`);
};
