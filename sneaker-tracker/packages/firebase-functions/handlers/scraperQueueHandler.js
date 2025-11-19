// handlers/scraperQueueHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { publishEvent } from "./eventsPublisher.js";

/**
 * Add new scraping job to queue.
 */
export async function enqueueScraperJob(target, params = {}) {
  const db = admin.firestore();
  const job = {
    target,
    params,
    status: "pending",
    createdAt: admin.firestore.Timestamp.now(),
  };
  const ref = await db.collection("queues").add(job);
  functions.logger.info(`🧩 Enqueued scraper job: ${target}`);
  return ref.id;
}

/**
 * Claim next pending job (for worker use)
 */
export async function claimNextJob(workerId) {
  const db = admin.firestore();
  const snap = await db
    .collection("queues")
    .where("status", "==", "pending")
    .orderBy("createdAt", "asc")
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  await doc.ref.update({
    status: "in_progress",
    claimedBy: workerId,
    startedAt: admin.firestore.Timestamp.now(),
  });

  return { id: doc.id, ...doc.data() };
}

/**
 * Mark job as completed or failed
 */
export async function completeJob(jobId, success = true, details = null) {
  const db = admin.firestore();
  const jobRef = db.collection("queues").doc(jobId);
  await jobRef.update({
    status: success ? "done" : "failed",
    finishedAt: admin.firestore.Timestamp.now(),
    details,
  });
}

/**
 * Firestore structure:
 * 
 * queues/
 *   <jobId>/
 *     target: "nike"
 *     status: "pending" | "in_progress" | "done" | "failed"
 *     params: { ... }
 *     createdAt: <timestamp>
 *     claimedBy: "worker-1"
 *     startedAt: <timestamp>
 *     finishedAt: <timestamp>
 *     details: { ... }
 */

/**
 * Firestore trigger to act on new queue jobs immediately.
 * Mirrors requested implementation: fetch targetUrl and store sample.
 */
export const onQueueJobCreated = functions.firestore
  .document("queues/{jobId}")
  .onCreate(async (snap, context) => {
    const db = admin.firestore();
    const job = snap.data();
    functions.logger.info(`🕷️ New scraper job created: ${job.target}`);
    const startTime = Date.now();

    try {
      if (!job?.targetUrl) {
        throw new Error("Missing job.targetUrl");
      }

      const res = await fetch(job.targetUrl);
      const html = await res.text();

      await db.collection("queue_results").doc(context.params.jobId).set({
        target: job.target,
        htmlSample: html.slice(0, 300),
        fetchedAt: new Date(),
      });

      await snap.ref.update({
        status: "completed",
        durationMs: Date.now() - startTime,
      });

      await publishEvent("queue_job", {
        jobId: context.params.jobId,
        target: job.target,
        status: "completed",
        durationMs: Date.now() - startTime,
      });

      functions.logger.info(`✅ Job ${context.params.jobId} completed`);
    } catch (err) {
      await snap.ref.update({
        status: "failed",
        error: err.message,
      });
      functions.logger.error(`❌ Job ${context.params.jobId} failed`, err);
      await publishEvent("queue_job", {
        jobId: context.params.jobId,
        target: job.target,
        status: "failed",
        error: err?.message || String(err),
      });
    }
  });
