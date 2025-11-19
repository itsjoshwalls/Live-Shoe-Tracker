/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
// index.js - Firebase Cloud Functions
import * as functions from "firebase-functions";
import admin from "firebase-admin";

// Initialize Firebase
admin.initializeApp();

import { handleReleaseUpdate } from "./handlers/releaseHandler.js";
import { z } from "zod";
import { updateDailyStats, finalizeDailyStats } from "./handlers/statsHandler.js";
import { ensureRetailerMetadata } from "./handlers/retailerHandler.js";
import { recordStockSnapshot } from "./handlers/stockHandler.js";
import { enqueueScraperJob, claimNextJob, completeJob } from "./handlers/scraperQueueHandler.js";
import { subscribeUserAlert, unsubscribeUserAlert, getUserAlerts } from "./handlers/userAlertsHandler.js";
import { incrementMetric, metricsEndpoint } from "./handlers/metricsHandler.js";
import { publishEvent } from "./handlers/eventsPublisher.js";
import { insertRows, getBqConfig, getReleaseEventSchema, getQueueEventSchema } from "./handlers/bigqueryHandler.js";
/**
 * 🧠 onReleaseIngest
 * Triggered via HTTPS call or scraper workflow.
 * Adds or updates a sneaker release document and related metadata.
 */
export const onReleaseIngest = functions.https.onCall(async (data, context) => {
  try {
    // ✅ Zod schema validation for clear, consistent errors
    const StatusEnum = z.enum(["UPCOMING", "LIVE", "RAFFLE OPEN", "RESTOCK", "SOLD OUT"]);
    const ReleaseInputSchema = z
      .object({
        retailerId: z.string().min(1, "retailerId is required"),
        productName: z.string().min(1, "productName is required"),
        brand: z.string().min(1, "brand is required"),
        status: StatusEnum,
        sku: z.string().optional(),
        price: z.union([z.number(), z.string()]).optional(),
        stockData: z.any().optional(),
        productId: z.string().optional(),
        id: z.string().optional(),
        region: z.string().optional(),
        retailerName: z.string().optional(),
        isNew: z.boolean().optional(),
      })
      .refine((d) => {
        const b = (d.brand || "").toLowerCase();
        if (["nike", "jordan"].includes(b)) {
          return typeof d.sku === "string" && d.sku.length > 0;
        }
        return true;
      }, { path: ["sku"], message: "sku is required for Nike/Jordan releases" });

    const parsed = ReleaseInputSchema.safeParse(data || {});
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => `${i.path.join('.')||'(root)'}: ${i.message}`).join("; ");
      throw new functions.https.HttpsError("invalid-argument", msg);
    }
    const input = parsed.data;

    const db = admin.firestore();
    const release = {
      ...input,
      id: input.id || `${input.retailerId}-${input.productId || Date.now()}`,
    };
    // Ensure productId is always present; default to id when absent
    if (!release.productId) release.productId = release.id;

    // 1️⃣ Ensure retailer metadata
    await ensureRetailerMetadata(release);

    // 2️⃣ Insert/update release data
    await handleReleaseUpdate(db, release);

    // 3️⃣ Update stats
  const eventType = input.isNew ? "created" : "updated";
    await updateDailyStats(eventType, release);

    // 4️⃣ Record stock snapshot (if provided)
    if (input.stockData) {
      await recordStockSnapshot(release.id, input.stockData);
    }

    // 5️⃣ Increment metrics
    await incrementMetric("total_releases");

    return { success: true, message: "Release processed successfully", releaseId: release.id };
  } catch (err) {
    functions.logger.error("❌ onReleaseIngest failed", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

/**
 * 🕒 scheduledFinalizeDailyStats
 * Scheduled daily job to aggregate stats at midnight UTC.
 */
export const scheduledFinalizeDailyStats = functions.pubsub
  .schedule("10 0 * * *")  // 12:10 AM UTC daily
  .timeZone("UTC")
  .onRun(async (context) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    await finalizeDailyStats(dateStr);
    functions.logger.info(`✅ Finalized stats for ${dateStr}`);
  });

/**
 * 🔥 Firestore Trigger: auto-update stats when new release added
 */
export const onReleaseCreated = functions.firestore
  .document("releases/{releaseId}")
  .onCreate(async (snap, context) => {
    const db = admin.firestore();
    const release = snap.data();
    const releaseId = context.params.releaseId;

    // Backfill productId if missing
    if (!release.productId) {
      await snap.ref.set({ productId: releaseId }, { merge: true });
      release.productId = releaseId;
    }

    await updateDailyStats("created", release);
  });

/**
 * 🔥 Firestore Trigger: auto-update stats when release updated
 */
export const onReleaseUpdated = functions.firestore
  .document("releases/{releaseId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Backfill productId if missing on updates as well
    if (!after.productId) {
      const releaseId = context.params.releaseId;
      await change.after.ref.set({ productId: releaseId }, { merge: true });
      after.productId = releaseId;
    }

    // Only count real changes (e.g. status, price)
    if (before.status !== after.status || before.price !== after.price) {
      await updateDailyStats("updated", after);
      // Publish a status change event when status actually changes
      if (before.status !== after.status) {
        await publishEvent("release_status_change", {
          releaseId: context.params.releaseId,
          productId: after.productId,
          retailerId: after.retailerId,
          statusBefore: before.status,
          statusAfter: after.status,
          price: after.price ?? null,
        });
      }
    }
  });

