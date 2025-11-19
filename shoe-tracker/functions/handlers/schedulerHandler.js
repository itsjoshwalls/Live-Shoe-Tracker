// handlers/schedulerHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { enqueueScraperJob } from "./scraperQueueHandler.js";

/**
 * Scheduled Cloud Function
 * Runs every day at 02:00 UTC (can be adjusted)
 */
export const scheduleScraperJobs = functions.pubsub
  .schedule("0 2 * * *") // 02:00 UTC daily
  .timeZone("UTC")
  .onRun(async (context) => {
    const db = admin.firestore();
    try {
      console.log("🕒 Scheduler triggered: queuing scraping jobs...");

      // Fetch all active retailers
      const retailerSnap = await db.collection("retailers").get();
      if (retailerSnap.empty) {
        console.log("⚠️ No retailers found to queue.");
        return;
      }

      const promises = [];
      retailerSnap.forEach((doc) => {
        const retailer = doc.data();
        const job = {
          target: retailer.id,
          targetUrl: retailer.apiURL || retailer.rafflePattern,
          createdAt: admin.firestore.Timestamp.now(),
        };
        promises.push(enqueueScraperJob(db, job.target, job));
      });

      await Promise.all(promises);

      console.log(`✅ Queued ${promises.length} scraper jobs.`);
    } catch (err) {
      console.error("❌ Scheduler failed:", err);
    }
  });
