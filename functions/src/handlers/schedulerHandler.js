import { db } from "../utils/firestore.js";
import { logInfo } from "../utils/logger.js";

export const scheduledScrape = async (context) => {
  logInfo("Running scheduled scraper...");

  const retailersSnap = await db.collection("retailers")
    .where("active", "==", true)
    .get();

  for (const doc of retailersSnap.docs) {
    const retailer = doc.data();

    // Queue scraper job
    await db.collection("queues").add({
      target: doc.id,
      retailer_name: retailer.name,
      api_url: retailer.api_url,
      status: "pending",
      created_at: new Date(),
    });

    logInfo(`Queued scraper for ${retailer.name}`);
  }

  logInfo(`Scheduled scrape complete. Queued ${retailersSnap.size} jobs.`);
};
