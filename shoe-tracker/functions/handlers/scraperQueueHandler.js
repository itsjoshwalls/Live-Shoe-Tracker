// handlers/scraperQueueHandler.js
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import fetch from "node-fetch";

/**
 * Add new scraping job to queue.
 */
export async function enqueueScraperJob(db, target, params = {}) {
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
export async function claimNextJob(db, workerId) {
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
export async function completeJob(db, jobId, success = true, details = null) {
  const jobRef = db.collection("queues").doc(jobId);
  await jobRef.update({
    status: success ? "done" : "failed",
    finishedAt: admin.firestore.Timestamp.now(),
    details,
  });
}

export const onQueueJobCreated = functions.firestore
  .document("queues/{jobId}")
  .onCreate(async (snap, context) => {
    const db = admin.firestore();
    const job = snap.data();

    functions.logger.info(`🕷️ New scraper job created: ${job.target}`);
    const startTime = Date.now();

    try {
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

      functions.logger.info(`✅ Job ${context.params.jobId} completed`);
    } catch (err) {
      await snap.ref.update({
        status: "failed",
        error: err.message,
      });
      functions.logger.error(`❌ Job ${context.params.jobId} failed`, err);
    }
  });
