import admin from "firebase-admin";
import fs from "fs";

// Initialize Admin SDK from FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_PATH, or ADC
if (admin.apps.length === 0) {
  let svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  const svcPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!svc && svcPath && fs.existsSync(svcPath)) {
    svc = fs.readFileSync(svcPath, "utf-8");
  }
  if (svc) {
    const json = typeof svc === "string" ? JSON.parse(svc) : svc;
    admin.initializeApp({ credential: admin.credential.cert(json) });
  } else {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
}

const db = admin.firestore();

async function main() {
  const [, , releaseId, newStatus = "LIVE"] = process.argv;
  if (!releaseId) {
    console.error("Usage: node scripts/setReleaseStatus.js <releaseId> [status]");
    process.exit(1);
  }
  const ref = db.collection("releases").doc(releaseId);
  await ref.set(
    { status: newStatus, updatedAt: new Date() },
    { merge: true }
  );
  console.log(`✅ Updated release ${releaseId} to status ${newStatus}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to update status:", err);
  process.exit(1);
});
