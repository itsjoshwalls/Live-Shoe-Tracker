/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import 'dotenv/config';
import * as functions from "firebase-functions";
import { handleReleaseUpdate } from "./handlers/releaseHandler.js";
import { handleRetailerUpdate } from "./handlers/retailerHandler.js";
import { handleStockChange } from "./handlers/stockHandler.js";
import { processQueueJob } from "./handlers/scraperQueueHandler.js";
import { sendAlerts } from "./handlers/alertsHandler.js";
import { scheduledScrape } from "./handlers/schedulerHandler.js";
import { collectMetrics } from "./handlers/metricsHandler.js";
import { 
  runHighFrequencyScraper, 
  runMediumFrequencyScraper, 
  runLowFrequencyScraper,
  runMasterScraper 
} from "./scrapers/masterOrchestrator.js";

// Firestore Triggers
export const onReleaseWrite = functions.firestore
  .document("releases/{releaseId}")
  .onWrite(handleReleaseUpdate);

export const onRetailerWrite = functions.firestore
  .document("retailers/{retailerId}")
  .onWrite(handleRetailerUpdate);

export const onStockWrite = functions.firestore
  .document("releases/{releaseId}/stock_snapshots/{snapshotId}")
  .onWrite(handleStockChange);

export const onQueueJob = functions.firestore
  .document("queues/{jobId}")
  .onCreate(processQueueJob);

// Scheduled Functions - System
export const sendAlertNotifications = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(sendAlerts);

export const runScheduledScraper = functions.pubsub
  .schedule("every 30 minutes")
  .onRun(scheduledScrape);

export const collectSystemMetrics = functions.pubsub
  .schedule("every 1 hours")
  .onRun(collectMetrics);

// Scheduled Functions - Premium Scrapers
export const highFrequencyScraper = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 30 minutes")
  .onRun(async (context) => {
    console.log("🔥 High-frequency scraper starting...");
    await runHighFrequencyScraper();
    console.log("✅ High-frequency scraper complete");
  });

export const mediumFrequencyScraper = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 2 hours")
  .onRun(async (context) => {
    console.log("⚡ Medium-frequency scraper starting...");
    await runMediumFrequencyScraper();
    console.log("✅ Medium-frequency scraper complete");
  });

export const lowFrequencyScraper = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 6 hours")
  .onRun(async (context) => {
    console.log("🌙 Low-frequency scraper starting...");
    await runLowFrequencyScraper();
    console.log("✅ Low-frequency scraper complete");
  });

// HTTP Endpoint - Manual Trigger
export const triggerMasterScraper = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onRequest(async (req, res) => {
    try {
      console.log("🚀 Master scraper triggered manually");
      const results = await runMasterScraper({
        includeRetailers: true,
        includeAggregators: true,
        includeResale: true,
        includeSocial: true,
      });
      res.json({ success: true, results });
    } catch (error) {
      console.error("❌ Master scraper error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
