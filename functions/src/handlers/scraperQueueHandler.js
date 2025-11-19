import { db } from "../utils/firestore.js";
import { logInfo, logError } from "../utils/logger.js";

export const processQueueJob = async (snap, context) => {
  const job = snap.data();
  const jobId = context.params.jobId;

  logInfo(`Processing queue job: ${jobId}`);

  try {
    // Mark as in-progress
    await snap.ref.update({
      status: "in_progress",
      started_at: new Date(),
    });

    // Simulate scraper job processing
    // In production, this would call actual scraper logic
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mark as complete
    await snap.ref.update({
      status: "completed",
      completed_at: new Date(),
    });

    logInfo(`Queue job completed: ${jobId}`);
  } catch (err) {
    logError(`Queue job failed: ${jobId}`, err);
    await snap.ref.update({
      status: "failed",
      error: err.message,
      failed_at: new Date(),
    });
  }
};
