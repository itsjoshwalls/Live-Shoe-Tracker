/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
// handlers/releaseHandler.js - Firebase Cloud Functions version
import * as functions from "firebase-functions";
import admin from "firebase-admin";

/**
 * Handles inserting or updating a release document in Firestore.
 * Uses merge to avoid overwriting existing data unnecessarily.
 */
export async function handleReleaseUpdate(db, release) {
  try {
    const releaseRef = db.collection("releases").doc(release.id);
    const now = admin.firestore.Timestamp.now();

    const releaseData = {
      ...release,
      updatedAt: now,
    };

    // Check if document exists
    const snap = await releaseRef.get();
    if (!snap.exists) {
      releaseData.createdAt = now;
      await releaseRef.set(releaseData);
      functions.logger.info(`🆕 Created new release: ${release.id}`);
    } else {
      await releaseRef.update(releaseData);
      functions.logger.info(`♻️ Updated existing release: ${release.id}`);
    }

    return releaseData;
  } catch (err) {
    functions.logger.error("❌ handleReleaseUpdate failed", err);
    throw err;
  }
}
