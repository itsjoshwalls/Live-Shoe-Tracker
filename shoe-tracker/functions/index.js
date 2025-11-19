// index.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import config from "./config.js";
import { runScraperModule } from "./scrapers/core/baseScraper.js";
import { handleReleaseUpdate } from "./handlers/releaseHandler.js";
import { updateDailyStats, finalizeDailyStats, updateReleaseStats } from "./handlers/statsHandler.js";
import { ensureRetailerMetadata } from "./handlers/retailerHandler.js";
import { recordStockSnapshot } from "./handlers/stockHandler.js";
import { incrementMetric } from "./handlers/metricsHandler.js";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ===== HTTP Trigger to run scrapers manually =====
export const runScraper = functions
  .region(config.region)
  .https.onRequest(async (req, res) => {
    const retailer = req.query.retailer || "nike";
    functions.logger.info(`Running scraper for ${retailer}...`);
    try {
      const releases = await runScraperModule(retailer);
      for (const release of releases) {
        await ensureRetailerMetadata(db, release);
        await handleReleaseUpdate(db, release);
        await updateDailyStats(db, "created", release);
      }
      res.status(200).send({ message: "Scrape complete", count: releases.length });
    } catch (err) {
      functions.logger.error("Scrape failed", err);
      res.status(500).send({ error: err.message });
    }
  });

// ===== Scheduled Scraper (every 20 minutes) =====
export const runAllScrapers = functions
  .region(config.region)
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .pubsub.schedule(`every ${config.scrapeIntervalMinutes} minutes`)
  .onRun(async () => {
    const { scrapers, parallelScrapers } = config;
    functions.logger.info(`Launching ${scrapers.length} scrapers in batches...`);

    for (let i = 0; i < scrapers.length; i += parallelScrapers) {
      const batch = scrapers.slice(i, i + parallelScrapers);
      const results = await Promise.all(batch.map(runScraperModule));
      const releases = results.flat();

      functions.logger.info(`Batch ${i / parallelScrapers + 1}: ${releases.length} releases`);
      
      for (const release of releases) {
        await ensureRetailerMetadata(db, release);
        await handleReleaseUpdate(db, release);
        await updateDailyStats(db, "created", release);
        if (release.stockData) {
          await recordStockSnapshot(db, release.id, release.stockData);
        }
      }
    }

    await incrementMetric(db, "scraper_runs");
    return null;
  });

// ===== Firestore Trigger: when inventory snapshot changes =====
export const onInventorySnapshot = functions
  .region(config.region)
  .firestore.document("inventory_snapshots/{snapshotId}")
  .onWrite(async (change, context) => {
    const after = change.after.data();
    const before = change.before.exists ? change.before.data() : null;
    
    if (!before || JSON.stringify(before.sizeStock) !== JSON.stringify(after.sizeStock) || before.available !== after.available) {
      functions.logger.info(`Snapshot changed for release ${after.releaseId}`);
      await updateReleaseStats(db, change.after);
    }
    return null;
  });

// ===== Firestore Trigger: auto-update stats when new release added =====
export const onReleaseCreated = functions.firestore
  .document("releases/{releaseId}")
  .onCreate(async (snap, context) => {
    const release = snap.data();
    await updateDailyStats(db, "created", release);
  });

// ===== Firestore Trigger: auto-update stats when release updated =====
export const onReleaseUpdated = functions.firestore
  .document("releases/{releaseId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== after.status || before.price !== after.price) {
      await updateDailyStats(db, "updated", after);
    }
  });

// ===== HTTP Trigger for release ingestion =====
export const onReleaseIngest = functions.https.onCall(async (data, context) => {
  try {
    if (!data || !data.retailerId || !data.productName) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }

    const release = {
      ...data,
      id: data.id || `${data.retailerId}-${data.productId || Date.now()}`,
    };

    await ensureRetailerMetadata(db, release);
    await handleReleaseUpdate(db, release);
    const eventType = data.isNew ? "created" : "updated";
    await updateDailyStats(db, eventType, release);

    if (data.stockData) {
      await recordStockSnapshot(db, release.id, data.stockData);
    }

    return { success: true, message: "Release processed successfully" };
  } catch (err) {
    functions.logger.error("❌ onReleaseIngest failed", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// ===== Simple health check endpoint =====
export const health = functions.https.onRequest((req, res) => {
  res.status(200).send("Sneaker Tracker backend operational ✅");
});

// ===== Export all handlers =====
export { finalizeDailyStats } from "./handlers/statsHandler.js";
export { onReleaseStatusChange } from "./handlers/alertsHandler.js";
export { onQueueJobCreated } from "./handlers/scraperQueueHandler.js";
export { onReleaseTriggerUserAlerts } from "./handlers/userAlertsHandler.js";
export { metrics } from "./handlers/metricsHandler.js";
export { scheduleScraperJobs } from "./handlers/schedulerHandler.js";