/**
 * 🧩 Firestore Trigger: update retailer info if region/apiURL changes
 */
export const onRetailerChange = functions.firestore
  .document("retailers/{retailerId}")
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (data) {
      functions.logger.info(`Retailer metadata changed: ${context.params.retailerId}`);
    }
  });

/**
 * ✅ Simple health check endpoint for monitoring uptime
 */
export const health = functions.https.onRequest((req, res) => {
  res.status(200).send("Sneaker Tracker backend operational ✅");
});

/**
 * 📊 Metrics endpoint - Prometheus-style metrics export
 */
export { metricsEndpoint } from "./handlers/metricsHandler.js";

/**
 * 🔔 User Alert Management - Subscribe to release alerts
 */
export const subscribeAlert = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  await subscribeUserAlert(context.auth.uid, data.alertData);
  return { success: true };
});

export const unsubscribeAlert = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  await unsubscribeUserAlert(context.auth.uid, data.alertKey);
  return { success: true };
});

export const getMyAlerts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  const alerts = await getUserAlerts(context.auth.uid);
  return { alerts };
});

// Re-export alert trigger from handler (consumes functions.config() + env)
export { onReleaseStatusChange } from "./handlers/alertsHandler.js";

/**
 * 🧩 Scraper Queue Management
 */
export const addScraperJob = functions.https.onCall(async (data, context) => {
  // Optional: Require admin authentication
  // if (!context.auth?.token?.admin) {
  //   throw new functions.https.HttpsError("permission-denied", "Admin only");
  // }
  
  const jobId = await enqueueScraperJob(data.target, data.params);
  return { jobId };
});

export const getNextJob = functions.https.onCall(async (data, context) => {
  const job = await claimNextJob(data.workerId);
  return { job };
});

export const markJobComplete = functions.https.onCall(async (data, context) => {
  await completeJob(data.jobId, data.success, data.details);
  return { success: true };
});

// Firestore-driven queue job execution
export { onQueueJobCreated } from "./handlers/scraperQueueHandler.js";

// Trigger user alerts on release status change
export { onReleaseTriggerUserAlerts } from "./handlers/userAlertsHandler.js";

// JSON metrics endpoint
export { metrics } from "./handlers/metricsHandler.js";

/**
 * 📥 Pub/Sub sink: consume analytics events and write to BigQuery
 */
export const onAnalyticsEvent = functions.pubsub
  .topic(process.env.PUBSUB_TOPIC || "sneaker-analytics-events")
  .onPublish(async (message) => {
    try {
      const payload = message.json || {};
      const { type, payload: data, ts } = payload;
      const { dataset, tableRelease, tableQueue } = getBqConfig();

      if (type === "release_status_change") {
        const row = {
          ts: ts || new Date().toISOString(),
          releaseId: data?.releaseId || null,
          productId: data?.productId || null,
          retailerId: data?.retailerId || null,
          statusBefore: data?.statusBefore || null,
          statusAfter: data?.statusAfter || null,
          price: data?.price ?? null,
        };
        await insertRows(dataset, tableRelease, row, getReleaseEventSchema());
      } else if (type === "queue_job") {
        const row = {
          ts: ts || new Date().toISOString(),
          jobId: data?.jobId || null,
          target: data?.target || null,
          status: data?.status || null,
          durationMs: data?.durationMs ?? null,
          error: data?.error || null,
        };
        await insertRows(dataset, tableQueue, row, getQueueEventSchema());
      } else {
        functions.logger.warn("Unknown analytics event type", { type });
      }
    } catch (err) {
      functions.logger.error("onAnalyticsEvent failed", err);
      throw err;
    }
  });
